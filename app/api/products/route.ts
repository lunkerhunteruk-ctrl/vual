import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

// Japanese → English category slug mapping for search
const CATEGORY_SEARCH_MAP: Record<string, string> = {
  'トップス': 'tops', 'アウター': 'outer', 'パンツ': 'pants',
  'スカート': 'skirts', 'ワンピース': 'dresses', 'セットアップ': 'setup',
  'スーツ': 'suits', 'アンダーウェア': 'underwear', 'バッグ': 'bags',
  'シューズ': 'shoes', '財布': 'wallets', '腕時計': 'watches',
  'アイウェア': 'eyewear', 'ジュエリー': 'jewelry', 'アクセサリー': 'jewelry',
  '帽子': 'hats', 'ベルト': 'belts', 'ネクタイ': 'neckties',
  'メンズ': 'mens', 'レディース': 'womens', 'ウェア': 'wear',
};

// GET - List products or get single product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');
    const category = searchParams.get('category');
    const brandId = searchParams.get('brand_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      // Return mock data for development
      return NextResponse.json({
        products: [
          {
            id: 'mock-1',
            name: 'サンプル商品',
            category: 'apparel',
            base_price: 5000,
            status: 'draft',
          },
        ],
        mock: true,
      });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    if (productId) {
      // Get single product with images and variants
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          *,
          brands (name),
          product_images (*),
          product_variants (*)
        `)
        .eq('id', productId)
        .single();

      if (error || !product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json({ ...product, brand: (product as any).brands?.name || '' });
    }

    // List products
    const explicitStoreId = searchParams.get('store_id');
    const storeId = explicitStoreId || await resolveStoreIdFromRequest(request);

    let query = supabase
      .from('products')
      .select(`
        *,
        brands (name),
        product_images (id, url, is_primary, position)
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    // If status is 'all' or not provided in admin, show all products

    if (category) {
      query = query.eq('category', category);
    }

    if (brandId) {
      query = query.eq('brand_id', brandId);
    }

    const search = searchParams.get('search');
    if (search) {
      // Build OR conditions: name, description, name_en, category
      // Note: brand search is handled client-side (brand is in joined brands table)
      const conditions = [
        `name.ilike.%${search}%`,
        `description.ilike.%${search}%`,
        `name_en.ilike.%${search}%`,
        `category.ilike.%${search}%`,
      ];
      // Expand Japanese category/gender terms to English slugs
      for (const [ja, en] of Object.entries(CATEGORY_SEARCH_MAP)) {
        if (search.includes(ja)) {
          conditions.push(`category.ilike.%${en}%`);
        }
      }
      query = query.or(conditions.join(','));
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ error: 'Failed to get products' }, { status: 500 });
    }

    // Flatten brand name from joined brands table
    const flatProducts = (products || []).map((p: any) => ({
      ...p,
      brand: p.brands?.name || '',
    }));

    return NextResponse.json({ products: flatProducts });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Failed to get products' },
      { status: 500 }
    );
  }
}

// POST - Create product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      // Return mock response for development
      return NextResponse.json({
        id: 'mock-' + Date.now(),
        ...body,
        message: 'Product created (mock mode - Supabase not configured)',
        mock: true,
      });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { images, variants, ...productData } = body;

    // Insert product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        store_id: await resolveStoreIdFromRequest(request),
        name: productData.name,
        name_en: productData.nameEn,
        description: productData.description,
        description_en: productData.descriptionEn,
        category: productData.category || 'apparel',
        tags: productData.tags || [],
        base_price: productData.price || 0,
        discounted_price: productData.discountedPrice,
        currency: productData.currency || 'jpy',
        tax_included: productData.taxIncluded ?? true,
        status: productData.status || 'draft',
        is_highlighted: productData.isHighlighted || false,
        size_specs: productData.sizeSpecs,
        brand_id: productData.brandId || null,
        materials: productData.materials || null,
        care: productData.care || null,
      })
      .select()
      .single();

    if (productError || !product) {
      console.error('Product insert error:', productError);
      return NextResponse.json(
        { error: 'Failed to create product', details: productError?.message },
        { status: 500 }
      );
    }

    // Insert images if provided
    if (images && images.length > 0) {
      const imageInserts = images.map((img: { url: string; color: string | null }, index: number) => ({
        product_id: product.id,
        url: img.url,
        color: img.color,
        position: index,
        is_primary: index === 0,
      }));

      const { error: imageError } = await supabase
        .from('product_images')
        .insert(imageInserts);

      if (imageError) {
        console.error('Image insert error:', imageError);
      }
    }

    // Insert variants if provided
    if (variants && variants.length > 0) {
      const variantInserts = variants.map((v: { color: string | null; size: string | null; sku: string; stock: number; priceOverride: number | null }) => ({
        product_id: product.id,
        color: v.color,
        size: v.size,
        sku: v.sku,
        price_override: v.priceOverride,
        stock: v.stock || 0,
      }));

      const { error: variantError } = await supabase
        .from('product_variants')
        .insert(variantInserts);

      if (variantError) {
        console.error('Variant insert error:', variantError);
      }
    }

    return NextResponse.json({
      id: product.id,
      ...product,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

// PUT - Update product
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, images, variants, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        id,
        ...updates,
        message: 'Product updated (mock mode)',
        mock: true,
      });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Update product
    const { data: product, error: productError } = await supabase
      .from('products')
      .update({
        name: updates.name,
        name_en: updates.nameEn,
        description: updates.description,
        description_en: updates.descriptionEn,
        category: updates.category,
        tags: updates.tags,
        base_price: updates.price,
        discounted_price: updates.discountedPrice,
        currency: updates.currency,
        tax_included: updates.taxIncluded,
        status: updates.status,
        is_highlighted: updates.isHighlighted,
        size_specs: updates.sizeSpecs,
        brand_id: updates.brandId !== undefined ? (updates.brandId || null) : undefined,
        materials: updates.materials !== undefined ? (updates.materials || null) : undefined,
        care: updates.care !== undefined ? (updates.care || null) : undefined,
      })
      .eq('id', id)
      .select()
      .single();

    if (productError) {
      console.error('Product update error:', productError);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update images if provided
    if (images) {
      // Delete existing and re-insert
      await supabase.from('product_images').delete().eq('product_id', id);

      if (images.length > 0) {
        const imageInserts = images.map((img: { url: string; color: string | null }, index: number) => ({
          product_id: id,
          url: img.url,
          color: img.color,
          position: index,
          is_primary: index === 0,
        }));

        await supabase.from('product_images').insert(imageInserts);
      }
    }

    // Update variants if provided
    if (variants) {
      // Delete existing and re-insert
      await supabase.from('product_variants').delete().eq('product_id', id);

      if (variants.length > 0) {
        const variantInserts = variants.map((v: { color: string | null; size: string | null; sku: string; stock: number; priceOverride: number | null }) => ({
          product_id: id,
          color: v.color,
          size: v.size,
          sku: v.sku,
          price_override: v.priceOverride,
          stock: v.stock || 0,
        }));

        await supabase.from('product_variants').insert(variantInserts);
      }
    }

    return NextResponse.json({
      id,
      ...product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE - Delete product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ message: 'Product deleted (mock mode)', mock: true });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // CASCADE will handle images and variants
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}

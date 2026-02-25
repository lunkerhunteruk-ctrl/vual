import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getProductCategoriesForSlot } from '@/lib/utils/vton-category';
import type { VTONCategory } from '@/lib/utils/vton-category';

// GET: Fetch store products filtered by VTON slot
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const vtonSlot = searchParams.get('vtonSlot') as VTONCategory | null;
    const excludeId = searchParams.get('excludeId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    let query = supabase
      .from('products')
      .select(`
        id, name, name_en, category, base_price, discounted_price,
        brands (name),
        product_images!inner (url, is_primary, position)
      `)
      .eq('store_id', storeId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by VTON slot → matching product sub-categories
    if (vtonSlot) {
      const subCategories = getProductCategoriesForSlot(vtonSlot);
      if (subCategories.length === 0) {
        return NextResponse.json({ products: [] });
      }
      // Match any category path containing these sub-categories
      // e.g. "mens-wear-tops" LIKE '%tops%'
      const orFilter = subCategories.map(sc => `category.like.%-${sc}`).join(',');
      query = query.or(orFilter);
    }

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Store products query error:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    // Transform: pick primary image, flatten
    const result = (products || []).map((p: any) => {
      const images = p.product_images || [];
      const primaryImage = images.find((img: any) => img.is_primary) || images[0];
      return {
        id: p.id,
        name: p.name,
        nameEn: p.name_en,
        brand: p.brands?.name || '',
        category: p.category,
        price: p.discounted_price || p.base_price,
        originalPrice: p.discounted_price ? p.base_price : undefined,
        image: primaryImage?.url || '',
      };
    });

    return NextResponse.json({ products: result });
  } catch (error) {
    console.error('Store products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

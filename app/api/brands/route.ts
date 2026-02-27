import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

function toSlug(name: string, nameEn?: string | null): string {
  // Prefer English name for slug (Japanese names produce unusable slugs)
  const source = nameEn?.trim() || name;
  return source
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `brand-${Date.now()}`;
}

// GET: List all brands with product counts and default thumbnails
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Fetch brands
    const { data: brands, error } = await supabase
      .from('brands')
      .select('*')
      .eq('store_id', await resolveStoreIdFromRequest(request))
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Brands query error:', error);
      return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
    }

    // For each brand, get product count and default thumbnail
    const brandsWithStats = await Promise.all(
      (brands || []).map(async (brand) => {
        // Count products for this brand
        const { count } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('brand_id', brand.id);

        // Get default thumbnail: logo_url or first product's first image
        let thumbnailUrl = brand.logo_url;
        if (!thumbnailUrl) {
          const { data: firstProduct } = await supabase
            .from('products')
            .select('id, product_images(url, is_primary, position)')
            .eq('brand_id', brand.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

          if (firstProduct?.product_images) {
            const images = firstProduct.product_images as any[];
            const primary = images.find((img: any) => img.is_primary);
            thumbnailUrl = primary?.url || images[0]?.url || null;
          }
        }

        return {
          ...brand,
          productCount: count || 0,
          thumbnailUrl,
        };
      })
    );

    return NextResponse.json({ success: true, brands: brandsWithStats });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create a new brand
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { name, nameEn, website, description } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
    }

    const slug = toSlug(name, nameEn);

    // Check if slug already exists for this store
    const { data: existing } = await supabase
      .from('brands')
      .select('id')
      .eq('store_id', await resolveStoreIdFromRequest(request))
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'このブランド名は既に登録されています' }, { status: 409 });
    }

    const { data: brand, error } = await supabase
      .from('brands')
      .insert({
        store_id: await resolveStoreIdFromRequest(request),
        name: name.trim(),
        name_en: nameEn?.trim() || null,
        slug,
        website: website || null,
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Brand insert error:', error);
      return NextResponse.json({ error: `Failed to create brand: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, brand });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update a brand
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { id, name, nameEn, logoUrl, website, description, isActive } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) {
      updates.name = name;
      updates.slug = toSlug(name, nameEn);
    }
    if (nameEn !== undefined) {
      updates.name_en = nameEn || null;
      // Regenerate slug if English name changed (even without name change)
      if (name === undefined) {
        // Fetch current name to regenerate slug
        const { data: current } = await supabase
          .from('brands')
          .select('name')
          .eq('id', id)
          .single();
        if (current) {
          updates.slug = toSlug(current.name, nameEn);
        }
      }
    }
    if (logoUrl !== undefined) updates.logo_url = logoUrl;
    if (website !== undefined) updates.website = website;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.is_active = isActive;

    const { data: brand, error } = await supabase
      .from('brands')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Brand update error:', error);
      return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
    }

    return NextResponse.json({ success: true, brand });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a brand
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Clear brand_id from products first
    await supabase
      .from('products')
      .update({ brand_id: null })
      .eq('brand_id', id);

    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Brand delete error:', error);
      return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

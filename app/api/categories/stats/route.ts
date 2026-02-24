import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

// GET: Aggregate product counts and icon images per category
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Fetch all products with their first image
    const { data: products, error } = await supabase
      .from('products')
      .select('id, category, created_at, product_images(url, is_primary, position)')
      .eq('store_id', await resolveStoreIdFromRequest(request))
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    // Aggregate by category
    const stats: Record<string, { count: number; defaultIconUrl: string | null }> = {};

    for (const product of products || []) {
      const cat = product.category;
      if (!cat) continue;

      if (!stats[cat]) {
        // First product in this category → use its primary/first image as default icon
        const images = product.product_images || [];
        const primary = images.find((img: any) => img.is_primary);
        const firstImg = primary || images[0];
        stats[cat] = {
          count: 0,
          defaultIconUrl: firstImg?.url || null,
        };
      }
      stats[cat].count++;
    }

    // Fetch icon overrides
    const { data: icons } = await supabase
      .from('category_icons')
      .select('category_path, icon_url');

    const iconOverrides: Record<string, string> = {};
    for (const icon of icons || []) {
      iconOverrides[icon.category_path] = icon.icon_url;
    }

    // Merge: override takes priority
    const result: Record<string, { count: number; iconUrl: string | null }> = {};
    for (const [cat, data] of Object.entries(stats)) {
      result[cat] = {
        count: data.count,
        iconUrl: iconOverrides[cat] || data.defaultIconUrl,
      };
    }

    return NextResponse.json({ success: true, stats: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update category icon
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { categoryPath, iconUrl } = await request.json();

    if (!categoryPath || !iconUrl) {
      return NextResponse.json({ error: 'categoryPath and iconUrl are required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('category_icons')
      .upsert(
        { category_path: categoryPath, icon_url: iconUrl, updated_at: new Date().toISOString() },
        { onConflict: 'category_path' }
      );

    if (error) {
      return NextResponse.json({ error: 'Failed to update icon' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

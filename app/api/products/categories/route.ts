import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

/**
 * GET /api/products/categories
 * Returns distinct categories from published products for the current store.
 */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ categories: [] });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ categories: [] });
  }

  try {
    const storeId = await resolveStoreIdFromRequest(request);

    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('store_id', storeId)
      .eq('status', 'published')
      .not('category', 'is', null);

    if (error) throw error;

    // Extract unique categories
    const uniqueCategories = [...new Set((data || []).map((p) => p.category))].filter(Boolean).sort();

    return NextResponse.json({ categories: uniqueCategories });
  } catch (error: any) {
    console.error('Categories API error:', error);
    return NextResponse.json({ categories: [] });
  }
}

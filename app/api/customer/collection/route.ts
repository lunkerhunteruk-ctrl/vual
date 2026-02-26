import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

// GET: Public collection for customer-facing pages
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ looks: [] });
    }

    const storeId = await resolveStoreIdFromRequest(request);

    const { data: looks, error } = await supabase
      .from('collection_looks')
      .select(`
        id, image_url, position,
        collection_look_products (
          id, product_id, position,
          products:product_id ( id, name, base_price, price, currency, tax_included, images, status )
        )
      `)
      .eq('store_id', storeId)
      .order('position', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ looks: [] });
      }
      throw error;
    }

    // Filter out products that are not published
    const filteredLooks = (looks || []).map(look => ({
      ...look,
      collection_look_products: (look.collection_look_products || [])
        .filter((lp: any) => lp.products?.status === 'published')
        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0)),
    }));

    return NextResponse.json({ looks: filteredLooks });
  } catch (error: any) {
    console.error('Customer collection GET error:', error);
    return NextResponse.json({ looks: [] });
  }
}

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

    // Fetch looks
    const { data: looks, error } = await supabase
      .from('collection_looks')
      .select('id, image_url, position')
      .eq('store_id', storeId)
      .order('position', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ looks: [] });
      }
      throw error;
    }

    if (!looks || looks.length === 0) {
      return NextResponse.json({ looks: [] });
    }

    // Fetch linked products separately
    const lookIds = looks.map(l => l.id);
    const { data: linkData } = await supabase
      .from('collection_look_products')
      .select('*')
      .in('look_id', lookIds)
      .order('position', { ascending: true });

    let productsMap: Record<string, any> = {};
    if (linkData && linkData.length > 0) {
      const productIds = [...new Set(linkData.map(l => l.product_id))];
      const { data: products } = await supabase
        .from('products')
        .select('id, name, base_price, currency, tax_included, status')
        .in('id', productIds);

      const { data: productImages } = await supabase
        .from('product_images')
        .select('product_id, url, is_primary, position')
        .in('product_id', productIds)
        .order('position', { ascending: true });

      if (products) {
        productsMap = Object.fromEntries(products.map(p => [p.id, {
          ...p,
          images: (productImages || [])
            .filter(img => img.product_id === p.id)
            .map(img => ({ url: img.url, is_primary: img.is_primary })),
        }]));
      }
    }

    // Assemble and filter published products only
    const result = looks.map(look => ({
      ...look,
      collection_look_products: (linkData || [])
        .filter(lp => lp.look_id === look.id)
        .map(lp => ({
          ...lp,
          products: productsMap[lp.product_id] || null,
        }))
        .filter(lp => lp.products?.status === 'published'),
    }));

    return NextResponse.json({ looks: result });
  } catch (error: any) {
    console.error('Customer collection GET error:', error);
    return NextResponse.json({ looks: [] });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

/**
 * POST /api/ai/batch-queue/save-to-collection
 *
 * Takes completed batch items and saves them to collection as a bundle.
 * Lightweight — no image fetching, just DB inserts using existing R2 URLs.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const { storeId, batchName } = await request.json();
    if (!storeId || !batchName) {
      return NextResponse.json({ error: 'storeId and batchName required' }, { status: 400 });
    }

    // Find completed items for this specific batch only
    const { data: items, error: fetchErr } = await supabase
      .from('batch_queue')
      .select('id, result_image_url, payload')
      .eq('store_id', storeId)
      .eq('batch_name', batchName)
      .eq('status', 'completed')
      .not('result_image_url', 'is', null)
      .order('created_at', { ascending: true });

    if (fetchErr || !items?.length) {
      return NextResponse.json({ error: 'No completed items to save', count: 0 }, { status: 400 });
    }

    // Check if these items are already in collection (avoid duplicates)
    const imageUrls = items.map(i => i.result_image_url);
    const { data: existing } = await supabase
      .from('collection_looks')
      .select('image_url')
      .eq('store_id', storeId)
      .in('image_url', imageUrls);

    const existingUrls = new Set(existing?.map(e => e.image_url) || []);
    const newItems = items.filter(i => !existingUrls.has(i.result_image_url));

    if (newItems.length === 0) {
      return NextResponse.json({ success: true, message: 'Already in collection', count: 0 });
    }

    // Get current min position
    const { data: minPos } = await supabase
      .from('collection_looks')
      .select('position')
      .eq('store_id', storeId)
      .order('position', { ascending: true })
      .limit(1)
      .single();

    let nextPosition = (minPos?.position ?? 1) - newItems.length;
    const editorialGroupId = crypto.randomUUID();
    const lookIds: string[] = [];

    for (const item of newItems) {
      const productIds = item.payload?.productIds || [];

      const { data: inserted } = await supabase
        .from('collection_looks')
        .insert({
          store_id: storeId,
          image_url: item.result_image_url,
          position: nextPosition++,
          editorial_group_id: editorialGroupId,
          show_credits: true,
        })
        .select('id')
        .single();

      if (inserted) {
        lookIds.push(inserted.id);
        // Link products via collection_look_products
        if (productIds.length > 0) {
          const productLinks = productIds.slice(0, 4).map((productId: string, idx: number) => ({
            look_id: inserted.id,
            product_id: productId,
            position: idx,
          }));
          await supabase.from('collection_look_products').insert(productLinks);
        }
      }
    }

    // Create bundle if multiple looks
    let bundleId: string | null = null;
    if (lookIds.length > 1) {
      const { data: bundle } = await supabase
        .from('collection_bundles')
        .insert({ store_id: storeId })
        .select('id')
        .single();

      if (bundle) {
        bundleId = bundle.id;
        for (let i = 0; i < lookIds.length; i++) {
          await supabase
            .from('collection_looks')
            .update({ bundle_id: bundle.id, bundle_position: i })
            .eq('id', lookIds[i]);
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: lookIds.length,
      bundleId,
    });
  } catch (error) {
    console.error('[SaveToCollection] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

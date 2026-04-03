import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

/**
 * POST /api/collections/swap-look
 *
 * When a shot is regenerated in studio, this endpoint:
 * 1. Unbundles the old look (sets bundle_id = null → becomes standalone card)
 * 2. Creates a new look with the regenerated image in the same bundle position
 * 3. Returns the new look ID
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const storeId = await resolveStoreIdFromRequest(request);
    const body = await request.json();
    const {
      oldLookId,
      bundleId,
      imageUrl,
      productIds,
      title,
      description,
      video_prompt_veo,
      video_prompt_kling,
      telop_caption_ja,
      telop_caption_en,
      shot_duration_sec,
    } = body;

    if (!oldLookId || !bundleId || !imageUrl) {
      return NextResponse.json({ error: 'oldLookId, bundleId, and imageUrl are required' }, { status: 400 });
    }

    // 1. Get old look to preserve its bundle_position and editorial_group_id
    const { data: oldLook, error: lookErr } = await supabase
      .from('collection_looks')
      .select('bundle_position, position, editorial_group_id')
      .eq('id', oldLookId)
      .eq('store_id', storeId)
      .single();

    if (lookErr || !oldLook) {
      return NextResponse.json({ error: 'Old look not found' }, { status: 404 });
    }

    // 2. Copy image to permanent storage
    let permanentUrl = imageUrl;
    try {
      const imgRes = await fetch(imageUrl);
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const ct = imgRes.headers.get('content-type') || 'image/jpeg';
        const ext = ct.includes('png') ? 'png' : 'jpg';
        const filename = `collection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
        const { error: uploadErr } = await storage
          .from('model-images')
          .upload(filename, buf, { contentType: ct, upsert: false });
        if (!uploadErr) {
          const { data: urlData } = storage.from('model-images').getPublicUrl(filename);
          permanentUrl = urlData.publicUrl;
        }
      }
    } catch (e) {
      console.error('[SwapLook] Image copy error:', e);
    }

    // 3. Unbundle old look (becomes standalone card)
    await supabase
      .from('collection_looks')
      .update({ bundle_id: null, bundle_position: 0 })
      .eq('id', oldLookId)
      .eq('store_id', storeId);

    // 4. Create new look in the same bundle position
    const insertPayload: Record<string, unknown> = {
      store_id: storeId,
      image_url: permanentUrl,
      bundle_id: bundleId,
      bundle_position: oldLook.bundle_position,
      position: oldLook.position,
      editorial_group_id: oldLook.editorial_group_id,
    };
    if (title) insertPayload.title = title;
    if (description) insertPayload.description = description;
    if (video_prompt_veo) insertPayload.video_prompt_veo = video_prompt_veo;
    if (video_prompt_kling) insertPayload.video_prompt_kling = video_prompt_kling;
    if (telop_caption_ja) insertPayload.telop_caption_ja = telop_caption_ja;
    if (telop_caption_en) insertPayload.telop_caption_en = telop_caption_en;
    if (shot_duration_sec) insertPayload.shot_duration_sec = shot_duration_sec;

    const { data: newLook, error: insertErr } = await supabase
      .from('collection_looks')
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr || !newLook) {
      console.error('[SwapLook] Insert error:', insertErr);
      // Rollback: re-bundle old look
      await supabase
        .from('collection_looks')
        .update({ bundle_id: bundleId, bundle_position: oldLook.bundle_position })
        .eq('id', oldLookId);
      return NextResponse.json({ error: 'Failed to create new look' }, { status: 500 });
    }

    // 5. Link products to new look
    if (productIds && productIds.length > 0) {
      const links = productIds.slice(0, 4).map((pid: string, idx: number) => ({
        look_id: newLook.id,
        product_id: pid,
        position: idx,
      }));
      await supabase.from('collection_look_products').insert(links);
    }

    // 6. Check if bundle still has 2+ looks; if only 1 remains, disband
    const { count } = await supabase
      .from('collection_looks')
      .select('id', { count: 'exact', head: true })
      .eq('bundle_id', bundleId);

    if (count !== null && count < 2) {
      // Disband: remove bundle_id from remaining look, delete bundle
      await supabase
        .from('collection_looks')
        .update({ bundle_id: null, bundle_position: 0 })
        .eq('bundle_id', bundleId);
      await supabase
        .from('collection_bundles')
        .delete()
        .eq('id', bundleId);
    }

    console.log(`[SwapLook] Swapped look ${oldLookId} → ${newLook.id} in bundle ${bundleId}`);

    return NextResponse.json({
      success: true,
      newLookId: newLook.id,
      oldLookId,
      permanentUrl,
    });
  } catch (error: any) {
    console.error('[SwapLook] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

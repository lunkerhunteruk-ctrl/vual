import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

interface BatchLookPayload {
  looks: {
    imageUrl: string;
    sourceGeminiResultId?: string;
    productIds: string[];
    title?: string;
    description?: string;
    video_prompt_veo?: string;
    video_prompt_kling?: string;
    telop_caption_ja?: string;
    telop_caption_en?: string;
    shot_duration_sec?: number;
  }[];
  editorialGroupId: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const storeId = await resolveStoreIdFromRequest(request);
    const body: BatchLookPayload = await request.json();
    const { looks, editorialGroupId } = body;

    if (!looks || looks.length === 0) {
      return NextResponse.json({ error: 'looks array is required' }, { status: 400 });
    }

    // Get current min position so new looks go to the top
    const { data: minPos } = await supabase
      .from('collection_looks')
      .select('position')
      .eq('store_id', storeId)
      .order('position', { ascending: true })
      .limit(1)
      .single();

    let nextPosition = (minPos?.position ?? 1) - looks.length;

    // Copy images to permanent storage in parallel
    const permanentUrls = await Promise.all(
      looks.map(async (look) => {
        try {
          const imageResponse = await fetch(look.imageUrl);
          if (imageResponse.ok) {
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
            const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
            const ext = contentType.includes('png') ? 'png' : 'jpg';
            const filename = `collection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

            const { error: uploadError } = await storage
              .from('model-images')
              .upload(filename, imageBuffer, {
                contentType,
                upsert: false,
              });

            if (!uploadError) {
              const { data: urlData } = storage
                .from('model-images')
                .getPublicUrl(filename);
              return urlData.publicUrl;
            }
          }
        } catch (err) {
          console.error('[Collections Batch] Image copy error:', err);
        }
        return look.imageUrl; // fallback to original URL
      })
    );

    // Insert all looks
    const createdLooks: any[] = [];
    for (let i = 0; i < looks.length; i++) {
      const look = looks[i];
      const insertPayload: Record<string, unknown> = {
        store_id: storeId,
        image_url: permanentUrls[i],
        position: nextPosition + i,
        editorial_group_id: editorialGroupId,
      };
      if (look.sourceGeminiResultId) insertPayload.source_gemini_result_id = look.sourceGeminiResultId;
      if (look.title) insertPayload.title = look.title;
      if (look.description) insertPayload.description = look.description;
      if (look.video_prompt_veo) insertPayload.video_prompt_veo = look.video_prompt_veo;
      if (look.video_prompt_kling) insertPayload.video_prompt_kling = look.video_prompt_kling;
      if (look.telop_caption_ja) insertPayload.telop_caption_ja = look.telop_caption_ja;
      if (look.telop_caption_en) insertPayload.telop_caption_en = look.telop_caption_en;
      if (look.shot_duration_sec) insertPayload.shot_duration_sec = look.shot_duration_sec;

      let { data: created, error: insertError } = await supabase
        .from('collection_looks')
        .insert(insertPayload)
        .select()
        .single();

      // If insert fails (e.g. new columns not yet migrated), retry with core fields only
      if (insertError) {
        console.error(`[Collections Batch] Look ${i} insert error (retrying core):`, insertError);
        const corePayload: Record<string, unknown> = {
          store_id: insertPayload.store_id,
          image_url: insertPayload.image_url,
          position: insertPayload.position,
          editorial_group_id: insertPayload.editorial_group_id,
        };
        if (look.title) corePayload.title = look.title;
        if (look.description) corePayload.description = look.description;
        if (look.sourceGeminiResultId) corePayload.source_gemini_result_id = look.sourceGeminiResultId;

        const retry = await supabase
          .from('collection_looks')
          .insert(corePayload)
          .select()
          .single();

        if (retry.error) {
          console.error(`[Collections Batch] Look ${i} core insert also failed:`, retry.error);
          continue;
        }
        created = retry.data;
        insertError = null;
      }

      createdLooks.push(created);

      // Link products
      if (look.productIds && look.productIds.length > 0) {
        const links = look.productIds.slice(0, 4).map((pid: string, idx: number) => ({
          look_id: created.id,
          product_id: pid,
          position: idx,
        }));

        const { error: linkError } = await supabase
          .from('collection_look_products')
          .insert(links);

        if (linkError) {
          console.error(`[Collections Batch] Look ${i} product link error:`, linkError);
        }
      }
    }

    // Auto-bundle if 2+ looks were created in this batch
    let bundleId: string | null = null;
    if (createdLooks.length >= 2) {
      try {
        const minPosition = Math.min(...createdLooks.map((l: any) => l.position));
        const { data: bundle, error: bundleError } = await supabase
          .from('collection_bundles')
          .insert({ store_id: storeId, position: minPosition })
          .select()
          .single();

        if (bundleError) {
          console.error('[Collections Batch] Bundle create error:', bundleError);
        } else {
          bundleId = bundle.id;
          for (let i = 0; i < createdLooks.length; i++) {
            const { error: linkError } = await supabase
              .from('collection_looks')
              .update({ bundle_id: bundle.id, bundle_position: i })
              .eq('id', createdLooks[i].id);

            if (linkError) {
              console.error(`[Collections Batch] Bundle link error for look ${i}:`, linkError);
            }
          }
        }
      } catch (bundleErr) {
        console.error('[Collections Batch] Auto-bundle error:', bundleErr);
      }
    }

    return NextResponse.json({ success: true, looks: createdLooks, bundleId });
  } catch (error: any) {
    console.error('[Collections Batch] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

/**
 * POST /api/collections/regenerate
 *
 * Regenerate a single look image within a bundle.
 * 1. Calls Gemini Image API to generate a new image
 * 2. Uploads to storage and updates collection_looks.image_url
 * 3. Calls collection-copy API to regenerate copy/video prompts
 * 4. Updates collection_looks with new copy data
 * 5. Consumes 1 studio credit
 *
 * Body: {
 *   lookId: string,
 *   customPrompt?: string,       // Additional prompt instructions
 *   modelSettings: object,        // gender, height, ethnicity, pose, tuckStyle
 *   background: string,
 *   aspectRatio: string,
 *   resolution?: string,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const storeId = await resolveStoreIdFromRequest(request);
    const body = await request.json();
    const { lookId, customPrompt, modelSettings, background, aspectRatio, resolution } = body;

    if (!lookId) {
      return NextResponse.json({ error: 'lookId is required' }, { status: 400 });
    }

    // 1. Fetch existing look with products
    const { data: look, error: lookError } = await supabase
      .from('collection_looks')
      .select('*, collection_look_products(product_id, position, products(id, name, product_images(url, is_primary)))')
      .eq('id', lookId)
      .eq('store_id', storeId)
      .single();

    if (lookError || !look) {
      return NextResponse.json({ error: 'Look not found' }, { status: 404 });
    }

    // 2. Get product images for garment reference
    const productIds = look.collection_look_products?.map((lp: any) => lp.product_id) || [];
    const garmentImages: string[] = [];
    const garmentNames: string[] = [];

    for (const lp of (look.collection_look_products || [])) {
      const product = lp.products;
      if (!product) continue;
      garmentNames.push(product.name || '');
      const primaryImg = product.product_images?.find((img: any) => img.is_primary);
      const imgUrl = primaryImg?.url || product.product_images?.[0]?.url;
      if (imgUrl) {
        // Convert to base64
        try {
          const imgRes = await fetch(imgUrl);
          if (imgRes.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            garmentImages.push(buf.toString('base64'));
          }
        } catch (e) {
          console.error('[Regenerate] Failed to fetch product image:', e);
        }
      }
    }

    // 3. Also get the original look image as model reference
    let modelImageBase64: string | undefined;
    if (look.image_url) {
      try {
        const imgRes = await fetch(look.image_url);
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer());
          modelImageBase64 = buf.toString('base64');
        }
      } catch (e) {
        console.error('[Regenerate] Failed to fetch look image for reference:', e);
      }
    }

    // 4. Call Gemini Image API
    const origin = request.headers.get('origin') || request.headers.get('x-forwarded-host') || 'http://localhost:3000';
    const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`;

    const geminiPayload: any = {
      garmentImages: garmentImages.length > 0 ? [garmentImages[0]] : undefined,
      garmentName: garmentNames[0] || undefined,
      modelSettings: modelSettings || {
        gender: 'female',
        height: 165,
        ethnicity: 'japanese',
        pose: 'standing',
        tuckStyle: 'auto',
      },
      modelImage: modelImageBase64,
      background: background || 'outdoorUrban',
      aspectRatio: aspectRatio || '3:4',
      resolution: resolution || '1K',
      customPrompt: customPrompt || '',
      storeId,
    };

    // Add additional garment images
    if (garmentImages[1]) geminiPayload.secondGarmentImages = [garmentImages[1]];
    if (garmentImages[2]) geminiPayload.thirdGarmentImages = [garmentImages[2]];
    if (garmentImages[3]) geminiPayload.fourthGarmentImages = [garmentImages[3]];
    if (garmentImages[4]) geminiPayload.fifthGarmentImages = [garmentImages[4]];
    if (garmentNames[1]) geminiPayload.secondGarmentName = garmentNames[1];
    if (garmentNames[2]) geminiPayload.thirdGarmentName = garmentNames[2];
    if (garmentNames[3]) geminiPayload.fourthGarmentName = garmentNames[3];
    if (garmentNames[4]) geminiPayload.fifthGarmentName = garmentNames[4];

    const geminiRes = await fetch(`${baseUrl}/api/ai/gemini-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    });

    const geminiData = await geminiRes.json();

    if (!geminiData.success || !geminiData.savedImageUrl) {
      return NextResponse.json(
        { error: geminiData.error || 'Image generation failed' },
        { status: 500 }
      );
    }

    const newImageUrl = geminiData.savedImageUrl;

    // 5. Update collection_looks with new image
    const { error: updateError } = await supabase
      .from('collection_looks')
      .update({ image_url: newImageUrl })
      .eq('id', lookId);

    if (updateError) {
      console.error('[Regenerate] Image URL update failed:', updateError);
    }

    // 6. Regenerate copy/video prompts
    let copyData: any = null;
    try {
      const copyRes = await fetch(`${baseUrl}/api/ai/collection-copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenePrompt: customPrompt || '',
          lookImageUrl: newImageUrl,
          locale: 'ja',
        }),
      });

      if (copyRes.ok) {
        copyData = await copyRes.json();

        // Update with new copy data
        const copyUpdates: Record<string, any> = {};
        if (copyData.title) copyUpdates.title = copyData.title;
        if (copyData.description) copyUpdates.description = copyData.description;
        if (copyData.video_prompt_veo) copyUpdates.video_prompt_veo = copyData.video_prompt_veo;
        if (copyData.video_prompt_kling) copyUpdates.video_prompt_kling = copyData.video_prompt_kling;
        if (copyData.telop_caption_ja) copyUpdates.telop_caption_ja = copyData.telop_caption_ja;
        if (copyData.telop_caption_en) copyUpdates.telop_caption_en = copyData.telop_caption_en;
        if (copyData.shot_duration_sec) copyUpdates.shot_duration_sec = copyData.shot_duration_sec;

        if (Object.keys(copyUpdates).length > 0) {
          await supabase
            .from('collection_looks')
            .update(copyUpdates)
            .eq('id', lookId);
        }
      }
    } catch (copyErr) {
      console.error('[Regenerate] Copy generation failed (non-blocking):', copyErr);
    }

    return NextResponse.json({
      success: true,
      newImageUrl,
      copy: copyData ? {
        title: copyData.title,
        description: copyData.description,
        video_prompt_veo: copyData.video_prompt_veo,
        video_prompt_kling: copyData.video_prompt_kling,
        telop_caption_ja: copyData.telop_caption_ja,
        telop_caption_en: copyData.telop_caption_en,
        shot_duration_sec: copyData.shot_duration_sec,
      } : null,
    });
  } catch (error: any) {
    console.error('[Regenerate] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

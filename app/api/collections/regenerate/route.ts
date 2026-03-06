import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

export const maxDuration = 120;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.1-flash-image-preview';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const backgroundDescriptions: Record<string, string> = {
  studioWhite: 'clean white studio background with soft professional lighting',
  studioGray: 'neutral gray studio background with professional fashion photography lighting',
  outdoorUrban: 'modern urban street background with city architecture, natural daylight',
  outdoorNature: 'natural outdoor setting with soft natural lighting, greenery',
  cafeIndoor: 'stylish cafe interior with warm ambient lighting',
  beachResort: 'tropical beach or resort setting with bright natural sunlight, model standing on dry sand near the shoreline',
};

const ethnicityDescriptions: Record<string, string> = {
  japanese: 'Japanese', korean: 'Korean', chinese: 'Chinese',
  'eastern-european': 'Eastern European', 'western-european': 'Western European',
  african: 'African', latin: 'Latin American', 'southeast-asian': 'Southeast Asian',
};

const poseDescriptions: Record<string, string> = {
  standing: 'standing with confident posture', walking: 'walking naturally mid-stride',
  sitting: 'sitting elegantly', dynamic: 'in a dynamic fashion pose',
  leaning: 'leaning casually against a wall',
};

/**
 * POST /api/collections/regenerate
 *
 * Regenerate a single look image. Calls Gemini API directly (no internal fetch).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const storeId = await resolveStoreIdFromRequest(request);
    const body = await request.json();
    const { lookId, customPrompt, modelSettings: userModelSettings, background: userBackground, aspectRatio: userAspectRatio } = body;

    console.log('[Regenerate] Starting:', { lookId, customPrompt: customPrompt?.slice(0, 50), storeId });

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

    // 2. Fetch product images as base64 inline_data parts for Gemini
    const imageParts: any[] = [];
    const garmentNames: string[] = [];

    for (const lp of (look.collection_look_products || [])) {
      const product = lp.products;
      if (!product) continue;
      garmentNames.push(product.name || '');
      const primaryImg = product.product_images?.find((img: any) => img.is_primary);
      const imgUrl = primaryImg?.url || product.product_images?.[0]?.url;
      if (imgUrl) {
        try {
          const imgRes = await fetch(imgUrl);
          if (imgRes.ok) {
            const contentType = imgRes.headers.get('content-type') || 'image/png';
            const mimeType = contentType.split(';')[0].trim();
            const buf = Buffer.from(await imgRes.arrayBuffer());
            imageParts.push({ inline_data: { mime_type: mimeType, data: buf.toString('base64') } });
          }
        } catch (e) {
          console.error('[Regenerate] Failed to fetch product image:', e);
        }
      }
    }

    // 3. Fetch original look image as model reference
    if (look.image_url) {
      try {
        const imgRes = await fetch(look.image_url);
        if (imgRes.ok) {
          const contentType = imgRes.headers.get('content-type') || 'image/png';
          const mimeType = contentType.split(';')[0].trim();
          const buf = Buffer.from(await imgRes.arrayBuffer());
          imageParts.push({ inline_data: { mime_type: mimeType, data: buf.toString('base64') } });
        }
      } catch (e) {
        console.error('[Regenerate] Failed to fetch look image:', e);
      }
    }

    console.log('[Regenerate] Image parts count:', imageParts.length, 'Garment names:', garmentNames);

    // 4. Build prompt
    const ms = userModelSettings || { gender: 'female', height: 165, ethnicity: 'japanese', pose: 'standing' };
    const bg = userBackground || 'outdoorUrban';
    const ar = userAspectRatio || '3:4';
    const hasModelRef = !!look.image_url;

    const garmentCount = imageParts.length - (hasModelRef ? 1 : 0);
    let garmentRef = 'the garment from the provided reference image';
    if (garmentCount > 1) {
      garmentRef = `the ${garmentCount} garments from the provided reference images`;
    }

    const modelDesc = hasModelRef
      ? 'Generate an image using the EXACT model appearance from the provided model reference image (face, body type, skin tone must match exactly)'
      : `A ${ethnicityDescriptions[ms.ethnicity] || ms.ethnicity} ${ms.gender === 'female' ? 'woman' : 'man'}`;

    const bgDesc = (customPrompt && customPrompt.length > 100) ? '' : ` ${backgroundDescriptions[bg] || bg}.`;

    const prompt = [
      `CRITICAL: Reproduce the EXACT garments from the reference images with 100% accuracy.`,
      `DO NOT create similar-looking alternatives. The garments must be PIXEL-PERFECT matches.`,
      `Preserve exact: color, pattern, texture, neckline, sleeve details, buttons, zippers, pockets, fabric drape, silhouette.`,
      ``,
      `Professional high-end fashion photography.`,
      `${modelDesc}, ${ms.height}cm tall,`,
      ms.pose ? `${poseDescriptions[ms.pose] || ms.pose},` : '',
      `wearing ${garmentRef}.`,
      customPrompt ? `MANDATORY STYLING: ${customPrompt}.` : '',
      bgDesc,
      `Sharp focus, editorial fashion quality, photorealistic. Full body shot.`,
      `No text, labels, watermarks. ${ar} aspect ratio.`,
      `IMPORTANT: Generate a DIFFERENT pose and angle from the model reference — same person, new composition.`,
    ].filter(Boolean).join(' ');

    // 5. Call Gemini API directly
    const MAX_RETRIES = 2;
    let generatedImageBase64: string | null = null;
    let lastError: string | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(`[Regenerate] Gemini attempt ${attempt + 1}/${MAX_RETRIES}`);

        const geminiRes = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, ...imageParts] }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
              imageConfig: { aspectRatio: ar, imageSize: '1K' },
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
          }),
        });

        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          console.error(`[Regenerate] Gemini API error ${geminiRes.status}:`, errText.slice(0, 500));
          lastError = `Gemini API error: ${geminiRes.status}`;
          continue;
        }

        const data = await geminiRes.json();
        const candidates = data.candidates || [];
        const finishReason = candidates[0]?.finishReason;

        if (finishReason === 'IMAGE_PROHIBITED_CONTENT') {
          console.log(`[Regenerate] Content filter on attempt ${attempt + 1}`);
          lastError = 'Content filter blocked generation';
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        // Extract image
        for (const candidate of candidates) {
          for (const part of (candidate.content?.parts || [])) {
            const inlineData = part.inline_data || part.inlineData;
            if (inlineData?.data) {
              generatedImageBase64 = inlineData.data;
              console.log(`[Regenerate] Got image on attempt ${attempt + 1}, size: ${generatedImageBase64!.length}`);
              break;
            }
          }
          if (generatedImageBase64) break;
        }

        if (generatedImageBase64) break;
        lastError = `No image in response (finishReason: ${finishReason})`;
      } catch (e: any) {
        console.error(`[Regenerate] Attempt ${attempt + 1} error:`, e.message);
        lastError = e.message;
      }
    }

    if (!generatedImageBase64) {
      return NextResponse.json({ error: lastError || 'Image generation failed' }, { status: 500 });
    }

    // 6. Upload to Supabase Storage
    const imageBuffer = Buffer.from(generatedImageBase64, 'base64');
    const filename = `regen-${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('gemini-results')
      .upload(filename, imageBuffer, { contentType: 'image/png', upsert: false });

    if (uploadError) {
      console.error('[Regenerate] Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload generated image' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('gemini-results').getPublicUrl(filename);
    const newImageUrl = urlData.publicUrl;
    console.log('[Regenerate] New image URL:', newImageUrl);

    // 7. Update collection_looks with new image
    const { error: updateError } = await supabase
      .from('collection_looks')
      .update({ image_url: newImageUrl })
      .eq('id', lookId);

    if (updateError) {
      console.error('[Regenerate] DB update error:', updateError);
    }

    // 8. Regenerate copy/video prompts via collection-copy API
    let copyData: any = null;
    try {
      const origin = request.headers.get('origin') || request.headers.get('x-forwarded-host') || 'http://localhost:3000';
      const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`;

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
        const copyUpdates: Record<string, any> = {};
        if (copyData.title) copyUpdates.title = copyData.title;
        if (copyData.description) copyUpdates.description = copyData.description;
        if (copyData.video_prompt_veo) copyUpdates.video_prompt_veo = copyData.video_prompt_veo;
        if (copyData.video_prompt_kling) copyUpdates.video_prompt_kling = copyData.video_prompt_kling;
        if (copyData.telop_caption_ja) copyUpdates.telop_caption_ja = copyData.telop_caption_ja;
        if (copyData.telop_caption_en) copyUpdates.telop_caption_en = copyData.telop_caption_en;
        if (copyData.shot_duration_sec) copyUpdates.shot_duration_sec = copyData.shot_duration_sec;

        if (Object.keys(copyUpdates).length > 0) {
          await supabase.from('collection_looks').update(copyUpdates).eq('id', lookId);
        }
      }
    } catch (copyErr) {
      console.error('[Regenerate] Copy generation failed (non-blocking):', copyErr);
    }

    // 9. Deduct 1 studio credit
    try {
      const { data: sub } = await supabase
        .from('store_subscriptions')
        .select('studio_subscription_credits, studio_topup_credits, studio_credits_total_used')
        .eq('store_id', storeId)
        .single();

      if (sub) {
        const subDeduct = Math.min(1, sub.studio_subscription_credits);
        const topupDeduct = 1 - subDeduct;
        await supabase.from('store_subscriptions').update({
          studio_subscription_credits: sub.studio_subscription_credits - subDeduct,
          studio_topup_credits: sub.studio_topup_credits - topupDeduct,
          studio_credits_total_used: (sub.studio_credits_total_used || 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq('store_id', storeId);
      }
    } catch (creditErr) {
      console.error('[Regenerate] Credit deduction failed:', creditErr);
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

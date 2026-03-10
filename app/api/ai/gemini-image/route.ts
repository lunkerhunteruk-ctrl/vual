import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { checkAndDeductCredit } from '@/lib/billing/credit-check';
import { addCreditWatermark } from '@/lib/utils/image-watermark';

export const maxDuration = 120;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.1-flash-image-preview';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GarmentSize {
  bodyWidth?: number;
  length?: number;
  sleeveLength?: number;
  shoulderWidth?: number;
}

interface ModelSettings {
  gender: string;
  height: number;
  ethnicity: string;
  pose: string;
  tuckStyle?: 'auto' | 'tuck-out' | 'tuck-in' | 'french-tuck';
}

interface SizeSpec {
  columns: string[];
  rows: { size: string; values: Record<string, string> }[];
}

interface RequestBody {
  garmentImage?: string;
  garmentImages?: string[];
  garmentName?: string;
  garmentSize?: GarmentSize;
  garmentSizeSpecs?: SizeSpec;
  secondGarmentImage?: string;
  secondGarmentImages?: string[];
  secondGarmentName?: string;
  thirdGarmentImage?: string;
  thirdGarmentImages?: string[];
  thirdGarmentName?: string;
  fourthGarmentImage?: string;
  fourthGarmentImages?: string[];
  fourthGarmentName?: string;
  fifthGarmentImage?: string;
  fifthGarmentImages?: string[];
  fifthGarmentName?: string;
  // Product IDs for linking generated images to products
  productIds?: string[];
  modelSettings: ModelSettings;
  modelImage?: string;
  vtonBase?: boolean;
  background: string;
  aspectRatio: string;
  resolution?: string;
  customPrompt?: string;
  locale?: string;
  // Consumer billing fields (when called from customer try-on)
  lineUserId?: string;
  customerId?: string;
  // Store ID for resolving daily free limit
  storeId?: string;
}

// Background descriptions
const backgroundDescriptions: Record<string, string> = {
  studioWhite: 'clean white studio background with soft professional lighting',
  studioGray: 'neutral gray studio background with professional fashion photography lighting',
  outdoorUrban: 'modern urban street background with city architecture, natural daylight',
  outdoorNature: 'natural outdoor setting with soft natural lighting, greenery',
  cafeIndoor: 'stylish cafe interior with warm ambient lighting',
  beachResort: 'tropical beach or resort setting with bright natural sunlight, model standing on dry sand near the shoreline',
};

// Ethnicity descriptions
const ethnicityDescriptions: Record<string, string> = {
  japanese: 'Japanese',
  korean: 'Korean',
  chinese: 'Chinese',
  'eastern-european': 'Eastern European',
  'western-european': 'Western European',
  african: 'African',
  latin: 'Latin American',
  'southeast-asian': 'Southeast Asian',
};

// Pose descriptions
const poseDescriptions: Record<string, string> = {
  standing: 'standing with confident posture',
  walking: 'walking naturally mid-stride',
  sitting: 'sitting elegantly',
  dynamic: 'in a dynamic fashion pose',
  leaning: 'leaning casually against a wall',
};

// Helper function to extract base64 data from data URL
function extractBase64(dataUrl: string): { data: string; mimeType: string } | null {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return null;
}

// Call Gemini API directly
async function callGeminiAPI(parts: any[], aspectRatio: string = '3:4', imageSize: string = '1K'): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Gemini API uses aspectRatio string (e.g. "3:4") directly in imageConfig
  console.log(`[callGeminiAPI] aspectRatio=${aspectRatio}, imageSize=${imageSize}`);
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Freestyle Gemini API] Error:', errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  const MAX_RETRIES = 3;

  try {
    const body: RequestBody = await request.json();

    // Support both single image and array format
    const firstGarmentImages = body.garmentImages || (body.garmentImage ? [body.garmentImage] : []);
    const secondGarmentImages = body.secondGarmentImages || (body.secondGarmentImage ? [body.secondGarmentImage] : []);
    const thirdGarmentImages = body.thirdGarmentImages || (body.thirdGarmentImage ? [body.thirdGarmentImage] : []);
    const fourthGarmentImages = body.fourthGarmentImages || (body.fourthGarmentImage ? [body.fourthGarmentImage] : []);
    const fifthGarmentImages = body.fifthGarmentImages || (body.fifthGarmentImage ? [body.fifthGarmentImage] : []);

    const hasAdditionalGarments = secondGarmentImages.length > 0 || thirdGarmentImages.length > 0 || fourthGarmentImages.length > 0 || fifthGarmentImages.length > 0;
    if (firstGarmentImages.length === 0 && !body.vtonBase) {
      return NextResponse.json({ error: 'Garment image is required' }, { status: 400 });
    }
    if (body.vtonBase && !hasAdditionalGarments) {
      return NextResponse.json({ error: 'Additional garments required when using VTON base' }, { status: 400 });
    }

    console.log('[Gemini] Request billing context:', {
      storeId: body.storeId || 'NONE',
      lineUserId: body.lineUserId || 'NONE',
      customerId: body.customerId || 'NONE',
    });

    // Credit check for consumer requests (lineUserId or customerId present)
    if (body.lineUserId || body.customerId) {
      const creditResult = await checkAndDeductCredit({
        lineUserId: body.lineUserId,
        customerId: body.customerId,
        storeId: body.storeId,
      });

      if (!creditResult.allowed) {
        return NextResponse.json(
          { error: creditResult.error, errorCode: creditResult.errorCode },
          { status: 402 }
        );
      }
    }

    // AI Studio credit check for store admin requests
    console.log('[Gemini] Studio credit check condition:', {
      hasStoreId: !!body.storeId,
      hasLineUserId: !!body.lineUserId,
      hasCustomerId: !!body.customerId,
      willCheck: !!(body.storeId && !body.lineUserId && !body.customerId),
    });
    if (body.storeId && !body.lineUserId && !body.customerId) {
      const { createServerClient: createSC } = await import('@/lib/supabase');
      const sb = createSC();
      console.log('[Gemini] Supabase client created:', !!sb);
      if (sb) {
        const { data: sub, error: subError } = await sb
          .from('store_subscriptions')
          .select('studio_subscription_credits, studio_topup_credits, studio_credits_total_used, status')
          .eq('store_id', body.storeId)
          .single();

        console.log('[Gemini] Subscription query result:', { sub, subError, storeId: body.storeId });

        if (!sub || (sub.status !== 'active' && sub.status !== 'trialing')) {
          return NextResponse.json(
            { error: 'サブスクリプションが有効ではありません', errorCode: 'no_subscription' },
            { status: 402 }
          );
        }

        const creditCost = body.resolution === '4K' ? 2 : 1;
        const totalCredits = sub.studio_subscription_credits + sub.studio_topup_credits;
        if (totalCredits < creditCost) {
          return NextResponse.json(
            { error: creditCost === 2 ? 'AIスタジオクレジットが不足しています（4K解像度は2クレジット必要です）' : 'AIスタジオクレジットが不足しています', errorCode: 'insufficient_studio_credits' },
            { status: 402 }
          );
        }

        // Deduct: subscription credits first, then topup
        console.log('[Gemini] Deducting credit. cost:', creditCost, 'resolution:', body.resolution || '1K', 'subscription:', sub.studio_subscription_credits, 'topup:', sub.studio_topup_credits);
        let subDeduct = Math.min(creditCost, sub.studio_subscription_credits);
        let topupDeduct = creditCost - subDeduct;

        const { error: deductError } = await sb
          .from('store_subscriptions')
          .update({
            studio_subscription_credits: sub.studio_subscription_credits - subDeduct,
            studio_topup_credits: sub.studio_topup_credits - topupDeduct,
            studio_credits_total_used: (sub.studio_credits_total_used || 0) + creditCost,
            updated_at: new Date().toISOString(),
          })
          .eq('store_id', body.storeId);
        console.log('[Gemini] Credit deduct result:', { error: deductError, subDeduct, topupDeduct });

        const newTotal = totalCredits - creditCost;
        console.log('[Gemini] New total credits:', newTotal);
        const { error: txError } = await sb.from('studio_credit_transactions').insert({
          store_id: body.storeId,
          type: 'consumption',
          amount: -creditCost,
          balance_after: newTotal,
          description: creditCost === 2 ? 'AIスタジオ画像生成 (4K)' : 'AIスタジオ画像生成',
        });
        if (txError) console.error('[Gemini] Credit transaction insert error:', txError);
      }
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        success: true,
        images: ['/placeholder-generated-1.jpg', '/placeholder-generated-2.jpg'],
        prompt: 'mock',
        mock: true,
      });
    }

    // Build image parts for Gemini API (inline_data format for REST API)
    const imageParts: any[] = [];

    for (const img of firstGarmentImages) {
      const imageData = extractBase64(img);
      if (imageData) {
        imageParts.push({ inline_data: { mime_type: imageData.mimeType, data: imageData.data } });
      }
    }

    if (body.modelImage) {
      const modelImageData = extractBase64(body.modelImage);
      if (modelImageData) {
        imageParts.push({ inline_data: { mime_type: modelImageData.mimeType, data: modelImageData.data } });
      }
    }

    for (const img of secondGarmentImages) {
      const imageData = extractBase64(img);
      if (imageData) {
        imageParts.push({ inline_data: { mime_type: imageData.mimeType, data: imageData.data } });
      }
    }

    for (const img of thirdGarmentImages) {
      const imageData = extractBase64(img);
      if (imageData) {
        imageParts.push({ inline_data: { mime_type: imageData.mimeType, data: imageData.data } });
      }
    }

    for (const img of fourthGarmentImages) {
      const imageData = extractBase64(img);
      if (imageData) {
        imageParts.push({ inline_data: { mime_type: imageData.mimeType, data: imageData.data } });
      }
    }

    for (const img of fifthGarmentImages) {
      const imageData = extractBase64(img);
      if (imageData) {
        imageParts.push({ inline_data: { mime_type: imageData.mimeType, data: imageData.data } });
      }
    }

    // Prompt variants for retry
    const promptVariants = [
      buildPrompt(body, firstGarmentImages.length, secondGarmentImages.length, thirdGarmentImages.length, fourthGarmentImages.length, fifthGarmentImages.length),
      buildSimplifiedPrompt(body, firstGarmentImages.length, secondGarmentImages.length, thirdGarmentImages.length, fourthGarmentImages.length, fifthGarmentImages.length),
      buildMinimalPrompt(body),
    ];

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const prompt = promptVariants[attempt] || promptVariants[promptVariants.length - 1];
        console.log(`[Freestyle] Attempt ${attempt + 1}/${MAX_RETRIES} using ${GEMINI_MODEL}, aspectRatio=${body.aspectRatio}, resolution=${body.resolution || '1K'}`);
        if (body.customPrompt) console.log(`[Freestyle] customPrompt: "${body.customPrompt}"`);

        const parts = [{ text: prompt }, ...imageParts];
        const data = await callGeminiAPI(parts, body.aspectRatio, body.resolution || '1K');

        const candidates = data.candidates || [];
        const finishReason = candidates[0]?.finishReason;
        const firstPart = candidates[0]?.content?.parts?.[0];
        console.log(`[Freestyle Debug] Attempt ${attempt + 1} - finishReason: ${finishReason}, parts: ${candidates[0]?.content?.parts?.length || 0}`);
        console.log(`[Freestyle Debug] First part keys:`, firstPart ? Object.keys(firstPart) : 'none');
        if (firstPart?.text) console.log(`[Freestyle Debug] Text:`, firstPart.text.substring(0, 200));
        if (firstPart?.inlineData) console.log(`[Freestyle Debug] Has inlineData (camelCase)`);
        if (firstPart?.inline_data) console.log(`[Freestyle Debug] Has inline_data (snake_case)`);

        if (finishReason === 'IMAGE_PROHIBITED_CONTENT') {
          console.log(`[Freestyle] Content filter on attempt ${attempt + 1}, ${attempt + 1 < MAX_RETRIES ? 'retrying...' : 'no more retries'}`);
          lastError = new Error(`IMAGE_PROHIBITED_CONTENT on attempt ${attempt + 1}`);
          if (attempt + 1 < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 1000));
          }
          continue;
        }

        // Extract generated images
        const images: string[] = [];
        for (const candidate of candidates) {
          const responseParts = candidate.content?.parts || [];
          for (const part of responseParts) {
            if (part.text) {
              console.log('[Freestyle Debug] Text response:', part.text);
            }
            const inlineData = part.inline_data || part.inlineData;
            if (inlineData?.data) {
              const base64 = inlineData.data;
              const mimeType = inlineData.mime_type || inlineData.mimeType || 'image/png';
              console.log(`[Freestyle] Success on attempt ${attempt + 1}, mimeType: ${mimeType}, size: ${base64.length}`);
              images.push(`data:${mimeType};base64,${base64}`);
            }
          }
        }

        if (images.length === 0) {
          lastError = new Error(`No image in response. finishReason=${finishReason}`);
          console.log(`[Freestyle] No image on attempt ${attempt + 1}, ${attempt + 1 < MAX_RETRIES ? 'retrying...' : 'no more retries'}`);
          if (attempt + 1 < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 1000));
          }
          continue;
        }

        // Add credit watermark for consumer requests (not studio/admin)
        const isConsumerRequest = !!(body.lineUserId || body.customerId);
        if (isConsumerRequest && body.storeId && images[0]) {
          try {
            const wmSupabase = createServerClient();
            let storeName = 'SHOP';
            if (wmSupabase) {
              const { data: storeData } = await wmSupabase
                .from('stores')
                .select('name')
                .eq('id', body.storeId)
                .single();
              if (storeData?.name) storeName = storeData.name;
            }
            const rawBase64 = images[0].replace(/^data:image\/\w+;base64,/, '');
            const rawBuffer = Buffer.from(rawBase64, 'base64');
            const watermarked = await addCreditWatermark(rawBuffer, storeName);
            images[0] = `data:image/png;base64,${watermarked.toString('base64')}`;
            console.log('[Gemini] Watermark added for consumer request, store:', storeName);
          } catch (wmError) {
            console.error('[Gemini] Watermark error (continuing without):', wmError);
          }
        }

        // Save to Supabase Storage
        let savedImageUrl: string | null = null;
        try {
          const supabase = createServerClient();
          console.log('[Gemini] Save: supabase client:', !!supabase, 'has image:', !!images[0], 'storeId:', body.storeId || 'NONE');
          if (supabase && images[0]) {
            const base64Data = images[0].replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            const filename = `gemini-${Date.now()}.png`;

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('gemini-results')
              .upload(filename, imageBuffer, {
                contentType: 'image/png',
                upsert: false,
              });

            if (!uploadError && uploadData) {
              const { data: urlData } = supabase.storage
                .from('gemini-results')
                .getPublicUrl(filename);

              savedImageUrl = urlData.publicUrl;

              const garmentCount = 1 + (secondGarmentImages.length > 0 ? 1 : 0) + (thirdGarmentImages.length > 0 ? 1 : 0) + (fourthGarmentImages.length > 0 ? 1 : 0) + (fifthGarmentImages.length > 0 ? 1 : 0);

              // Determine source: customer (has lineUserId/customerId) vs studio (admin)
              const source = (body.lineUserId || body.customerId) ? 'customer' : 'studio';

              const insertPayload: Record<string, unknown> = {
                  image_url: savedImageUrl,
                  storage_path: filename,
                  garment_count: garmentCount,
                  product_ids: body.productIds || [],
                  expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                  source,
                  ...(body.storeId ? { store_id: body.storeId } : {}),
                };
              console.log('[Gemini] Inserting gemini_results:', JSON.stringify(insertPayload));
              const { error: insertError } = await supabase
                .from('gemini_results')
                .insert(insertPayload);

              if (insertError) {
                console.error('[Gemini] gemini_results insert error:', insertError);
              } else {
                console.log('[Gemini] Saved Gemini result to storage:', savedImageUrl);
              }
            }
          }
        } catch (storageError) {
          console.error('Storage save error:', storageError);
        }

        return NextResponse.json({
          success: true,
          images,
          prompt,
          savedImageUrl,
        });
      } catch (error) {
        console.error(`[Freestyle] Attempt ${attempt + 1} error:`, error);
        lastError = error as Error;
      }
    }

    return NextResponse.json({
      success: false,
      error: `Generation failed after ${MAX_RETRIES} attempts: ${lastError?.message}`,
      images: [],
    });
  } catch (error) {
    console.error('Gemini image generation error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed',
      images: [],
    });
  }
}

function buildPrompt(body: RequestBody, firstImageCount: number = 1, secondImageCount: number = 0, thirdImageCount: number = 0, fourthImageCount: number = 0, fifthImageCount: number = 0): string {
  const { modelSettings, modelImage, garmentSize, garmentSizeSpecs, vtonBase, background, customPrompt, locale } = body;

  let sizeDescription = '';
  if (garmentSizeSpecs && garmentSizeSpecs.rows.length > 0) {
    const mRow = garmentSizeSpecs.rows.find(r => r.size === 'M') || garmentSizeSpecs.rows[0];
    const sizeDetails = Object.entries(mRow.values)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}: ${v}cm`)
      .join(', ');
    if (sizeDetails) {
      sizeDescription = locale === 'ja'
        ? `この服のサイズ${mRow.size}は ${sizeDetails} です。`
        : `This garment in size ${mRow.size} has measurements: ${sizeDetails}.`;
    }
  }

  let fitDescription = '';
  if (garmentSize?.length && modelSettings.height) {
    const lengthRatio = garmentSize.length / modelSettings.height;
    if (lengthRatio > 0.5) {
      fitDescription = locale === 'ja' ? '着丈が長めでヒップ下まで届く丈感' : 'longer length reaching below hip';
    } else if (lengthRatio > 0.4) {
      fitDescription = locale === 'ja' ? 'ウエスト周りの標準的な丈感' : 'standard length around waist';
    } else {
      fitDescription = locale === 'ja' ? 'クロップド丈のショート丈感' : 'cropped short length';
    }
  }

  let garmentDesc: string;
  if (vtonBase) {
    garmentDesc = `keeping their existing outfit exactly as shown in the base image`;
  } else {
    const firstImgRef = firstImageCount > 1
      ? `the first ${firstImageCount} provided images (showing different angles/details of the same garment)`
      : `the first provided image`;
    garmentDesc = `wearing EXACTLY the garment shown in ${firstImgRef}`;
  }

  const secondImgRef = secondImageCount > 1
    ? `the next ${secondImageCount} images (showing different angles)`
    : `the next garment image`;
  const secondGarmentDesc = secondImageCount > 0
    ? ` and also wearing the item from ${secondImgRef}`
    : '';

  const thirdImgRef = thirdImageCount > 1
    ? `the following ${thirdImageCount} images`
    : `the following garment image`;
  const thirdGarmentDesc = thirdImageCount > 0
    ? ` and wearing the shoes/accessories from ${thirdImgRef}`
    : '';

  const fourthImgRef = fourthImageCount > 1
    ? `the next ${fourthImageCount} images`
    : `the next accessory image`;
  const fourthGarmentDesc = fourthImageCount > 0
    ? ` and carrying/wearing the bag/accessory from ${fourthImgRef}`
    : '';

  const fifthImgRef = fifthImageCount > 1
    ? `the next ${fifthImageCount} images`
    : `the next accessory image`;
  const fifthGarmentDesc = fifthImageCount > 0
    ? ` and also wearing/using the accessory (hat, scarf, stole, etc.) from ${fifthImgRef}`
    : '';

  let modelDescription: string;
  if (vtonBase && modelImage) {
    modelDescription = `IMPORTANT: The first image shows a model ALREADY WEARING an outfit. Keep the model's appearance (face, body, pose) and their EXISTING CLOTHING exactly as shown. ADD the new garment items from the following reference images to complete the outfit.`;
  } else if (modelImage) {
    modelDescription = `Generate an image using the EXACT model appearance from the provided model reference image (face, body type, skin tone must match exactly)`;
  } else {
    modelDescription = `A ${ethnicityDescriptions[modelSettings.ethnicity] || modelSettings.ethnicity} ${modelSettings.gender === 'female' ? 'woman' : 'man'}`;
  }

  const multiImageNote = firstImageCount > 1 || secondImageCount > 1 || thirdImageCount > 1 || fourthImageCount > 1 || fifthImageCount > 1
    ? `MULTIPLE REFERENCE IMAGES: When multiple images are provided for a garment, use ALL of them to understand the garment's complete details from different angles. Combine information from all reference images to ensure maximum accuracy.`
    : '';

  const vtonBaseNote = vtonBase
    ? `VTON BASE MODE: The model is already wearing clothing in the base image. DO NOT change their existing outfit. Only ADD the new items (pants/shoes) to what they're already wearing.`
    : '';

  // Tuck style instruction
  const tuckStyle = modelSettings.tuckStyle || 'auto';
  let tuckInstruction = '';
  if (tuckStyle === 'tuck-out') {
    tuckInstruction = 'MANDATORY STYLING RULE: The top/shirt MUST be worn UNTUCKED — the hem hangs freely OUTSIDE the pants/skirt. Do NOT tuck the top into the bottoms under any circumstances.';
  } else if (tuckStyle === 'tuck-in') {
    tuckInstruction = 'MANDATORY STYLING RULE: The top/shirt MUST be fully TUCKED IN to the pants/skirt. The entire hem of the top must be neatly inserted inside the waistband.';
  } else if (tuckStyle === 'french-tuck') {
    tuckInstruction = 'MANDATORY STYLING RULE: The top/shirt MUST be styled with a FRENCH TUCK — only the front center portion of the hem is loosely tucked into the waistband, while the sides and back hang freely untucked.';
  }

  const parts = [
    `CRITICAL INSTRUCTION - GARMENT FIDELITY IS THE TOP PRIORITY:`,
    `You MUST reproduce the EXACT garments from the provided reference images with 100% accuracy.`,
    `DO NOT create similar-looking alternatives. The garments must be PIXEL-PERFECT matches to the originals.`,
    multiImageNote,
    vtonBaseNote,
    tuckInstruction,
    ``,
    `GARMENT DETAILS TO PRESERVE EXACTLY:`,
    `- Exact color and shade (no color shifts)`,
    `- Exact pattern, print, or texture`,
    `- Exact neckline shape and style`,
    `- Exact sleeve length, cuff style, and details`,
    `- Exact buttons, zippers, pockets, seams, and all design elements`,
    `- Exact fabric drape and material appearance`,
    `- Exact silhouette and fit`,
    ``,
    `Professional high-end fashion photography.`,
    modelDescription,
    `who is ${modelSettings.height}cm tall,`,
    modelSettings.pose ? `${poseDescriptions[modelSettings.pose] || modelSettings.pose},` : '',
    garmentDesc + secondGarmentDesc + thirdGarmentDesc + fourthGarmentDesc + fifthGarmentDesc + '.',
    customPrompt ? `MANDATORY STYLING (DO NOT IGNORE): ${customPrompt}. This styling instruction overrides any default assumptions about how the garment is worn, the background, and the setting.` : '',
    sizeDescription,
    fitDescription ? `The garment appears with ${fitDescription}.` : '',
    // Skip background description when a detailed custom prompt provides its own scene
    customPrompt && customPrompt.length > 100 ? '' : `${backgroundDescriptions[background] || background}.`,
    `Sharp focus, editorial fashion magazine quality, ultra high resolution 8K.`,
    `Extremely detailed, photorealistic rendering with fine texture details.`,
    `Realistic skin texture, natural pose, professional model.`,
    `IMPORTANT: Show the full body including feet if shoes/footwear are included.`,
    `IMPORTANT: The model must ALWAYS stand on dry ground. Never place the model inside water, puddles, or wet surfaces. For beach, lake, river, or ocean scenes, the model must stand on dry shore, sand, rocks, or a pier — never wading or stepping into the water.`,
    `CRITICAL: DO NOT render any text, labels, watermarks, or words on the image. The output must be a clean photograph with no text overlays.`,
    `OUTPUT FORMAT: Generate the image in ${body.aspectRatio} aspect ratio.`,
    `REMINDER: The garments MUST be exact copies from the reference images - not interpretations or similar items.`,
  ];

  return parts.filter(Boolean).join(' ');
}

function getTuckNote(tuckStyle?: string): string {
  if (tuckStyle === 'tuck-out') return ' The top MUST be UNTUCKED — hem hanging freely outside the pants.';
  if (tuckStyle === 'tuck-in') return ' The top MUST be fully TUCKED IN to the pants.';
  if (tuckStyle === 'french-tuck') return ' The top MUST have a FRENCH TUCK — front tucked in, sides and back untucked.';
  return '';
}

function buildSimplifiedPrompt(body: RequestBody, firstImageCount: number, secondImageCount: number, thirdImageCount: number, fourthImageCount: number = 0, fifthImageCount: number = 0): string {
  const { modelSettings, modelImage, vtonBase, background, customPrompt } = body;
  const gender = modelSettings.gender === 'female' ? 'woman' : 'man';
  const ethnicity = ethnicityDescriptions[modelSettings.ethnicity] || modelSettings.ethnicity;

  let model = modelImage ? 'the model from the reference image' : `a ${ethnicity} ${gender}`;
  if (vtonBase) {
    model = 'the model keeping their existing outfit';
  }

  const tuckNote = getTuckNote(modelSettings.tuckStyle);
  const styleNote = customPrompt ? ` IMPORTANT STYLING: ${customPrompt}.` : '';
  const poseNote = modelSettings.pose ? `${poseDescriptions[modelSettings.pose] || modelSettings.pose}, ` : '';
  const bgNote = customPrompt && customPrompt.length > 100 ? '' : ` ${backgroundDescriptions[background] || background}.`;
  return `E-commerce fashion photography: ${model}, ${modelSettings.height}cm tall, ${poseNote}wearing the garment(s) from the provided reference images.${tuckNote}${styleNote}${bgNote} ${body.aspectRatio} aspect ratio. Full body shot, professional quality, no text or watermarks.`;
}

function buildMinimalPrompt(body: RequestBody): string {
  const { modelSettings, modelImage, background, customPrompt } = body;
  const gender = modelSettings.gender === 'female' ? 'woman' : 'man';

  const model = modelImage ? 'this person' : `a ${gender}`;
  const tuckNote = getTuckNote(modelSettings.tuckStyle);
  const styleNote = customPrompt ? ` ${customPrompt}.` : '';
  const bgNote = customPrompt && customPrompt.length > 100 ? '' : ` ${backgroundDescriptions[background] || 'White background'}.`;
  return `Fashion catalog photo: ${model} wearing the garment(s) from the reference images.${tuckNote}${styleNote}${bgNote} ${body.aspectRatio} aspect ratio. Full body, clean photo.`;
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import { checkAndDeductCredit } from '@/lib/billing/credit-check';
import { addCreditWatermark } from '@/lib/utils/image-watermark';
import sharp from 'sharp';

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
  outerStyle?: 'auto' | 'open' | 'closed';
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
  detailMode?: 'shoes' | 'shoes-wall' | 'face' | 'face-gaze' | 'face-profile' | 'upper-body' | 'upper-body-gaze' | 'upper-body-texture' | 'bag' | 'bag-detail';
  artistic?: boolean | string; // true/'A' = Scene A, 'B' = Scene B
  sceneVariant?: 'A' | 'B'; // Normal mode scene variant
  shotIndex?: number;
  totalShots?: number;
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
  japanese: 'ethnically ambiguous East Asian with subtle mixed-heritage features — not distinctly Japanese, Korean, or Chinese, but a unique blend that transcends any single nationality',
  'no-ethnic': 'ethnically ambiguous East Asian with subtle mixed-heritage features — not distinctly Japanese, Korean, or Chinese, but a unique blend that transcends any single nationality',
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

// Helper function to extract base64 data from data URL or fetch from URL
function extractBase64(dataUrl: string): { data: string; mimeType: string } | null {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return null;
}

// Convert URL to data URL by fetching server-side
async function resolveImageToBase64(input: string): Promise<string> {
  // Already a data URL
  if (input.startsWith('data:')) return input;

  // HTTP(S) URL — fetch server-side
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const res = await fetch(input);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${input}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  }

  return input;
}

// Resolve all images in an array from URLs to base64
async function resolveImages(images: string[]): Promise<string[]> {
  return Promise.all(images.map(resolveImageToBase64));
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

    // Support both single image and array format — resolve URLs to base64 server-side
    const firstGarmentImages = await resolveImages(body.garmentImages || (body.garmentImage ? [body.garmentImage] : []));
    const secondGarmentImages = await resolveImages(body.secondGarmentImages || (body.secondGarmentImage ? [body.secondGarmentImage] : []));
    const thirdGarmentImages = await resolveImages(body.thirdGarmentImages || (body.thirdGarmentImage ? [body.thirdGarmentImage] : []));
    const fourthGarmentImages = await resolveImages(body.fourthGarmentImages || (body.fourthGarmentImage ? [body.fourthGarmentImage] : []));
    const fifthGarmentImages = await resolveImages(body.fifthGarmentImages || (body.fifthGarmentImage ? [body.fifthGarmentImage] : []));

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
      const resolvedModelImage = await resolveImageToBase64(body.modelImage);
      const modelImageData = extractBase64(resolvedModelImage);
      if (modelImageData) {
        imageParts.push({ inline_data: { mime_type: modelImageData.mimeType, data: modelImageData.data } });

        // Generate face close-up crop from the full-body model image
        try {
          const imgBuffer = Buffer.from(modelImageData.data, 'base64');
          const metadata = await sharp(imgBuffer).metadata();
          if (metadata.width && metadata.height) {
            // Crop top 50% of the image (head + upper body area)
            const cropHeight = Math.round(metadata.height * 0.50);
            const faceCrop = await sharp(imgBuffer)
              .extract({ left: 0, top: 0, width: metadata.width, height: cropHeight })
              .resize({ width: 512, fit: 'inside' })
              .jpeg({ quality: 90 })
              .toBuffer();
            const faceCropBase64 = faceCrop.toString('base64');
            imageParts.push({ inline_data: { mime_type: 'image/jpeg', data: faceCropBase64 } });
          }
        } catch (cropErr) {
          console.error('[Gemini] Face crop failed (non-blocking):', cropErr);
        }
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
            const mimeMatch = images[0].match(/^data:(image\/\w+);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const ext = mimeType === 'image/png' ? 'png' : 'jpg';
            const base64Data = images[0].replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            const filename = `gemini-${Date.now()}.${ext}`;

            const { data: uploadData, error: uploadError } = await storage
              .from('gemini-results')
              .upload(filename, imageBuffer, {
                contentType: mimeType,
                upsert: false,
              });

            if (!uploadError && uploadData) {
              const { data: urlData } = storage
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

/**
 * Detect if customPrompt is a full creative prompt (not just keywords).
 * Japanese: 80+ chars → full prompt mode (detailed scene descriptions)
 * English: 150+ chars → full prompt mode (1-2 sentences = full scene)
 */
function isFullPromptMode(prompt: string, locale?: string): boolean {
  if (!prompt) return false;
  // Detect Japanese content by checking for CJK characters
  const hasJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(prompt);
  const threshold = (locale === 'ja' || hasJapanese) ? 80 : 150;
  return prompt.length >= threshold;
}

function buildPrompt(body: RequestBody, firstImageCount: number = 1, secondImageCount: number = 0, thirdImageCount: number = 0, fourthImageCount: number = 0, fifthImageCount: number = 0): string {
  const { modelSettings, modelImage, garmentSize, garmentSizeSpecs, vtonBase, background, customPrompt, locale, detailMode } = body;

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
    modelDescription = `Generate an image using the EXACT model appearance from the provided model reference images. A full-body reference AND a face close-up crop are provided — use the close-up to ensure the face, facial features, expression, AND MAKEUP are reproduced with maximum accuracy and consistency across all shots. Face, body type, skin tone, and all visible cosmetics (eye makeup, lip color, brow shape, contour) must match exactly.`;
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
    tuckInstruction = 'MANDATORY STYLING RULE (INNER LAYER ONLY — applies to shirts, tops, blouses, NOT to jackets or coats): The top/shirt MUST be worn UNTUCKED — the hem hangs freely OUTSIDE the pants/skirt. Do NOT tuck the top into the bottoms under any circumstances. This rule does NOT apply to outer layers like jackets, coats, or blazers.';
  } else if (tuckStyle === 'tuck-in') {
    tuckInstruction = 'MANDATORY STYLING RULE (INNER LAYER ONLY — applies to shirts, tops, blouses, NOT to jackets or coats): The top/shirt MUST be fully TUCKED IN to the pants/skirt. The entire hem of the top must be neatly inserted inside the waistband. This rule does NOT apply to outer layers like jackets, coats, or blazers.';
  } else if (tuckStyle === 'french-tuck') {
    tuckInstruction = 'MANDATORY STYLING RULE (INNER LAYER ONLY — applies to shirts, tops, blouses, NOT to jackets or coats): The top/shirt MUST be styled with a FRENCH TUCK — only the front center portion of the hem is loosely tucked into the waistband, while the sides and back hang freely untucked. This rule does NOT apply to outer layers like jackets, coats, or blazers.';
  }

  // Outer (jacket/coat) front style instruction
  const outerStyle = modelSettings.outerStyle || 'auto';
  let outerInstruction = '';
  if (outerStyle === 'open') {
    outerInstruction = 'MANDATORY STYLING RULE: The jacket/coat/outer garment MUST be worn OPEN and UNBUTTONED — the front panels hang apart, fully revealing the garment underneath. Do NOT button, zip, or close the outer layer.';
  } else if (outerStyle === 'closed') {
    outerInstruction = 'MANDATORY STYLING RULE: The jacket/coat/outer garment MUST be worn CLOSED — fully buttoned, zipped, or fastened. The front must be neatly closed with no gap showing the garment underneath.';
  }

  // Detail mode: close-up editorial shots (shoes, face, upper body)
  if (detailMode) {
    const detailPrompts: Record<string, string> = {
      'shoes': `DETAIL SHOT — SHOES/FOOTWEAR CLOSE-UP:
Generate a cinematic close-up photograph of the model's feet and shoes.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Low-angle close-up focusing on the shoes/feet and lower legs (below knee). The shoes must be the EXACT ones from the reference images.
LIGHTING: Beautiful dappled light filtering through architecture or trees, casting artistic light patterns and shadows on the shoes. Golden hour warmth. The interplay of light and shadow should feel poetic and intentional.
MOOD: Emotional, luxurious, editorial — like a first-class brand campaign (Bottega Veneta, The Row, Celine level).
The ground texture (stone, cobblestone, marble, wood) should complement the shoes.
LENS: Shot on Canon TS-E 90mm f/2.8L Macro — tilt-shift creating a unique, selective focus plane at low angle. The shoes are razor-sharp with a distinctive miniature-like depth falloff that only tilt-shift can produce.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'shoes-wall': `DETAIL SHOT — SHOES/FOOTWEAR CLOSE-UP (WALL LEAN POSE):
Generate a cinematic close-up photograph of the model's feet and shoes.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Low-angle close-up focusing on the shoes/feet and lower legs (below knee). The shoes must be the EXACT ones from the reference images.
POSE: The model stands on one foot with the other foot raised and pressing its sole flat against a wall behind — a casual, effortlessly cool editorial pose. The weight-bearing foot is sharp and in focus. The wall-pressed foot can be slightly out of focus with shallow depth of field, creating a natural bokeh effect. The pose should feel relaxed, nonchalant, and edgy — like a model leaning against a wall between takes.
LIGHTING: Beautiful dappled light filtering through architecture or trees, casting artistic light patterns and shadows on the shoes. Golden hour warmth.
MOOD: Effortlessly cool, editorial, slightly rebellious — like a street-style campaign shot.
LENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — the legendary bokeh renders the wall-pressed foot and background into a dreamy, painterly blur while the weight-bearing foot and shoe remain impossibly sharp. Colors in the out-of-focus areas bleed and swirl organically.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'face': `DETAIL SHOT — FACE/PORTRAIT CLOSE-UP:
Generate a cinematic close-up portrait of the model.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Tight close-up from chest/shoulders up, focusing on the face. Show enough of the garment neckline/collar to establish what they're wearing.
EXPRESSION: Confident, magnetic, slightly contemplative — looking away from camera (three-quarter profile or gazing into distance). NOT looking at camera. Natural, unforced.
LIGHTING: Soft, cinematic light wrapping around the face. Subtle rim light or backlight creating depth. Warm skin tones with beautiful shadow play.
MOOD: Intimate, editorial, emotionally resonant — like a Vogue portrait or perfume campaign.
LENS: Shot on Zeiss Otus 85mm f/1.4 — clinically sharp on the subject with refined, dignified bokeh. The background falls away naturally and elegantly without being overly dramatic. Skin texture is rendered with extraordinary detail and clarity.
Hair should be natural and undisturbed.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'face-gaze': `DETAIL SHOT — FACE/PORTRAIT CLOSE-UP (DIRECT GAZE):
Generate a cinematic close-up portrait of the model.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Tight close-up from chest/shoulders up, focusing on the face. Show enough of the garment neckline/collar to establish what they're wearing.
EXPRESSION: MUST look directly into the camera with a strong, dignified, unwavering gaze. Poised and commanding — not smiling, not cold, but quietly powerful. The kind of look that stops you mid-scroll. Chin slightly lifted, eyes sharp and clear.
LIGHTING: Soft, cinematic light wrapping around the face. Subtle rim light or backlight creating depth. Warm skin tones with beautiful shadow play.
MOOD: Powerful, editorial, captivating — the hero portrait of the story. Like a luxury brand campaign key visual.
LENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — the legendary wide-open rendering. The model's face and eyes are razor-sharp, but the background melts into a beautiful, creamy bokeh where colors blend and bleed into each other like watercolor. The out-of-focus background colors (greens, golds, stone tones, sky) create a painterly, dreamy wash of color that frames the subject. The Noctilux's signature organic bokeh swirl is visible in the transition zone.
Hair should be natural and undisturbed.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'upper-body': `DETAIL SHOT — UPPER BODY CLOSE-UP:
Generate a cinematic upper-body photograph of the model from waist up.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Medium close-up from waist/hip up, showing garment details — texture, drape, buttons, seams, fabric movement. The garment must be the EXACT one from reference images.
The model's hands may rest naturally at sides, in pockets, or holding an accessory. No hair touching.
LIGHTING: Beautiful directional light emphasizing fabric texture and garment construction details. Architectural light, window light, or dappled natural light creating depth and dimension on the clothing surface.
MOOD: Luxurious, tactile, editorial — you can almost feel the fabric. Like a high-end lookbook detail shot.
LENS: Shot on Fujifilm GF 110mm f/2 (medium format) — the larger sensor produces a distinctive three-dimensional separation between subject and background. Fabric texture is rendered with extraordinary resolution and tonal depth. The background falls off gradually with a smooth, medium-format bokeh quality that feels expansive and airy.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'upper-body-gaze': `DETAIL SHOT — UPPER BODY CLOSE-UP (DIRECT GAZE):
Generate a cinematic upper-body photograph of the model from waist up.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Medium close-up from waist/hip up, showing garment details — texture, drape, buttons, seams, fabric movement. The garment must be the EXACT one from reference images.
EXPRESSION: MUST look directly into the camera with a strong, dignified, unwavering gaze. Quietly powerful and commanding. Chin slightly lifted.
The model's hands may rest naturally at sides, in pockets, or holding an accessory. No hair touching.
LIGHTING: Beautiful directional light emphasizing fabric texture and garment construction details. Architectural light, window light, or dappled natural light creating depth and dimension on the clothing surface.
MOOD: Powerful, editorial, captivating — like a luxury campaign hero shot.
LENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — the legendary wide-open rendering. The model and garment details are razor-sharp, but the background dissolves into rich, creamy bokeh where colors blend and bleed into each other like watercolor. The out-of-focus background creates a painterly wash of ambient color (architecture tones, foliage, sky) with the Noctilux's signature organic bokeh swirl in the transition zone.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      // ── Detail B variants ──

      'bag': `DETAIL SHOT — BAG/ACCESSORY CLOSE-UP:
Generate a cinematic close-up photograph focusing on the bag or accessory the model is carrying.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Close-up from waist down to mid-thigh, with the bag as the hero of the shot. The model's hand holding the bag should be visible. Show enough of the garment to establish the outfit context. The bag must be the EXACT one from the reference images.
LIGHTING: Beautiful directional light that reveals the bag's material texture — leather grain, hardware gloss, stitching details. Warm, luxurious light that makes the materials look rich and tactile.
MOOD: Luxurious, covetable, editorial — like a Bottega Veneta or Hermès accessory campaign. The bag should feel like the most important object in the frame.
LENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary material texture rendering with smooth, airy bokeh behind.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'bag-detail': `DETAIL SHOT — BAG/ACCESSORY EXTREME CLOSE-UP:
Generate a cinematic extreme close-up of the bag or accessory.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Tight crop on the bag — show hardware, clasp, zipper pull, or logo area. The model's hand grips or rests on the bag naturally. Only the hand, part of the arm, and the garment fabric near the bag are visible. This is about the object's craftsmanship and materiality.
POSE: The model holds the bag casually at their side, or the bag rests on a surface (ledge, step) with the model's hand draped over it. One hand may be in a pocket while the other holds the bag — effortless, natural grip.
LIGHTING: Raking sidelight that accentuates texture — every stitch, grain, and hardware edge catches the light. Shallow depth of field with the clasp or front face razor-sharp.
LENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — the bag hardware and texture are impossibly sharp while everything else dissolves into painterly bokeh.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'face-profile': `DETAIL SHOT — FACE/PORTRAIT (PROFILE):
Generate a cinematic profile portrait of the model.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: True PROFILE or strong three-quarter view — the model faces screen-left or screen-right, NOT toward camera. Show the jawline, cheekbone, and silhouette of the face against the background. Include the neck and upper garment neckline/collar.
EXPRESSION: Serene, contemplative, looking into the distance. Completely absorbed in thought — the camera is invisible to them. Lips slightly parted or closed naturally.
LIGHTING: Strong rim light or backlight outlining the profile. The face is lit by soft reflected fill, creating a beautiful gradient across the cheek. The profile edge is luminous against a darker or blurred background.
LENS: Shot on Zeiss Otus 85mm f/1.4 — clinical sharpness on the profile edge with elegant, dignified background separation. Every skin texture detail is rendered with extraordinary clarity.
Hair should be natural and undisturbed.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'upper-body-texture': `DETAIL SHOT — UPPER BODY (FABRIC TEXTURE FOCUS):
Generate a cinematic upper-body photograph emphasizing garment texture and construction.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Medium close-up from waist up, slightly angled to show fabric drape and garment construction in three dimensions. NOT straight-on — a 3/4 body angle reveals how the garment wraps and falls. The garment must be the EXACT one from reference images.
EXPRESSION: Looking slightly away from camera (three-quarter profile). NOT looking at camera. Calm, disengaged, statuesque.
The model's hands may rest naturally, one hand holding a bag or accessory if included. No hair touching.
LIGHTING: Raking sidelight that sculpts every fold, seam, and texture of the fabric surface. The light should create visible texture on the garment — you should almost feel the material. Window light or architectural sidelight is ideal.
LENS: Shot on Hasselblad XCD 80mm f/1.9 (medium format) — the larger sensor captures micro-texture details in the fabric that smaller formats miss. Tonal gradation in the fabric folds is extraordinarily smooth and rich.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,
    };

    return detailPrompts[detailMode] || detailPrompts['upper-body'];
  }

  const parts = [
    `CRITICAL INSTRUCTION - GARMENT FIDELITY IS THE TOP PRIORITY:`,
    `You MUST reproduce the EXACT garments from the provided reference images with 100% accuracy.`,
    `DO NOT create similar-looking alternatives. The garments must be PIXEL-PERFECT matches to the originals.`,
    multiImageNote,
    vtonBaseNote,
    tuckInstruction,
    outerInstruction,
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
    customPrompt && isFullPromptMode(customPrompt, locale)
      ? `SCENE & STYLING DIRECTION (THIS IS THE PRIMARY CREATIVE BRIEF — follow it faithfully): ${customPrompt}`
      : customPrompt ? `MANDATORY STYLING (DO NOT IGNORE): ${customPrompt}. This styling instruction overrides any default assumptions about how the garment is worn, the background, and the setting.` : '',
    sizeDescription,
    fitDescription ? `The garment appears with ${fitDescription}.` : '',
    // Skip background description when custom prompt is a full scene prompt
    customPrompt && isFullPromptMode(customPrompt, locale) ? '' : `${backgroundDescriptions[background] || background}.`,
    `Sharp focus, editorial fashion magazine quality, ultra high resolution 8K.`,
    `Extremely detailed, photorealistic rendering with fine texture details.`,
    `Realistic skin texture, natural pose, professional model.`,
    `EXPRESSION: Emotionless, eternal beauty — a face that reveals nothing, like a sculpture. No smile, no warmth, no sadness. Perfectly composed, untouchable, timeless. The gaze is calm and vacant, as if the model exists outside of time.`,
    `IMPORTANT: Show the full body including feet if shoes/footwear are included.`,
    `IMPORTANT: The model must ALWAYS stand on dry ground. Never place the model inside water, puddles, or wet surfaces. For beach, lake, river, or ocean scenes, the model must stand on dry shore, sand, rocks, or a pier — never wading or stepping into the water.`,
    `CRITICAL: DO NOT render any text, labels, watermarks, or words on the image. The output must be a clean photograph with no text overlays.`,
    `OUTPUT FORMAT: Generate the image in ${body.aspectRatio} aspect ratio.`,
    `REMINDER: The garments MUST be exact copies from the reference images - not interpretations or similar items.`,
    // Normal mode Scene B: varied compositions and balanced walking directions
    ...(body.sceneVariant === 'B' && !body.artistic ? [(() => {
      const normalBShots = [
        // Shot 1: walking LEFT, wide establishing
        `COMPOSITION OVERRIDE: The model walks toward the LEFT side of the frame (screen-left direction). Wide shot establishing the full environment — the architecture/scene occupies 60% of the frame with the model at roughly one-third position. Walking motion is mid-stride with natural arm swing. The environment should feel expansive and cinematic.`,

        // Shot 2: static, leaning/resting pose
        `COMPOSITION OVERRIDE: The model is NOT walking — instead, standing still with weight shifted to one hip, or leaning lightly against a wall/column/railing. One hand may rest in a pocket or on the hip. Relaxed, effortless posture. Frame the shot as a medium-full body with the model slightly off-center. The pose should feel candid, as if caught between moments.`,

        // Shot 3: walking RIGHT, medium shot
        `COMPOSITION OVERRIDE: The model walks toward the RIGHT side of the frame (screen-right direction). Medium shot from roughly knee-up, capturing garment movement and stride. The walking direction and framing should feel like a counterbalance to any previous left-walking shots. Natural mid-stride pose with fabric in motion.`,

        // Shot 4: looking back over shoulder
        `COMPOSITION OVERRIDE: The model has just walked past the camera and LOOKS BACK over their shoulder. The body faces away (3/4 back view) while the head turns back toward the camera. This reveals the back construction of the garment while maintaining face visibility. Slight contrapposto stance. The "looking back" gesture should feel spontaneous, not posed.`,

        // Shot 5: from below, power angle
        `COMPOSITION OVERRIDE: LOW ANGLE shot — camera positioned below eye level, looking slightly upward at the model. This creates a powerful, commanding presence. The model stands tall and statuesque, with the sky or upper architecture visible behind. The low angle elongates the legs and emphasizes the garment's silhouette. Full body visible with dramatic perspective.`,

        // Shot 6: walking toward camera
        `COMPOSITION OVERRIDE: The model walks DIRECTLY TOWARD the camera — a classic runway-style approach. The model's gaze is straight ahead (not necessarily at camera). The body faces the camera head-on, garment movement visible in the stride. Slight natural sway. The background recedes behind the approaching figure, creating depth through motion.`,
      ];
      const idx = typeof body.shotIndex === 'number' ? body.shotIndex % normalBShots.length : 0;
      return normalBShots[idx];
    })()] : []),
    // Artistic mode: signature lens + optimized scene direction per shot
    ...(body.artistic ? [(() => {
      const sceneVariant = typeof body.artistic === 'string' ? body.artistic : 'A';

      const sceneA = [
        // Shot 1: Noctilux — golden hour backlight, bokeh swirl
        `ARTISTIC DIRECTION: Shot on Leica Noctilux-M 50mm f/0.95 ASPH wide open.
SCENE OVERRIDE: Position the model with strong BACKLIGHT — golden hour sun directly behind, creating a luminous rim light around hair and shoulders. The background should contain warm-toned architecture or foliage that dissolves into the Noctilux's legendary swirling bokeh. Colors bleed and merge organically like watercolor. Any specular highlights in the background become soft, glowing orbs. The model is razor-sharp against this painterly dissolution of color.
LIGHTING: Strong backlight/rim light with soft fill from reflected surfaces. Lens flare is welcome and adds to the dreamy atmosphere.`,

        // Shot 2: Canon DS — evening city lights, perfect round bokeh
        `ARTISTIC DIRECTION: Shot on Canon RF 85mm f/1.2L USM DS (Defocus Smoothing).
SCENE OVERRIDE: Evening or twilight setting with POINT LIGHT SOURCES in the background — street lamps, shop windows, warm interior lights, string lights, or city illumination. The DS coating transforms every light source into a perfectly smooth, round bokeh circle. The transition from sharp subject to blurred background is impossibly gradual. The model is lit by nearby warm light (window light, storefront glow), creating luminous, glowing skin.
LIGHTING: Warm practical light sources illuminating the model. Background peppered with beautiful circular bokeh from city/architectural lights.`,

        // Shot 3: Zeiss Otus — hard architectural light, 3D pop
        `ARTISTIC DIRECTION: Shot on Zeiss Otus 85mm f/1.4.
SCENE OVERRIDE: Strong DIRECTIONAL LIGHT cutting through architecture — a shaft of sunlight through a doorway, window, colonnade, or between buildings. The model stands partially in this dramatic light, creating bold light-and-shadow contrast across the body and garment. The Otus renders every fabric texture with extraordinary three-dimensional clarity. The background falls away with refined, dignified bokeh while the subject pops forward with an almost tangible depth.
LIGHTING: Hard directional sunlight creating dramatic chiaroscuro. One side of the model is brilliantly lit, the other falls into rich shadow.`,

        // Shot 4: Fujifilm GF medium format — dappled forest/garden light
        `ARTISTIC DIRECTION: Shot on Fujifilm GF 110mm f/2 (medium format).
SCENE OVERRIDE: The model stands in DAPPLED LIGHT filtering through trees, pergolas, or latticed architecture. Pools of warm light dance across the model and garment while the medium format sensor captures extraordinary tonal gradation in both highlights and shadows. The larger format creates an expansive, airy sense of depth — the model exists in three-dimensional space with the background gently receding. Leaves or architectural patterns create beautiful shadow play on the garment surface.
LIGHTING: Natural dappled sunlight through foliage or architectural elements. Rich tonal range from deep shadows to bright highlights.`,

        // Shot 5: Sigma 35mm — wide environmental, foreground bokeh
        `ARTISTIC DIRECTION: Shot on Sigma 35mm f/1.2 DG DN Art.
SCENE OVERRIDE: The wider focal length captures the model WITH their environment — shoot through FOREGROUND ELEMENTS (flowers, leaves, iron railings, glass, fabric) that blur into soft, colorful shapes in the near field. The f/1.2 aperture wraps both foreground and background blur around the subject, creating a cocoon of bokeh. The environmental context (architecture, street, garden) is visible but dreamy. The model occupies the sharp middle ground between two layers of beautiful blur.
LIGHTING: Natural light with the environment providing depth layers. Foreground elements catch light and become luminous blur shapes.`,

        // Shot 6: Nikon Noct — blue hour/twilight, ethereal floating
        `ARTISTIC DIRECTION: Shot on Nikon Nikkor Z 58mm f/0.95 S Noct.
SCENE OVERRIDE: BLUE HOUR or deep twilight setting — the sky holds the last traces of deep blue and amber. The model is lit by a single warm light source (a lamp, a doorway, reflected golden light) against the cool twilight background. At f/0.95, the depth of field is paper-thin — the model appears to float in an ethereal, dreamlike space. Any remaining ambient lights become impossibly smooth, large bokeh circles. The overall mood is contemplative, quiet, almost otherworldly.
LIGHTING: Single warm practical light against cool blue-hour ambient. The contrast between warm subject and cool background creates emotional depth.`,
      ];

      const sceneB = [
        // Shot 1: Hasselblad — wet cobblestone reflections
        `ARTISTIC DIRECTION: Shot on Hasselblad XCD 80mm f/1.9 (medium format).
SCENE OVERRIDE: RAIN-WASHED COBBLESTONE or stone pavement — the ground is wet and reflective, mirroring the model's silhouette, fragments of architecture, and ambient light in glossy puddle reflections. The medium format sensor captures extraordinary surface texture — every wet stone, every ripple in the puddle is rendered with tactile realism. The model stands on dry ground near the edge of a puddle, NOT in water. The wet surface adds a cinematic, moody quality.
LIGHTING: Overcast or post-rain diffused light with occasional breaks of warm sun reflecting off wet surfaces. The wet ground acts as a natural reflector, filling shadows from below.`,

        // Shot 2: Leica Summilux — architectural corridor depth
        `ARTISTIC DIRECTION: Shot on Leica Summilux-M 35mm f/1.4 ASPH FLE.
SCENE OVERRIDE: The model stands inside a DEEP ARCHITECTURAL CORRIDOR, archway, or colonnade — receding columns, arches, or walls create strong perspective lines that draw the eye toward the model. The architecture frames the model like a living painting. The Summilux's characteristic warm color rendering and smooth tonal transitions give the stone and plaster surfaces a richness that digital lenses often miss. Shoot slightly wide to capture the full depth of the corridor.
LIGHTING: Light enters from the far end or from side openings, creating a natural gradient from shadow to light along the corridor. The model is positioned at the threshold between light and shadow.`,

        // Shot 3: Canon RF Macro — graphic shadow stripes
        `ARTISTIC DIRECTION: Shot on Canon RF 100mm f/2.8L Macro IS USM.
SCENE OVERRIDE: Strong afternoon sun casts GRAPHIC SHADOW PATTERNS across the model — from window blinds, iron gates, lattice screens, palm fronds, or architectural elements. The shadow stripes or geometric patterns fall across the model's body and garment, creating a bold, graphic editorial composition. The macro lens resolves every thread in the fabric where light meets shadow with surgical precision. The contrast between illuminated and shadowed areas should be stark and dramatic.
LIGHTING: Hard, low-angle afternoon sunlight through a pattern-creating element. The shadows are sharp-edged and graphic, almost like body paint.`,

        // Shot 4: Voigtlander Nokton — warm wall lean
        `ARTISTIC DIRECTION: Shot on Voigtlander Nokton 50mm f/1.0 Aspherical.
SCENE OVERRIDE: The model leans casually against a WARM-TONED WALL — terracotta, ochre, aged plaster, or sun-baked stone. The late afternoon sun paints the wall in deep orange and gold. The Nokton wide open at f/1.0 renders the wall texture with a distinctive softness that wraps around the sharp subject — a unique vintage quality that modern lenses cannot replicate. The overall palette is warm: amber, honey, burnt sienna. The model's pose is relaxed, almost candid.
LIGHTING: Low, warm directional sunlight hitting the wall and model from the side. The wall itself becomes a giant warm reflector, wrapping the model in golden light.`,

        // Shot 5: Sony 135mm GM — layered botanical foreground
        `ARTISTIC DIRECTION: Shot on Sony FE 135mm f/1.8 GM.
SCENE OVERRIDE: Shoot THROUGH BOTANICAL FOREGROUND — branches, leaves, flowers, or dried grasses create a layered, painterly frame in the near field. The 135mm compression stacks these layers together, creating depth and intimacy. The foreground foliage is rendered as soft, translucent color washes by the f/1.8 aperture. Behind the model, the background is equally compressed and melted into smooth bokeh. The model exists in a narrow band of sharpness between two worlds of soft color.
LIGHTING: Natural backlight or sidelight filtering through the foliage, creating small lens flares and rim light on leaves. Dappled warm light on the model's face and garment.`,

        // Shot 6: Zeiss Batis — geometric stairs/levels
        `ARTISTIC DIRECTION: Shot on Zeiss Batis 40mm f/2 CF (Close Focus).
SCENE OVERRIDE: The model is positioned on ARCHITECTURAL STAIRS, stepped terraces, or multilevel surfaces — the geometric lines of the steps create strong diagonal and horizontal lines that structure the composition. The model may sit on a step, lean against a railing, or stand at a landing where lines converge. The Batis 40mm captures enough environment to establish the graphic, geometric quality of the location while maintaining a natural perspective. The architectural lines should dominate the composition, with the model as the human element that breaks the geometry.
LIGHTING: Even, diffused light (open shade or overcast) that reveals the full texture and geometry of the stone steps without harsh shadows. Subtle directional light to give the model dimension.`,
      ];

      const shots = sceneVariant === 'B' ? sceneB : sceneA;
      const idx = typeof body.shotIndex === 'number' ? body.shotIndex % shots.length : 0;
      return shots[idx];
    })()] : []),
  ];

  return parts.filter(Boolean).join(' ');
}

function getTuckNote(tuckStyle?: string): string {
  if (tuckStyle === 'tuck-out') return ' The inner top/shirt MUST be UNTUCKED (not jackets/coats).';
  if (tuckStyle === 'tuck-in') return ' The inner top/shirt MUST be fully TUCKED IN (not jackets/coats).';
  if (tuckStyle === 'french-tuck') return ' The inner top/shirt MUST have a FRENCH TUCK (not jackets/coats).';
  return '';
}

function getOuterNote(outerStyle?: string): string {
  if (outerStyle === 'open') return ' The jacket/coat MUST be worn OPEN, showing the garment underneath.';
  if (outerStyle === 'closed') return ' The jacket/coat MUST be worn CLOSED and buttoned/zipped.';
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
  const outerNote = getOuterNote(modelSettings.outerStyle);
  const fullPrompt = customPrompt && isFullPromptMode(customPrompt, body.locale);
  const styleNote = fullPrompt ? ` SCENE DIRECTION: ${customPrompt}.` : customPrompt ? ` IMPORTANT STYLING: ${customPrompt}.` : '';
  const poseNote = modelSettings.pose ? `${poseDescriptions[modelSettings.pose] || modelSettings.pose}, ` : '';
  const bgNote = fullPrompt ? '' : ` ${backgroundDescriptions[background] || background}.`;
  return `E-commerce fashion photography: ${model}, ${modelSettings.height}cm tall, ${poseNote}wearing the garment(s) from the provided reference images.${tuckNote}${outerNote}${styleNote}${bgNote} ${body.aspectRatio} aspect ratio. Full body shot, professional quality, no text or watermarks.`;
}

function buildMinimalPrompt(body: RequestBody): string {
  const { modelSettings, modelImage, background, customPrompt, locale } = body;
  const gender = modelSettings.gender === 'female' ? 'woman' : 'man';

  const model = modelImage ? 'this person' : `a ${gender}`;
  const tuckNote = getTuckNote(modelSettings.tuckStyle);
  const outerNote = getOuterNote(modelSettings.outerStyle);
  const fullPrompt = customPrompt && isFullPromptMode(customPrompt, locale);
  const styleNote = customPrompt ? ` ${customPrompt}.` : '';
  const bgNote = fullPrompt ? '' : ` ${backgroundDescriptions[background] || 'White background'}.`;
  return `Fashion catalog photo: ${model} wearing the garment(s) from the reference images.${tuckNote}${outerNote}${styleNote}${bgNote} ${body.aspectRatio} aspect ratio. Full body, clean photo.`;
}

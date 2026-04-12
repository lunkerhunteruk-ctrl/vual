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
  detailMode?: 'shoes' | 'shoes-wall' | 'face' | 'face-gaze' | 'face-profile' | 'face-glance-back' | 'face-diagonal' | 'face-upward' | 'upper-body' | 'upper-body-gaze' | 'upper-body-texture' | 'upper-body-side' | 'upper-body-upward' | 'upper-body-glance-back' | 'upper-body-hair-tuck' | 'bag' | 'bag-detail' | 'walk-side-full' | 'walk-side-lower' | 'lean-side' | 'bench-side';
  artistic?: boolean | string; // true/'A' = Scene A, 'B' = Scene B
  sceneVariant?: 'A' | 'B' | 'C'; // Normal mode scene variant
  offshot?: boolean; // Off-shot mode: private/behind-the-scenes
  offshotVariant?: 'A' | 'B'; // A = on-set BTS, B = after-party/dinner/nightlife
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
        const effectiveAR = body.offshot ? '3:4' : body.aspectRatio;
        const effectiveRes = body.offshot ? '1K' : (body.resolution || '1K');
        const data = await callGeminiAPI(parts, effectiveAR, effectiveRes);

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
              let base64 = inlineData.data;
              const mimeType = inlineData.mime_type || inlineData.mimeType || 'image/png';

              console.log(`[Freestyle] Success on attempt ${attempt + 1}, mimeType: ${mimeType}, size: ${base64.length}`);
              images.push(`data:image/png;base64,${base64}`);
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
  // Off-shot mode: private/behind-the-scenes snapshots with randomized actions
  if (body.offshot) {
    // Deterministic random based on shotIndex + timestamp seed
    const seed = (body.shotIndex || 0) * 7 + Math.floor(Date.now() / 60000);
    const pick = (arr: string[]) => arr[seed % arr.length];
    const offshotVariant = body.offshotVariant || 'A';

    const locationNote = customPrompt
      ? `LOCATION: ${customPrompt}`
      : `Setting: ${backgroundDescriptions[background] || background}`;

    // The user's customPrompt is used as the location/city name for offshot B
    const cityName = customPrompt || '';

    // Core off-shot directive — placed at top and bottom of prompt for maximum weight
    const offshotDirective = `CRITICAL INSTRUCTION: This is NOT a fashion photograph. This is a RAW, CANDID, BEHIND-THE-SCENES snapshot taken by a crew member with a film camera during downtime. The model is NOT posing, NOT performing, NOT aware of being photographed (or only just noticed). This must look like a REAL moment captured by accident — like a photo you'd find on a photographer's contact sheet that was never meant to be published.

ANTI-FASHION RULES:
- The model must NOT be centered perfectly in frame. Off-center composition, cut-off limbs, tilted horizon are OK and encouraged.
- NO perfect lighting setup. Use only available ambient light — overhead fluorescent, window light, practical lamps.
- The model's body language must be RELAXED and UNPOSED — slouching, leaning, curled up, mid-motion. Never standing straight with good posture like a fashion model.
- Background should show REAL environment clutter — cables, equipment cases, paper cups, chairs, bags, coats on hooks, etc.
- The overall feeling should be intimate, voyeuristic, unpolished — like a diary photo, NOT a magazine spread.`;

    const leica = 'Shot on Leica M6 with Summicron 35mm f/2, Kodak Portra 400 film. Handheld, slightly imperfect focus.';
    const qualityColor = 'QUALITY: Heavy film grain, slightly warm color cast, soft focus edges, natural available light only. The framing is deliberately imperfect — extra headroom, slight tilt, subject off-center. Looks like it was shot quickly without careful composition. 3:4 portrait format. No text, no watermarks.';
    const qualityGolden = 'QUALITY: Heavy film grain, golden late-afternoon light, slightly faded warm colors. Casual, imperfect composition with environmental context. 3:4 portrait format. No text, no watermarks.';

    const offshotCategories = [
      // Category 1: WAITING / DOWNTIME (before shoot)
      {
        actions: [
          'holding a paper coffee cup with both hands, steam rising faintly. She looks slightly sleepy, not yet "on" for the camera',
          'sitting cross-legged reading a worn paperback book, completely absorbed. The book cover is slightly bent from being in a bag',
          'wearing wired earphones, eyes closed, head tilted slightly, lost in music. One hand rests on her knee, the other holds her phone',
          'scrolling through her phone with one thumb, a faint private smile on her lips as she reads something — maybe a message from a friend',
          'staring out a window or into the empty distance, chin resting on her hand. Completely zoned out, mind somewhere else entirely',
          'warming her hands around a paper cup of tea, blowing gently on the surface. Her breath is faintly visible in the cool morning air',
          'sitting with legs stretched out, eating a pastry from a paper bag on her lap. A few crumbs on her shirt. Completely unglamorous and real',
        ],
        wardrobe: 'wearing casual clothes OR partially styled — maybe the garment from the reference images thrown over a plain t-shirt, not fully styled yet',
        location: `${locationNote} — this is the backstage/waiting area of this location.`,
        film: leica,
        quality: qualityColor,
        expression: 'Drowsy, private, unguarded — a real human moment before the mask goes on. NOT posing.',
      },
      // Category 2: GETTING READY
      {
        actions: [
          'checking herself in a small mirror, adjusting a collar with precise fingers',
          'applying lip balm from a small tube while looking at her phone camera as a mirror',
          'tying her shoes, crouched down, hair falling forward — a surprisingly vulnerable angle',
          'standing in front of a makeshift clothes rack, holding two options on hangers, comparing them with a slight frown',
          'having her hair touched up — a pair of hands (hair stylist) visible at the edge of frame arranging strands',
          'buttoning the cuff of her sleeve with focused attention, mouth slightly open in concentration',
        ],
        wardrobe: `${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc} — partially dressed, still getting ready`,
        location: `${locationNote} — nearby makeshift prep area.`,
        film: leica,
        quality: 'QUALITY: Film grain STRONG, warm tungsten color from practical lights, slightly underexposed, candid. Shallow depth of field. 3:4 portrait format. No text, no watermarks.',
        expression: 'Focused, self-contained, absorbed in the task. NOT looking at camera. Private concentration.',
      },
      // Category 3: IN TRANSIT / MOVEMENT
      {
        actions: [
          'walking through a corridor toward the shoot location, looking at her phone',
          'walking ahead of the camera, seen from behind, her silhouette framed by the architecture. Slightly motion-blurred',
          'climbing stairs, one hand on the railing, looking up toward the light at the top',
          'standing in a doorway between two spaces, half in shadow and half in light, about to step through',
          'walking while adjusting an earring, mid-stride, caught in a moment of multitasking',
        ],
        wardrobe: `${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}`,
        location: `${locationNote} — corridor or pathway.`,
        film: leica,
        quality: qualityColor,
        expression: 'Absent-minded, private. NOT performing. Just existing between moments.',
      },
      // Category 4: BREAK / REST
      {
        actions: [
          'leaning against a wall with eyes half-closed, drinking water from a plastic bottle',
          'sitting on stone steps, knees drawn up, arms wrapped around them, staring at nothing',
          'lying flat on her back on a bench or ledge, one arm over her eyes, completely surrendered to exhaustion',
          'sitting on the floor against a wall, legs stretched out, scrolling through photos from today on her phone',
          'perched on a windowsill, one leg dangling, looking out at the view with a quiet, private expression',
          'leaning forward with elbows on knees, both hands holding a water bottle, head slightly bowed — the weight of a long day',
          'sitting with a blanket or jacket draped over her shoulders like a shawl, hands hidden underneath, curled up',
        ],
        wardrobe: `${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc} — still in full wardrobe but posture completely relaxed`,
        location: `${locationNote} — quiet corner during a break.`,
        film: leica,
        quality: 'QUALITY: Film grain STRONG, available light, slightly overexposed highlights, warm. Casual framing — not centered, some negative space. 3:4 portrait format. No text, no watermarks.',
        expression: 'Tired but beautiful. The exhaustion showing through the perfect makeup. A moment of genuine rest.',
      },
      // Category 5: CAUGHT LOOKING / INTERACTION
      {
        actions: [
          'has just noticed the photographer taking a candid shot. She turns toward the camera with a look between "really?" and a suppressed smile',
          'glances sideways at the camera with one eyebrow slightly raised, a barely-there smirk — "I see you"',
          'covers her face partially with one hand, laughing silently — caught mid-laugh at something someone said off-camera',
          'looks directly into the lens with a deadpan expression, deliberately NOT smiling — a playful standoff with the photographer',
          'waves the camera away with a lazy hand gesture, half-smiling, clearly saying "enough photos" but not really meaning it',
          'peeks out from behind a pillar or doorframe, only half her face visible, one eye looking at camera with mock suspicion',
        ],
        wardrobe: `${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}`,
        location: `${locationNote}.`,
        film: leica,
        quality: 'QUALITY: Film grain STRONG, warm tones, slightly soft focus (shot quickly), natural light. The moment feels stolen. 3:4 portrait format. No text, no watermarks.',
        expression: 'A flicker of real personality. NOT a posed expression — genuine, spontaneous, human.',
      },
      // Category 6: AFTER THE SHOOT / WRAP
      {
        actions: [
          'scrolling her phone in the now-quiet location, completely off-duty. Equipment cases visible in background',
          'shoes kicked off beside her, sitting barefoot on the floor, texting someone with both thumbs',
          'walking away from camera toward the exit, silhouetted against the light outside. The day is done',
          'leaning on a railing or ledge, looking at the sunset or evening sky through a window, still in wardrobe but with the energy of "done"',
          'sitting in the back seat of a car, head tilted against the window, eyes heavy, wardrobe jacket draped over her like a blanket',
          'standing alone in the empty set, the last one there, looking around the space one final time before leaving',
        ],
        wardrobe: 'still wearing the garments from the shoot but visibly relaxed — maybe shoes kicked off, jacket unbuttoned, hair slightly mussed from a long day',
        location: `${locationNote} — after the shoot, crew packing up.`,
        film: leica,
        quality: qualityGolden,
        expression: 'Quiet relief, private contentment, completely off-duty. The face behind the face.',
      },
    ];

    // ============ OFFSHOT VARIANT A: On-set BTS ============
    if (offshotVariant === 'A') {
      const shotIdx = typeof body.shotIndex === 'number' ? body.shotIndex % offshotCategories.length : 0;
      const category = offshotCategories[shotIdx];
      const action = pick(category.actions);

      return `${offshotDirective}

${category.film}
${modelDescription}
The model is ${category.wardrobe}.
${category.location}

SCENE: The model ${action}.
EXPRESSION: ${category.expression}
${category.quality}

REMINDER: This is a BEHIND-THE-SCENES candid snapshot, NOT a fashion photo. Imperfect framing, relaxed posture, real environment.`;
    }

    // ============ OFFSHOT VARIANT B: After-party / Dinner / Nightlife ============
    const offshotBDirective = `CRITICAL INSTRUCTION: This is NOT a fashion photograph. This is a CANDID, AFTER-HOURS snapshot taken after the fashion shoot is done for the day. The model has wrapped the shoot, changed into more relaxed styling, and is now out with the crew — eating, drinking, celebrating, or traveling. The vibe is EVENING/NIGHT, warm lighting, intimate, real.

ANTI-FASHION RULES:
- This is a social moment, NOT a photoshoot. The model is relaxed, laughing, eating, drinking — being a real person.
- Framing is imperfect — shot on a phone or a small camera by a friend at the table. Off-center, slightly tilted, maybe someone's arm or glass partially blocking the frame.
- Lighting is warm ambient — restaurant candles, pub pendant lights, neon signs, car dashboard glow, street lamps. NO studio lighting.
- Other people (crew members, friends) may be partially visible — arms, shoulders, backs of heads, hands holding glasses.
- The overall feeling is private, warm, celebratory — like a photo posted on someone's close friends Instagram story.`;

    const leicaNight = 'Shot on Leica M6 with Summicron 35mm f/2, Kodak Portra 800 film pushed to 1600. Handheld, available light only, warm color cast from ambient lighting.';
    const qualityNight = 'QUALITY: Heavy film grain (Portra 800 pushed), warm amber/golden color cast from candles and ambient light, shallow depth of field, slightly soft focus. Intimate framing — feels like a friend took this photo. 3:4 portrait format. No text, no watermarks.';
    const qualityNeon = 'QUALITY: Heavy film grain, mixed color temperature — warm practicals vs cool neon. Cinematic night-time feel. Slightly underexposed with bright highlights from signs and lights. 3:4 portrait format. No text, no watermarks.';
    const qualityCar = 'QUALITY: Heavy film grain, mixed lighting — dashboard glow, passing streetlights creating moving shadows. Intimate, private, documentary feel. 3:4 portrait format. No text, no watermarks.';

    const cityContext = cityName
      ? `MANDATORY LOCATION: The venue MUST be in or very near ${cityName}. The restaurant, bar, or venue must look and feel authentically local to ${cityName} — local cuisine, local language on signs and menus, local architectural style, local people in the background. Do NOT set this in Japan, Tokyo, or any Asian city unless ${cityName} is explicitly in that region. The location must be geographically accurate to ${cityName}.`
      : 'The venue should feel authentic and local to the shooting location.';

    // Restaurant genre randomization — pick 2 different genres for shots 2 & 3
    const restaurantGenres = [
      'traditional local cuisine restaurant',
      'Italian restaurant or trattoria',
      'French bistro or brasserie',
      'yakiniku (grilled meat) restaurant',
      'yakitori (grilled chicken skewer) bar',
      'izakaya (Japanese pub-style dining)',
      'seafood restaurant',
      'steakhouse',
      'ramen shop',
      'tapas bar',
      'wine bar with small plates',
      'Korean BBQ restaurant',
    ];
    const genreA = restaurantGenres[seed % restaurantGenres.length];
    const genreB = restaurantGenres[(seed + 3) % restaurantGenres.length];

    const offshotBCategories = [
      // Shot 1: CAFE
      {
        actions: [
          'holding a latte or cappuccino, steam rising, looking out the window at the late afternoon light with a quiet, content expression',
          'mid-bite of a pastry or cake, fork in hand, looking at the camera with a "this is amazing" expression. Crumbs on the plate',
          'leaning back in her cafe chair, both hands wrapped around a warm coffee cup, legs crossed, watching people walk by outside',
          'laughing at something on her phone while stirring her coffee absently, completely relaxed and off-duty',
          'taking a photo of her latte art or dessert with her phone, concentrating on getting the angle right',
          'sitting at a window seat, face half-lit by golden afternoon light, coffee cup on the table, reading something on her phone with a soft smile',
        ],
        wardrobe: `${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc} — still in the shoot outfit but jacket draped over the chair, slightly loosened up`,
        location: `A cozy local cafe near ${cityName || 'the shooting location'}. ${cityContext} Afternoon to early evening light streaming through the windows. Coffee cups, pastries, warm wood or tile interior. The cafe should feel authentic to the area.`,
        film: leicaNight,
        quality: qualityNight,
        expression: 'Quiet contentment. The first moment of real relaxation after wrapping the shoot.',
      },
      // Shot 2: RESTAURANT A (random genre)
      {
        actions: [
          'mid-bite of food, chopsticks or fork halfway to her mouth, looking at the camera with a surprised "don\'t photograph me eating" expression mixed with amusement',
          'resting her chin on both hands, elbows on the table, listening to a story being told across the table with a warm, engaged smile',
          'holding up a piece of food toward the camera, showing it off proudly — "look how good this is"',
          'raising a glass in a toast with crew members, everyone mid-cheer, glasses clinking',
          'picking food from a shared plate, concentrating on choosing the best piece',
          'sitting sideways in her chair, legs crossed, one arm draped over the back, drink dangling from her fingers. Completely at ease',
        ],
        wardrobe: `${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc} — jacket removed, draped over chair. More relaxed than during the shoot`,
        location: `A ${genreA} near ${cityName || 'the shooting location'}. ${cityContext} The table has beautiful food, drinks, and a lively atmosphere. Warm lighting, authentic interior decor.`,
        film: leicaNight,
        quality: qualityNight,
        expression: 'Relaxed, social, enjoying the food and company. The face of someone who has earned this meal.',
      },
      // Shot 3: RESTAURANT B (different random genre)
      {
        actions: [
          'laughing hard at something someone just said, leaning back in her chair, one hand on the table for balance. Eyes squeezed shut from laughing',
          'leaning over the table to look at someone\'s phone screen, pointing at something while holding her drink in the other hand',
          'taking a group selfie with 2-3 crew members, all squeezing into frame, phone held at arm\'s length. Big genuine smiles',
          'arm around a crew member\'s shoulder, both holding drinks, posing for someone else\'s camera with relaxed, happy expressions',
          'standing up making a playful speech or toast, one hand holding a glass up. Everyone at the table looking up at her, amused',
          'mid-chew, cheeks slightly full, eyes wide as she realizes the camera is on her — guilty but amused',
        ],
        wardrobe: `${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc} — outfit slightly loosened, sleeves pushed up, top button undone`,
        location: `A ${genreB} near ${cityName || 'the shooting location'}. ${cityContext} Different vibe from the previous restaurant — a second stop of the evening. Shared plates, bottles, warm pendant lights.`,
        film: leicaNight,
        quality: qualityNight,
        expression: 'Pure joy and relief. The shoot is done, the work was good, celebrating with the crew.',
      },
      // Shot 4: BAR / PUB
      {
        actions: [
          'holding a drink (beer, cocktail, or local spirit) up at eye level, examining it against the warm bar light with a satisfied expression',
          'mid-sip, foam or condensation on the glass, eyes looking over the rim at the camera with a playful glint',
          'sitting at a worn bar counter, one elbow on the bar, drink in hand, turned toward the camera with a relaxed smile',
          'cheers-ing glasses with someone, the glasses meeting in the center of frame, her face visible behind them, grinning',
          'stirring her cocktail absently, looking directly at the camera with a warm, slightly tipsy smile',
          'laughing with her head thrown back slightly, drink held safely to the side, reacting to something hilarious',
        ],
        wardrobe: `${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc} — casual, jacket off, sleeves rolled up. Completely comfortable`,
        location: `A cozy bar, pub, or drinking spot near ${cityName || 'the shooting location'}. ${cityContext} Worn wooden or marble bar, warm amber lighting, bottles on shelves. Lively but intimate atmosphere.`,
        film: leicaNight,
        quality: qualityNeon,
        expression: 'Easy confidence, warmth. The relaxed nighttime version of her.',
      },
      // Shot 5: CAR RIDE
      {
        actions: [
          'sitting in the back seat of a car, head leaned against the window, city lights streaking past outside. She looks at the camera with tired but content eyes',
          'in the back seat, showing her phone screen to the person next to her, both laughing. Dashboard lights illuminating their faces',
          'looking out the car window at the night city, chin resting on her hand, reflections of lights on the glass overlapping her face',
          'asleep in the back seat, head tilted to one side, jacket used as a blanket. City lights play across her face through the window',
          'scrolling through the day\'s photos on her phone in the back seat, face lit by screen glow, a quiet private smile',
        ],
        wardrobe: `${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc} — wrapped in a jacket for warmth, slightly disheveled from a long day`,
        location: `Inside a car (taxi, van, or crew vehicle) driving through ${cityName || 'the city'} at night. ${cityContext} Local architecture, street signs, and city lights visible through the windows.`,
        film: leicaNight,
        quality: qualityCar,
        expression: 'Tired contentment. The quiet aftermath of a great day and evening.',
      },
      // Shot 6: NIGHT STREET
      {
        actions: [
          'walking down a narrow street at night, slightly ahead of the camera, turning back with a warm smile — streetlights creating a rim light around her hair',
          'standing under a neon sign or streetlight, leaning against a wall, phone in hand, looking at the camera with a relaxed, magnetic gaze',
          'crouching down to pet a stray cat on the sidewalk, laughing, her drink placed on the ground beside her',
          'walking arm-in-arm with a crew member (partially visible), mid-laugh, caught in a moment of genuine friendship on an empty street',
          'standing at a crosswalk waiting for the light, caught in a candid moment — wind in her hair, city lights reflecting off wet pavement',
          'sitting on a low wall or bench on the street, legs dangling, eating street food or ice cream from a cone, looking up at the camera with a content smile',
        ],
        wardrobe: `${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc} — jacket on for the cool night air, styled but lived-in`,
        location: `A street near ${cityName || 'the shooting location'} at night. ${cityContext} Local architecture, shop fronts, street signs in the local language, warm streetlights, maybe some neon. The street should feel authentic to this specific area — not generic.`,
        film: leicaNight,
        quality: qualityNeon,
        expression: 'Free, unguarded, magnetic. The best version of her — off-duty, walking through a city she\'s falling in love with.',
      },
    ];

    const shotIdx = typeof body.shotIndex === 'number' ? body.shotIndex % offshotBCategories.length : 0;
    const category = offshotBCategories[shotIdx];
    const action = pick(category.actions);

    return `${offshotBDirective}

${category.film}
${modelDescription}
The model is ${category.wardrobe}.
${category.location}

SCENE: The model ${action}.
EXPRESSION: ${category.expression}
${category.quality}

REMINDER: This is an AFTER-HOURS candid snapshot — evening/night, warm ambient lighting, real social moment. NOT a fashion photo.`;
  }

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
LIGHTING: Beautiful directional light that reveals the bag's material texture — surface grain, stitching details, and construction quality. Warm, luxurious light that makes the materials look rich and tactile.
MOOD: Luxurious, covetable, editorial — like a Bottega Veneta or Hermès accessory campaign. The bag should feel like the most important object in the frame.
LENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary material texture rendering with smooth, airy bokeh behind.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'bag-detail': `DETAIL SHOT — BAG/ACCESSORY EXTREME CLOSE-UP:
Generate a cinematic extreme close-up of the bag or accessory.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Tight crop on the bag — focus on the most visually prominent detail area (surface texture, stitching, closure, or any defining design element visible in the reference image). Do NOT invent or add details that are not in the reference. The model's hand grips or rests on the bag naturally. Only the hand, part of the arm, and the garment fabric near the bag are visible. This is about the object's craftsmanship and materiality.
POSE: The model holds the bag casually at their side, or the bag rests on a surface (ledge, step) with the model's hand draped over it. One hand may be in a pocket while the other holds the bag — effortless, natural grip.
LIGHTING: Raking sidelight that accentuates texture — every stitch and surface detail catches the light. Shallow depth of field with the bag's front face razor-sharp.
LENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — the bag's surface and texture are impossibly sharp while everything else dissolves into painterly bokeh.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'walk-side-full': `DETAIL SHOT — CATWALK SIDE VIEW (FULL BODY):
Generate a cinematic side-view photograph of the model walking.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: FULL BODY shot from the SIDE — the model walks across the frame (left to right or right to left) in a confident editorial stride. The camera is positioned perpendicular to her walking direction. Both the SHOES and BAG/ACCESSORIES must be clearly visible in the frame. The full outfit is shown head-to-toe from a side angle, revealing the garment's silhouette, drape, and movement.
POSE: Mid-stride, one foot ahead, weight shifting forward. The bag swings naturally with the walking motion. Arms in natural walking position. Confident, unhurried pace.
LIGHTING: Beautiful directional light that reveals the full silhouette. The side angle creates depth in the garment's layers and folds.
MOOD: Editorial catwalk energy — this is the money shot that shows everything: outfit, shoes, bag, movement, attitude.
LENS: Shot on Contax Planar 45mm f/2 — natural perspective, the model and her environment in perfect balance.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'walk-side-lower': `DETAIL SHOT — CATWALK SIDE VIEW (LOWER BODY FOCUS):
Generate a cinematic side-view photograph focusing on the lower body while the model walks.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Cropped from roughly waist/hip down to the ground — the SHOES and lower garment are the heroes. Shot from the SIDE as the model walks across the frame. The BAG is visible if carried at the side (handle, strap, or body of the bag entering the frame from above). The ground texture (stone, concrete, gravel) is visible and tactile. This is about the stride, the shoes, the bag in motion.
POSE: Mid-stride from the side — one leg forward, one back, capturing the dynamic motion of walking. The shoe detail is sharp and clear. The garment's hem moves with the stride.
LIGHTING: Low-angle light raking across the ground, creating long shadows from the shoes and legs. The shoes and bag catch the light beautifully.
LENS: Shot on Canon TS-E 90mm f/2.8L Macro — tilt-shift creating a selective focus plane. The shoes are razor-sharp with a distinctive depth falloff.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'lean-side': `DETAIL SHOT — LEANING AGAINST WALL/PILLAR (SIDE VIEW):
Generate a cinematic side-view photograph of the model leaning against a wall or pillar.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: FULL BODY shot from the SIDE — the model leans casually against a wall, pillar, or column within the location. Shot from a perpendicular side angle. Both SHOES and BAG are clearly visible. The lean creates a relaxed, effortless silhouette that reveals how the garment drapes when the body is at rest. One foot may be flat against the wall behind her.
POSE: Leaning with one shoulder against the surface, weight on one leg, the other leg bent or crossed. Arms relaxed — one hand holding the bag, the other in a pocket or resting at her side. The pose feels candid and natural, not stiff.
LIGHTING: Beautiful sidelight from the location's architecture — window light, open doorway, or natural ambient. The wall texture provides visual contrast with the garment.
MOOD: Effortlessly cool, editorial. The lean says "I belong here."
LENS: Shot on Leica Summilux-M 35mm f/1.4 ASPH — warm rendering, enough environmental context to show the location.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'bench-side': `DETAIL SHOT — SEATED ON BENCH (SIDE VIEW):
Generate a cinematic side-view photograph of the model seated on a bench or ledge.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: FULL BODY shot from the SIDE — the model sits on a bench, stone ledge, or low wall within the location. Legs crossed elegantly. The BAG is placed beside her on the bench surface, casually but visible. SHOES are clearly visible — the crossed legs showcase them. Shot from a side angle that shows the full seated silhouette.
POSE: Seated with legs crossed (one over the other), posture relaxed but elegant. One hand may rest on the bag beside her, the other on her knee or lap. The pose should feel like a pause — she sat down for a moment and someone captured it.
LIGHTING: Warm, natural directional light from the side. The seated pose creates interesting garment folds and drape that the light reveals.
MOOD: A quiet, composed moment. The accessories (bag beside her, shoes on display) tell the full story of the outfit without the model needing to stand.
LENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary tonal depth, the bag's texture and shoe details rendered with medium-format richness.
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

      'face-glance-back': `DETAIL SHOT — FACE/PORTRAIT (GLANCE BACK):
Generate a cinematic portrait of the model glancing back over their shoulder.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: The model's BODY faces AWAY from the camera (back or 3/4 back view), but the HEAD is turned to look back DIRECTLY at the camera. This creates a captivating over-the-shoulder glance — the twist between body direction and gaze direction is the drama of the shot. Show from waist up with enough of the garment's back visible.
EXPRESSION: Direct, intense eye contact through the glance back. Magnetic and slightly mysterious — as if the model sensed the camera and turned. Confident, unhurried.
LIGHTING: Soft, cinematic light with emphasis on the face catching light as it turns. The back/shoulders may be slightly in shadow, creating depth between the turned body and the illuminated face.
LENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — the background dissolves into painterly bokeh while the model's face and eyes are razor-sharp. The bokeh swirl adds to the sense of motion in the glance.
Hair should be natural and undisturbed.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'face-diagonal': `DETAIL SHOT — FACE/PORTRAIT (DIAGONAL THREE-QUARTER):
Generate a cinematic close-up portrait of the model at a diagonal three-quarter angle.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Tight close-up from chest/shoulders up. The model's face is at a DIAGONAL three-quarter angle — not full profile, not straight on, but angled approximately 30-40 degrees from camera. Show the jawline, one cheekbone prominently, the bridge of the nose. The angle reveals the face's sculptural quality.
EXPRESSION: Calm, distant, emotionless. Eyes looking slightly past the camera into the middle distance. NOT at camera. Lips closed naturally.
LIGHTING: Beautiful directional light sculpting the face from the angled side, creating a soft gradient of light to shadow across the cheek. The lit side is luminous, the shadow side has gentle fill.
LENS: Shot on Canon RF 85mm f/1.2L USM DS — impossibly smooth bokeh transition, luminous skin rendering.
Hair should be natural and undisturbed.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'face-upward': `DETAIL SHOT — FACE/PORTRAIT (UPWARD GAZE):
Generate a cinematic close-up portrait of the model gazing slightly upward.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Tight close-up from chest/shoulders up, shot from a slightly lower angle. The model tilts her chin slightly upward, gazing diagonally up — as if drawn by something above (light, architecture, sky). The upward tilt elongates the neck and creates an elegant, aspirational silhouette.
EXPRESSION: Serene, contemplative, quietly awed. NOT at camera. Eyes directed upward and slightly to one side. Emotionless but with a hint of wonder.
LIGHTING: Light from above, catching the face as it tilts upward. Beautiful catchlights in the upward-looking eyes. The neck and jawline are elegantly illuminated.
LENS: Shot on Zeiss Otus 85mm f/1.4 — clinical sharpness on the face with refined bokeh. The sky or ceiling above melts into soft background.
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

      'upper-body-side': `DETAIL SHOT — UPPER BODY (SIDE VIEW):
Generate a cinematic upper-body photograph from the side.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Medium close-up from waist up, shot from the SIDE (true profile or strong 3/4 body angle). Show how the garment's silhouette, drape, and fit look from the side — sleeve shape, back line, hem drop. NOT looking at camera.
EXPRESSION: Looking away, calm, emotionless. Profile or near-profile of the face.
The model's hands rest naturally at sides. No hair touching.
LIGHTING: Strong rim light or backlight outlining the garment's silhouette edge. Soft fill on the visible side of the garment.
LENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary silhouette rendering with smooth tonal depth.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'upper-body-upward': `DETAIL SHOT — UPPER BODY (UPWARD GAZE):
Generate a cinematic upper-body photograph with the model gazing upward.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Medium close-up from waist up. The model tilts her chin slightly upward, gazing diagonally up at the sky or architecture above. The upward angle shows the garment's neckline, collar, and upper construction beautifully. Shot from slightly below eye level.
EXPRESSION: Serene, contemplative, emotionless. NOT at camera. Chin tilted up, eyes directed above.
The model's hands rest naturally. No hair touching.
LIGHTING: Light from above catching the garment's upper surfaces. The upward gaze creates elegant shadows under the jawline.
LENS: Shot on Zeiss Otus 85mm f/1.4 — clinical sharpness with dignified bokeh.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'upper-body-glance-back': `DETAIL SHOT — UPPER BODY (GLANCE BACK):
Generate a cinematic upper-body photograph of the model glancing back over her shoulder.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Medium close-up from waist up. The model's body faces AWAY from camera (back/3/4 back view), head turned to look back DIRECTLY at camera. This reveals the garment's back construction — shoulder seams, back panel, collar from behind — while maintaining face visibility. Show enough garment detail to appreciate the back design.
EXPRESSION: Direct, confident eye contact through the glance back. Magnetic, unhurried.
The model's hands rest naturally at sides. No hair touching.
LIGHTING: Soft light catching the face as it turns. The back of the garment may be in slightly different light, creating depth.
LENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — painterly bokeh with sharp face.
${body.aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

      'upper-body-hair-tuck': `DETAIL SHOT — UPPER BODY (HAIR BEHIND EAR):
Generate a cinematic upper-body photograph of the model tucking hair behind her ear.
${modelDescription}
The model is ${garmentDesc}${secondGarmentDesc}${thirdGarmentDesc}${fourthGarmentDesc}${fifthGarmentDesc}.
${customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${backgroundDescriptions[background] || background}.`}

COMPOSITION: Medium close-up from waist up. The model raises one hand to gently tuck a strand of hair behind her ear — a single, natural, feminine gesture captured mid-motion. The raised arm reveals the garment's sleeve construction and armhole. The other hand rests naturally or holds a bag/accessory.
EXPRESSION: Looking slightly away from camera with a calm, private expression. NOT at camera. The gesture should feel natural and unposed — as if she's simply adjusting her hair while lost in thought.
LIGHTING: Soft, flattering light. The raised hand and exposed ear/neck area should be well-lit. Beautiful light on the garment's shoulder and sleeve.
LENS: Shot on Canon RF 85mm f/1.2L USM DS — smooth, dreamy bokeh, luminous skin.
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
    `LIGHTING PRIORITY: Even when shooting at indoor locations or inside buildings, actively seek BRIGHT, well-lit scenes. Position the model near windows, doorways, open courtyards, or any source of natural daylight. At least half of the shots in a series should feel bright and luminous — flooded with natural light, open sky visible, or sunlit surfaces. Avoid dark, underexposed, or heavily shadowed compositions. When in doubt, choose the brighter option.`,
    `IMPORTANT: Show the full body including feet if shoes/footwear are included.`,
    `IMPORTANT: The model must ALWAYS stand on dry ground. Never place the model inside water, puddles, or wet surfaces. For beach, lake, river, or ocean scenes, the model must stand on dry shore, sand, rocks, or a pier — never wading or stepping into the water.`,
    `CRITICAL: DO NOT render any text, labels, watermarks, or words on the image. The output must be a clean photograph with no text overlays.`,
    `OUTPUT FORMAT: Generate the image in ${body.aspectRatio} aspect ratio.`,
    `REMINDER: The garments MUST be exact copies from the reference images - not interpretations or similar items.`,
    // Normal mode Scene A: catwalk shot on shot index 0
    ...(body.sceneVariant !== 'B' && !body.artistic && typeof body.shotIndex === 'number' && body.shotIndex === 0 ? [
      `COMPOSITION OVERRIDE: CATWALK SHOT — The model walks DIRECTLY TOWARD the camera through a corridor, archway, colonnade, or pathway. Center-framed, full body, confident stride. The architecture creates strong perspective lines converging toward the model. The background behind the model should be BRIGHT — light flooding in from behind or from the far end of the corridor. This is the hero establishing shot of the editorial.`
    ] : []),
    // Normal mode Scene B: varied compositions and balanced walking directions
    ...(body.sceneVariant === 'B' && !body.artistic ? [(() => {
      const normalBShots = [
        // Shot 1: walking LEFT, wide establishing — BRIGHT outdoor
        `COMPOSITION OVERRIDE: The model walks toward the LEFT side of the frame (screen-left direction). Wide shot establishing the full environment — the architecture/scene occupies 60% of the frame with the model at roughly one-third position. Walking motion is mid-stride with natural arm swing. LIGHTING: This MUST be a BRIGHT, sunlit scene — the model is OUTSIDE or at the exit/entrance of the building, bathed in natural daylight. Open sky visible. The overall image should feel luminous and airy.`,

        // Shot 2: static, leaning/resting pose — near window/doorway light
        `COMPOSITION OVERRIDE: The model is NOT walking — instead, standing still with weight shifted to one hip, or leaning lightly against a wall/column/railing. One hand may rest in a pocket or on the hip. Relaxed, effortless posture. Frame the shot as a medium-full body with the model slightly off-center. LIGHTING: Position the model NEXT TO a window, open doorway, or archway where BRIGHT natural light floods in. The light should wrap around the model warmly. The pose should feel candid, as if caught between moments.`,

        // Shot 3: walking RIGHT, medium shot — bright courtyard/exterior
        `COMPOSITION OVERRIDE: The model walks toward the RIGHT side of the frame (screen-right direction). Medium shot from roughly knee-up, capturing garment movement and stride. LIGHTING: Set this in an OPEN COURTYARD, terrace, or exterior walkway with bright overhead natural light. Sunlit walls and ground reflect light upward, filling shadows. The scene should feel warm and bright, not dark or enclosed.`,

        // Shot 4: looking back over shoulder — backlit by doorway/window
        `COMPOSITION OVERRIDE: The model has just walked past the camera and LOOKS BACK over their shoulder. The body faces away (3/4 back view) while the head turns back toward the camera. This reveals the back construction of the garment while maintaining face visibility. LIGHTING: Strong BACKLIGHT from a bright doorway, window, or open sky behind the model. The model is silhouetted slightly with beautiful rim light. The background should be BRIGHT — the light source itself is visible.`,

        // Shot 5: from below, power angle — sky/ceiling light above
        `COMPOSITION OVERRIDE: LOW ANGLE shot — camera positioned below eye level, looking slightly upward at the model. This creates a powerful, commanding presence. LIGHTING: The model is lit from above by BRIGHT open sky or a skylight/atrium. The upper portion of the frame shows bright sky, clouds, or a light-filled ceiling. The low angle + bright sky creates a luminous, heroic composition. Full body visible with dramatic perspective.`,

        // Shot 6: walking toward camera — crew flood light, lo-fi catwalk
        `COMPOSITION OVERRIDE: The model walks DIRECTLY TOWARD the camera — a makeshift, low-budget catwalk. The model's gaze is straight ahead with a strong, editorial expression. LIGHTING: A battery-powered LED FLOOD LIGHT or portable studio light has been placed on the ground or on an equipment case DIRECTLY IN FRONT of the model, casting strong, harsh, warm directional light straight at her. The light is deliberately crude and unpolished — this is NOT a proper studio setup, it's a crew member's work light repurposed as a fashion light. The strong frontal light flattens the background into darkness while the model is brilliantly lit. Cables visible on the ground leading to the light. The background is the raw location, dimly lit or falling into shadow behind the bright frontal wash. The overall feel should be lo-fi editorial — like a behind-the-scenes test shot that turned out to be the best photo of the day.`,
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
IMPORTANT: Use the user's specified location/background — do NOT replace it with a different setting.
LIGHTING & LENS: Position the model with strong BACKLIGHT — golden hour sun directly behind, creating a luminous rim light around hair and shoulders. The background dissolves into the Noctilux's legendary swirling bokeh. Colors bleed and merge organically like watercolor. Specular highlights become soft, glowing orbs. Lens flare is welcome.`,

        // Shot 2: Canon DS — evening/twilight mood, perfect round bokeh
        `ARTISTIC DIRECTION: Shot on Canon RF 85mm f/1.2L USM DS (Defocus Smoothing).
IMPORTANT: Use the user's specified location/background — do NOT replace it with a different setting.
LIGHTING & LENS: Evening or twilight mood at the specified location. Look for any available POINT LIGHT SOURCES (lamps, windows, ambient lights) in the scene. The DS coating transforms every light source into perfectly smooth, round bokeh circles. The model is lit by nearby warm light, creating luminous, glowing skin. The transition from sharp to blur is impossibly gradual.`,

        // Shot 3: Contax Planar — bright wide full-body, walking toward camera
        `ARTISTIC DIRECTION: Shot on Contax Planar 45mm f/2 (Contax G2 rangefinder, 35mm film feel).
IMPORTANT: Use the user's specified location/background — do NOT replace it with a different setting.
COMPOSITION: FULL BODY wide shot — the model is shown head-to-toe with generous environment visible on both sides. The 45mm focal length captures a natural, slightly wide perspective without distortion.
POSE: The model walks DIRECTLY TOWARD the camera in a confident, unhurried stride — mid-step, one foot ahead, weight shifting forward. Arms relaxed at sides with natural swing. The movement creates a subtle sense of approaching presence.
LIGHTING & LENS: BRIGHT, open natural light — the scene should feel sun-drenched and luminous. Position the model in the brightest part of the location — open courtyard, wide pathway, or any area flooded with daylight. The Planar's legendary rendering gives skin a warm, three-dimensional glow with a subtle vintage character. Background gently falls off but remains recognizable. The overall image should feel airy, bright, and alive with motion.`,

        // Shot 4: Fujifilm GF medium format — dappled light within the location
        `ARTISTIC DIRECTION: Shot on Fujifilm GF 110mm f/2 (medium format).
IMPORTANT: Use the user's specified location/background — do NOT replace it with a different setting. Do NOT add trees, forests, or gardens unless the user specified them.
LIGHTING & LENS: Find areas of DAPPLED or FILTERED LIGHT within the specified location — light coming through architectural elements, lattice, screens, or any structure that breaks the light into pools and patterns. The medium format sensor captures extraordinary tonal gradation. The model exists in three-dimensional space with the background gently receding.`,

        // Shot 5: Sigma 35mm — wide environmental, foreground bokeh
        `ARTISTIC DIRECTION: Shot on Sigma 35mm f/1.2 DG DN Art.
IMPORTANT: Use the user's specified location/background — do NOT replace it with a different setting.
LIGHTING & LENS: The wider focal length captures the model WITH their environment. Shoot through any available FOREGROUND ELEMENTS native to the location (architectural details, railings, columns, edges) that blur into soft shapes in the near field. The f/1.2 aperture wraps both foreground and background blur around the subject. The model occupies the sharp middle ground between two layers of beautiful blur.`,

        // Shot 6: Nikon Noct — blue hour/twilight, ethereal
        `ARTISTIC DIRECTION: Shot on Nikon Nikkor Z 58mm f/0.95 S Noct.
IMPORTANT: Use the user's specified location/background — do NOT replace it with a different setting.
LIGHTING & LENS: BLUE HOUR or deep twilight mood at the specified location. The model is lit by a single warm light source against the cool ambient. At f/0.95, the depth of field is paper-thin — the model appears to float in an ethereal, dreamlike space. Any ambient lights become impossibly smooth, large bokeh circles. Contemplative, quiet, almost otherworldly.`,
      ];

      const sceneB = [
        // Shot 1: Hasselblad — wet ground reflections
        `ARTISTIC DIRECTION: Shot on Hasselblad XCD 80mm f/1.9 (medium format).
IMPORTANT: Use the user's specified location/background — do NOT replace it with a different setting.
LIGHTING & LENS: Post-rain or wet-ground mood at the specified location. The ground surface is wet and reflective, mirroring the model's silhouette and ambient light. The medium format sensor captures extraordinary surface texture. The model stands on dry ground, NOT in water. Overcast or diffused light with wet surfaces acting as natural reflectors.`,

        // Shot 2: Leica Summilux — architectural depth
        `ARTISTIC DIRECTION: Shot on Leica Summilux-M 35mm f/1.4 ASPH FLE.
IMPORTANT: Use the user's specified location/background — do NOT replace it with a different setting.
LIGHTING & LENS: Use the DEPTH of the specified location — find receding lines, arches, or structural elements that create perspective. The Summilux's warm color rendering gives surfaces a richness that digital lenses miss. Light enters from the far end or from side openings, creating a natural gradient. The model is positioned at the threshold between light and shadow.`,

        // Shot 3: Mamiya 7 — bright full-body, wind/movement
        `ARTISTIC DIRECTION: Shot on Mamiya 7 II with 80mm f/4 (medium format rangefinder, 6x7 film feel).
IMPORTANT: Use the user's specified location/background — do NOT replace it with a different setting.
COMPOSITION: FULL BODY wide shot — the model is shown head-to-toe with ample environment. The medium format 6x7 frame gives the image a distinctive, expansive quality with extraordinary tonal depth.
POSE: The model is mid-stride, walking across the frame from left to right. Wind catches her hair and the fabric of the garment, creating natural movement and flow. Her expression is focused, purposeful — she is going somewhere. One hand may hold hair back from her face.
LIGHTING & LENS: BRIGHT, wide-open natural light — late morning or early afternoon. The scene should feel spacious and luminous. The Mamiya 7's legendary sharpness and medium format tonal range render every detail with a smooth, analog richness. The background is in gentle soft focus but clearly recognizable as the location. The image should feel cinematic, dynamic, and full of life.`,

        // Shot 4: Voigtlander Nokton — warm wall/surface lean
        `ARTISTIC DIRECTION: Shot on Voigtlander Nokton 50mm f/1.0 Aspherical.
IMPORTANT: Use the user's specified location/background — do NOT replace it with a different setting. Do NOT default to terracotta or ochre walls unless the user specified them.
LIGHTING & LENS: The model leans casually against a wall or surface WITHIN the specified location. Late afternoon warm light. The Nokton at f/1.0 renders the surface texture with a distinctive vintage softness that wraps around the sharp subject. Warm palette from the sunlight. The model's pose is relaxed, almost candid.`,

        // Shot 5: Sony 135mm GM — layered foreground bokeh
        `ARTISTIC DIRECTION: Shot on Sony FE 135mm f/1.8 GM.
IMPORTANT: Use the user's specified location/background — do NOT replace it with a different setting. Do NOT add botanical elements unless they exist in the specified location.
LIGHTING & LENS: Shoot THROUGH available FOREGROUND ELEMENTS native to the specified location (architectural edges, columns, railings, or any objects in the scene). The 135mm compression stacks layers together. The foreground is rendered as soft, translucent color washes by the f/1.8 aperture. The model exists in a narrow band of sharpness between two layers of blur. Natural backlight or sidelight creating depth.`,

        // Shot 6: Zeiss Batis — geometric lines/levels
        `ARTISTIC DIRECTION: Shot on Zeiss Batis 40mm f/2 CF (Close Focus).
IMPORTANT: Use the user's specified location/background — do NOT replace it with a different setting.
LIGHTING & LENS: Find geometric lines within the specified location — stairs, levels, repeated architectural patterns, columns, or structural lines that create graphic composition. The model may lean against or stand near these elements. The Batis 40mm captures enough environment to establish the geometric quality while maintaining a natural perspective. Even, diffused light that reveals texture without harsh shadows.`,
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

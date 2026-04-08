import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';

export const maxDuration = 120;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.1-flash-image-preview';
const BATCH_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:batchGenerateContent`;

/**
 * POST /api/ai/batch-queue/execute
 *
 * Processes queued batch items:
 * 1. Fetches all 'queued' items for the store
 * 2. Resolves images to base64
 * 3. Builds Gemini requests
 * 4. Submits as batch job
 * 5. Returns batch job name for polling
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase || !GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const { storeId } = await request.json();
    if (!storeId) {
      return NextResponse.json({ error: 'storeId required' }, { status: 400 });
    }

    // 1. Fetch queued items
    const { data: queueItems, error: fetchErr } = await supabase
      .from('batch_queue')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'queued')
      .order('created_at', { ascending: true });

    if (fetchErr || !queueItems?.length) {
      return NextResponse.json({ error: 'No queued items', count: 0 }, { status: 400 });
    }

    console.log(`[BatchExecute] Processing ${queueItems.length} queued items`);

    // 2. Build batch requests
    const batchRequests: any[] = [];

    for (const item of queueItems) {
      try {
        const payload = item.payload;

        // Resolve images to base64
        const imageParts: any[] = [];

        // Garment images
        for (const imgUrl of (payload.garmentImages || [])) {
          const b64 = await resolveImageToBase64(imgUrl);
          const extracted = extractBase64(b64);
          if (extracted) {
            imageParts.push({ inline_data: { mime_type: extracted.mimeType, data: extracted.data } });
          }
        }

        // Model image
        if (payload.modelImage) {
          const b64 = await resolveImageToBase64(payload.modelImage);
          const extracted = extractBase64(b64);
          if (extracted) {
            imageParts.push({ inline_data: { mime_type: extracted.mimeType, data: extracted.data } });

            // Face crop (top 50%)
            try {
              const sharp = (await import('sharp')).default;
              const imgBuffer = Buffer.from(extracted.data, 'base64');
              const metadata = await sharp(imgBuffer).metadata();
              if (metadata.width && metadata.height) {
                const cropHeight = Math.round(metadata.height * 0.50);
                const faceCrop = await sharp(imgBuffer)
                  .extract({ left: 0, top: 0, width: metadata.width, height: cropHeight })
                  .resize({ width: 512, fit: 'inside' })
                  .jpeg({ quality: 90 })
                  .toBuffer();
                imageParts.push({ inline_data: { mime_type: 'image/jpeg', data: faceCrop.toString('base64') } });
              }
            } catch (e) {
              console.error('[BatchExecute] Face crop failed:', e);
            }
          }
        }

        // Second-fifth garment images
        for (const key of ['secondGarmentImages', 'thirdGarmentImages', 'fourthGarmentImages', 'fifthGarmentImages']) {
          for (const imgUrl of (payload[key] || [])) {
            const b64 = await resolveImageToBase64(imgUrl);
            const extracted = extractBase64(b64);
            if (extracted) {
              imageParts.push({ inline_data: { mime_type: extracted.mimeType, data: extracted.data } });
            }
          }
        }

        // Build prompt directly
        const { buildPromptFromPayload } = await import('@/app/api/ai/gemini-image/prompt-builder');
        const prompt = buildPromptFromPayload(payload);

        const parts = [{ text: prompt }, ...imageParts];

        batchRequests.push({
          request: {
            contents: [{ parts }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
              imageConfig: {
                aspectRatio: payload.aspectRatio || '3:4',
                imageSize: payload.resolution || '1K',
              },
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
          },
          metadata: {
            key: item.id,
          },
        });

        // Mark as processing
        await supabase.from('batch_queue').update({ status: 'processing' }).eq('id', item.id);
      } catch (itemErr) {
        console.error(`[BatchExecute] Error building request for ${item.id}:`, itemErr);
        await supabase.from('batch_queue').update({
          status: 'failed',
          error: String(itemErr),
          completed_at: new Date().toISOString(),
        }).eq('id', item.id);
      }
    }

    if (batchRequests.length === 0) {
      return NextResponse.json({ error: 'No valid requests built' }, { status: 400 });
    }

    console.log(`[BatchExecute] Submitting ${batchRequests.length} requests to Gemini Batch API`);

    // 3. Submit batch job
    const batchRes = await fetch(`${BATCH_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        batch: {
          display_name: `vual-batch-${Date.now()}`,
          input_config: {
            requests: {
              requests: batchRequests,
            },
          },
        },
      }),
    });

    if (!batchRes.ok) {
      const errText = await batchRes.text();
      console.error('[BatchExecute] Batch API error:', errText);
      // Revert status to queued
      for (const item of queueItems) {
        await supabase.from('batch_queue').update({ status: 'queued' }).eq('id', item.id).eq('status', 'processing');
      }
      return NextResponse.json({ error: 'Batch API failed', details: errText }, { status: 500 });
    }

    const batchData = await batchRes.json();
    const batchName = batchData.name;
    console.log(`[BatchExecute] Batch job created: ${batchName}`);

    return NextResponse.json({
      success: true,
      batchName,
      requestCount: batchRequests.length,
    });
  } catch (error) {
    console.error('[BatchExecute] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * GET /api/ai/batch-queue/execute?batchName=xxx&storeId=xxx
 *
 * Poll batch job status and process results when complete
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase || !GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const batchName = searchParams.get('batchName');
    const storeId = searchParams.get('storeId');

    if (!batchName || !storeId) {
      return NextResponse.json({ error: 'batchName and storeId required' }, { status: 400 });
    }

    // Check batch status
    const statusRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${batchName}?key=${GEMINI_API_KEY}`,
      { headers: { 'x-goog-api-key': GEMINI_API_KEY! } }
    );

    if (!statusRes.ok) {
      return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
    }

    const statusData = await statusRes.json();
    const state = statusData.state;

    if (state !== 'JOB_STATE_SUCCEEDED') {
      return NextResponse.json({
        success: true,
        state,
        progress: statusData.batchStats || null,
      });
    }

    // Job succeeded — process results
    const responses = statusData.response?.inlinedResponses || [];
    let savedCount = 0;

    for (const resp of responses) {
      const queueId = resp.metadata?.key;
      if (!queueId) continue;

      try {
        const candidates = resp.response?.candidates || [];
        const parts = candidates[0]?.content?.parts || [];

        // Find image part
        let imageBase64: string | null = null;
        let mimeType = 'image/png';
        for (const part of parts) {
          const imgData = part.inlineData || part.inline_data;
          if (imgData) {
            imageBase64 = imgData.data;
            mimeType = imgData.mimeType || imgData.mime_type || 'image/png';
            break;
          }
        }

        if (!imageBase64) {
          await supabase.from('batch_queue').update({
            status: 'failed',
            error: 'No image in response',
            completed_at: new Date().toISOString(),
          }).eq('id', queueId);
          continue;
        }

        // Save to R2
        const ext = mimeType === 'image/png' ? 'png' : 'jpg';
        const filename = `gemini-batch-${Date.now()}-${savedCount}.${ext}`;
        const imageBuffer = Buffer.from(imageBase64, 'base64');

        const { error: uploadError } = await storage
          .from('gemini-results')
          .upload(filename, imageBuffer, { contentType: mimeType });

        if (uploadError) {
          await supabase.from('batch_queue').update({
            status: 'failed',
            error: `Upload failed: ${uploadError.message}`,
            completed_at: new Date().toISOString(),
          }).eq('id', queueId);
          continue;
        }

        const { data: urlData } = storage.from('gemini-results').getPublicUrl(filename);
        const savedImageUrl = urlData.publicUrl;

        // Save to gemini_results
        await supabase.from('gemini_results').insert({
          image_url: savedImageUrl,
          storage_path: filename,
          garment_count: 1,
          product_ids: [],
          expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          source: 'studio',
          store_id: storeId,
        });

        // Update queue item
        await supabase.from('batch_queue').update({
          status: 'completed',
          result_image_url: savedImageUrl,
          result_saved: true,
          completed_at: new Date().toISOString(),
        }).eq('id', queueId);

        savedCount++;
      } catch (processErr) {
        console.error(`[BatchExecute] Error processing result for ${queueId}:`, processErr);
        await supabase.from('batch_queue').update({
          status: 'failed',
          error: String(processErr),
          completed_at: new Date().toISOString(),
        }).eq('id', queueId);
      }
    }

    return NextResponse.json({
      success: true,
      state: 'JOB_STATE_SUCCEEDED',
      savedCount,
      totalResponses: responses.length,
    });
  } catch (error) {
    console.error('[BatchExecute] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Helper: resolve image URL or data URI to base64
async function resolveImageToBase64(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:')) return imageUrl;
  if (imageUrl.startsWith('http')) {
    const res = await fetch(imageUrl);
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${buf.toString('base64')}`;
  }
  return imageUrl;
}

// Helper: extract base64 data and mime type
function extractBase64(input: string): { data: string; mimeType: string } | null {
  if (!input) return null;
  const match = input.match(/^data:(image\/\w+);base64,(.+)$/);
  if (match) return { mimeType: match[1], data: match[2] };
  if (/^[A-Za-z0-9+/]/.test(input)) return { mimeType: 'image/jpeg', data: input };
  return null;
}

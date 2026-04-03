import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import { submitVeoJob, pollVeoOperation } from '@/lib/video/veo-client';
import { parseMp4Duration } from '@/lib/utils/parse-mp4-duration';

export const maxDuration = 300;

const MAX_POLL_TIME_MS = 240000; // 4 minutes per attempt (leave room for retry)
const POLL_INTERVAL_MS = 10000;  // 10 seconds
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Use Gemini to simplify a video prompt that Veo rejected.
 * Returns a shorter, safer prompt.
 */
async function simplifyPrompt(originalPrompt: string, durationSec: number): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are rewriting a video generation prompt that was rejected by the Veo AI model.

REJECTED PROMPT:
${originalPrompt}

Rewrite this as a simpler, shorter prompt (max 2 sentences) that describes the same scene but:
- Remove any potentially problematic words (narrow spaces, close contact, etc.)
- Keep it as a simple camera movement + scene description
- Keep the fashion editorial style
- End with: "${durationSec} second clip, cinematic aspect ratio, photorealistic quality, no background music"

Return ONLY the new prompt text, nothing else.`
          }]
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text && text.length > 20) {
      console.log(`[Generate Clip] Simplified prompt: ${text}`);
      return text;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * POST /api/video/generate-clip
 *
 * Generate a single video clip from a look image using Veo 3.1.
 * This endpoint:
 * 1. Fetches the look image
 * 2. Submits to Veo API
 * 3. Polls until completion (or timeout)
 * 4. Saves result to Supabase Storage
 * 5. Updates collection_looks.video_clip_url
 *
 * Body: {
 *   lookId: string,
 *   jobId: string,
 *   prompt: string,            // Video generation prompt
 *   durationSeconds: 4 | 6 | 8,
 *   aspectRatio?: '16:9' | '9:16',
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { lookId, jobId, prompt, durationSeconds, aspectRatio } = body;

    if (!lookId || !prompt) {
      return NextResponse.json({ error: 'lookId and prompt are required' }, { status: 400 });
    }

    // 1. Fetch look image
    const { data: look, error: lookError } = await supabase
      .from('collection_looks')
      .select('image_url, store_id')
      .eq('id', lookId)
      .single();

    if (lookError || !look) {
      return NextResponse.json({ error: 'Look not found' }, { status: 404 });
    }

    // 2. Convert look image to base64
    const imgRes = await fetch(look.image_url);
    if (!imgRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch look image' }, { status: 500 });
    }
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const imageBase64 = imgBuffer.toString('base64');

    // Determine MIME type from URL or default to jpeg
    const mimeType = look.image_url.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';

    // 3. Submit Veo job with retry (attempt 2 uses simplified prompt)
    const MAX_ATTEMPTS = 3;
    let videoData: { bytesBase64Encoded?: string; gcsUri?: string; mimeType: string } | undefined;
    let lastError: string | null = null;
    let currentPrompt = prompt;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`[Generate Clip] Attempt ${attempt}/${MAX_ATTEMPTS} for look ${lookId} (prompt: ${currentPrompt.substring(0, 80)}...)`);

      const { operationName } = await submitVeoJob({
        imageBase64,
        imageMimeType: mimeType,
        prompt: currentPrompt,
        durationSeconds: (durationSeconds as 4 | 6 | 8) || 8,
        aspectRatio: aspectRatio || '16:9',
        resolution: '1080p',
        negativePrompt: 'blur, distortion, watermark, text overlay, low quality',
      });

      // Poll for completion
      const startTime = Date.now();
      let attemptDone = false;
      let isPromptRejection = false;

      while (Date.now() - startTime < MAX_POLL_TIME_MS) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        const result = await pollVeoOperation(operationName);

        if (result.error) {
          lastError = result.error.message;
          console.error(`[Generate Clip] Attempt ${attempt} error:`, lastError);
          // Check if it's a prompt/content issue (can be fixed by rewriting)
          if (lastError.includes('could not generate') || lastError.includes('prompt provided')) {
            isPromptRejection = true;
          }
          // RAI filter on the image itself — no point retrying
          if (lastError.includes('filter') || lastError.includes('violated')) {
            return NextResponse.json(
              { error: `Veo generation failed: ${lastError}` },
              { status: 500 }
            );
          }
          attemptDone = true;
          break;
        }

        if (result.done && result.video) {
          videoData = result.video;
          attemptDone = true;
          break;
        }
      }

      if (videoData) break; // Success

      if (!attemptDone) {
        lastError = 'Veo generation timed out';
      }

      // On prompt rejection, try simplifying the prompt before next attempt
      if (isPromptRejection && attempt < MAX_ATTEMPTS) {
        console.log(`[Generate Clip] Prompt rejected, asking Gemini to simplify...`);
        const simplified = await simplifyPrompt(currentPrompt, (durationSeconds as number) || 4);
        if (simplified) {
          currentPrompt = simplified;
        }
      }

      if (attempt < MAX_ATTEMPTS) {
        console.log(`[Generate Clip] Retrying in 2s...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!videoData) {
      if (jobId) {
        await supabase
          .from('video_jobs')
          .update({ error_message: lastError })
          .eq('id', jobId);
      }
      return NextResponse.json(
        { error: `Veo generation failed: ${lastError}` },
        { status: 500 }
      );
    }

    // 5. Save video to Supabase Storage
    let clipUrl: string | null = null;
    let actualDurationSec = (durationSeconds as number) || 4;

    if (videoData.bytesBase64Encoded) {
      const videoBuffer = Buffer.from(videoData.bytesBase64Encoded, 'base64');

      // Parse actual duration from mp4 mvhd box
      const parsed = parseMp4Duration(videoBuffer);
      if (parsed !== null) {
        actualDurationSec = Math.round(parsed);
        console.log(`[Generate Clip] Actual video duration: ${actualDurationSec}s (requested: ${durationSeconds}s)`);
      }

      const filename = `video-clips/${look.store_id}/${lookId}-${Date.now()}.mp4`;

      const { error: uploadError } = await storage
        .from('model-images')
        .upload(filename, videoBuffer, {
          contentType: 'video/mp4',
          upsert: true,
        });

      if (uploadError) {
        console.error('[Generate Clip] Upload error:', uploadError);
        return NextResponse.json({ error: 'Failed to upload video clip' }, { status: 500 });
      }

      const { data: urlData } = storage
        .from('model-images')
        .getPublicUrl(filename);

      clipUrl = urlData.publicUrl;
    } else if (videoData.gcsUri) {
      // If using GCS storage, the URL is the GCS URI
      // In production, you'd generate a signed URL or copy to Supabase
      clipUrl = videoData.gcsUri;
    }

    // 6. Update collection_looks with clip URL and actual duration
    if (clipUrl) {
      await supabase
        .from('collection_looks')
        .update({
          video_clip_url: clipUrl,
          shot_duration_sec: actualDurationSec,
        })
        .eq('id', lookId);
    }

    return NextResponse.json({
      success: true,
      clipUrl,
    });
  } catch (error: any) {
    console.error('[Generate Clip] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

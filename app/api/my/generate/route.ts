import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const maxDuration = 60;

const APIMART_API_KEY = process.env.APIMART_API_KEY;
const GEMINI_MODEL = 'gemini-3.1-flash-image-preview';
const GEMINI_URL = `https://api.apimart.ai/v1beta/models/${GEMINI_MODEL}:generateContent`;

const BACKGROUNDS: Record<string, string> = {
  studioWhite: 'clean white studio with soft professional fashion lighting',
  studioGray: 'neutral gray studio with dramatic fashion photography lighting',
  outdoorUrban: 'modern urban street with city architecture and natural daylight',
  outdoorNature: 'natural outdoor setting with soft light and greenery',
  cafeIndoor: 'stylish cafe interior with warm ambient lighting and tasteful decor',
  beachResort: 'tropical beach resort setting with bright natural sunlight',
};

const ETHNICITIES: Record<string, string> = {
  japanese: 'East Asian woman with refined, mixed-heritage features',
  korean: 'Korean',
  'eastern-european': 'Eastern European',
  'western-european': 'Western European',
  african: 'African',
  latin: 'Latin American',
  'southeast-asian': 'Southeast Asian',
};

// Variant A: clean facing-forward editorial
// Variant B: 3/4 turn, more dynamic
function buildPrompt(
  garmentCount: number,
  background: string,
  gender: string,
  height: number,
  ethnicity: string,
  variant: 'A' | 'B'
): string {
  const bgDesc = BACKGROUNDS[background] || background;
  const ethnicDesc = ETHNICITIES[ethnicity] || ethnicity;
  const genderWord = gender === 'male' ? 'man' : 'woman';
  const imgRef =
    garmentCount === 1
      ? 'the provided reference image'
      : `the ${garmentCount} provided reference images (one per garment)`;

  const poseA =
    'standing with natural confidence facing the camera, clean posture, weight slightly shifted to one side';
  const poseB =
    'in a relaxed 3/4 turn, chin slightly tilted, editorial stance — a more dynamic fashion moment';
  const compA =
    'Classic editorial composition. Slightly centered. Subject-driven, the garment is the story. Clean and deliberate.';
  const compB =
    'Dynamic editorial composition. Off-center framing. Strong directional light with intentional shadow. More editorial tension.';

  return `Generate a professional high-end fashion editorial photograph.

SUBJECT: A ${ethnicDesc} ${genderWord}, ${height}cm tall, slim fashion model build.
OUTFIT: The model wears EXACTLY the garment(s) shown in ${imgRef}. Reproduce all visible details faithfully — color, texture, pattern, cut, silhouette, and fit. Do NOT alter, substitute, or simplify any garment.
BACKGROUND: ${bgDesc}.
POSE: The model is ${variant === 'A' ? poseA : poseB}.
FRAMING: Full body from head to toe. 3:4 portrait orientation.
COMPOSITION: ${variant === 'A' ? compA : compB}
QUALITY: High-end fashion editorial photography. Sharp focus on the garments. Beautiful professional lighting. No text, no watermarks, no logos.`;
}

async function callGemini(imageParts: any[], prompt: string): Promise<string | null> {
  if (!APIMART_API_KEY) return null;

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${APIMART_API_KEY}`,
    },
    body: JSON.stringify({
      contents: [{ parts: [...imageParts, { text: prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: '3:4', imageSize: '1K' },
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    }),
  });

  if (!res.ok) {
    console.error('[QuickGen] APIMART error:', await res.text());
    return null;
  }

  const data = await res.json();
  const candidates = data.candidates || [];
  for (const candidate of candidates) {
    for (const part of candidate.content?.parts || []) {
      const inlineData = part.inline_data || part.inlineData;
      if (inlineData?.data) {
        return `data:image/png;base64,${inlineData.data}`;
      }
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      garmentImages,          // string[] — base64 data URLs
      background = 'studioWhite',
      modelSettings = {},
      firebaseUid = null,
      variant = 'A',          // 'A' | 'B'
    } = body;

    if (!garmentImages || garmentImages.length === 0) {
      return NextResponse.json({ error: 'garmentImages required' }, { status: 400 });
    }

    const { gender = 'female', height = 170, ethnicity = 'japanese' } = modelSettings;

    // ── Server-side credit check for logged-in users ──
    if (firebaseUid) {
      const supa = createServerClient();
      if (supa) {
        const { data: credit } = await supa
          .from('consumer_credits')
          .select('id, free_tickets_remaining, paid_credits, subscription_credits')
          .eq('firebase_uid', firebaseUid)
          .single();

        if (credit) {
          const total =
            (credit.free_tickets_remaining ?? 0) +
            (credit.subscription_credits ?? 0) +
            (credit.paid_credits ?? 0);
          if (total <= 0) {
            return NextResponse.json(
              { error: 'クレジットが不足しています', code: 'INSUFFICIENT_CREDITS' },
              { status: 402 }
            );
          }
          // Deduct 1 credit
          const { data: result } = await supa.rpc('deduct_consumer_credit', {
            p_consumer_credit_id: credit.id,
          });
          const deducted = Array.isArray(result) ? result[0] : result;
          if (deducted && !deducted.success) {
            return NextResponse.json(
              { error: 'クレジット消費に失敗しました', code: 'DEDUCT_FAILED' },
              { status: 402 }
            );
          }
        }
      }
    }

    // ── Build image parts ──
    const imageParts: any[] = [];
    for (const img of garmentImages) {
      const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        imageParts.push({ inline_data: { mime_type: match[1], data: match[2] } });
      }
    }

    if (imageParts.length === 0) {
      return NextResponse.json({ error: 'Invalid garment image format' }, { status: 400 });
    }

    // ── Generate ──
    const prompt = buildPrompt(imageParts.length, background, gender, height, ethnicity, variant);
    console.log(`[QuickGen] variant=${variant} uid=${firebaseUid || 'guest'}`);

    // Retry once on empty result
    let image = await callGemini(imageParts, prompt);
    if (!image) {
      await new Promise((r) => setTimeout(r, 1500));
      image = await callGemini(imageParts, prompt);
    }

    if (!image) {
      return NextResponse.json({ error: '生成に失敗しました。再度お試しください。' }, { status: 500 });
    }

    return NextResponse.json({ success: true, image, variant });
  } catch (err) {
    console.error('[QuickGen] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

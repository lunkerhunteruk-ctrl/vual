import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const maxDuration = 60;

const APIMART_API_KEY = process.env.APIMART_API_KEY;
const GEMINI_MODEL = 'gemini-3.1-flash-image-preview';
const APIMART_GENERATE_URL = 'https://api.apimart.ai/v1/images/generations';
const APIMART_TASK_URL = 'https://api.apimart.ai/v1/tasks';

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

const FILM_PRESETS: Record<string, string> = {
  leicaPortra800: `FILM LOOK — Shot on Leica M6 with Summicron 35mm f/2, Kodak Portra 800 film. Handheld, available light only.
QUALITY: Visible, textured film grain. Key characteristic: HIGHLIGHTS retain warm golden glow while SHADOWS shift to cool BLUE-GREY — a sophisticated warm/cool split. Skin tones are natural but slightly paler than Portra 400. Organic, tactile feel.`,

  leica: `FILM LOOK — Shot on Leica M6 with Summicron 35mm f/2, Kodak Portra 400 film. Handheld, available light only.
QUALITY: Visible film grain, slightly warm color cast, soft focus edges. Real analog film feel — not digitally perfect. Skin tones are warm and organic. Colors slightly muted and desaturated with a golden undertone.`,

  contax: `FILM LOOK — Shot on Contax T3 with Carl Zeiss Sonnar 35mm f/2.8, Kodak Portra 400 film. Compact camera, available light only.
QUALITY: Fine natural grain, creamy luminous colors, warm skin tones. Highlights roll off gently. Zeiss lens: razor center sharpness with gentle edge falloff. Bright, airy, effortlessly elegant.`,

  pentax: `FILM LOOK — Shot on Pentax 67 with SMC Takumar 105mm f/2.4 wide open, Kodak Portra 400 film. Medium format 6x7.
QUALITY: MEDIUM FORMAT — extraordinary tonal depth and richness. Fine creamy grain. Deeply saturated yet natural colors. Legendary bokeh — background dissolves into smooth painterly blur. Only eyes/face critically sharp. Heavy, significant, timeless.`,

  nikon: `FILM LOOK — Shot on Nikon FM2 with Nikkor 35mm f/1.4 AI-S, Kodak Tri-X 400 pushed to 1600 ISO.
QUALITY: MONOCHROME BLACK AND WHITE ONLY — no color. Heavy aggressive grain. Deep blacks, bright highlights, dramatic contrast. Raw documentary energy. Inky shadows, blown highlights. Like Peter Lindbergh or Helmut Newton.`,

  nikon800: `FILM LOOK — Shot on Nikon FM2 with Nikkor 35mm f/1.4 AI-S, Kodak Vision3 500T (Cinestill 800T) pushed to 1600 ISO.
QUALITY: Heavy grain, COOL color palette — blue-cyan cast under daylight, tungsten sources appear warm. Pale porcelain skin tones. HALATION: bright light sources (streetlights, neon, candles) produce characteristic RED/ORANGE glow bleeding outward. Deep blue-teal shadows. Nocturnal cinematic energy.`,

  superia: `FILM LOOK — Shot on Nikon FM2 with Nikkor 35mm f/1.4 AI-S, Fujifilm Superia X-TRA 800 film.
QUALITY: Heavy consumer film grain, NEUTRAL-COOL colors — not warm like Portra, not blue like Cinestill. Vivid greens (Fujifilm signature), natural true-to-life skin tones. Punchy direct contrast, hard highlight clipping. Raw, urgent, unpolished.`,
};

function buildPrompt(
  garmentCount: number,
  background: string,
  gender: string,
  height: number,
  ethnicity: string,
  variant: 'A' | 'B',
  options: {
    location?: string;
    situation?: string;
    filmMode?: string;
    hasFaceRef?: boolean;
    aspectRatio?: string;
  } = {}
): string {
  const { location, situation, filmMode, hasFaceRef, aspectRatio = '3:4' } = options;

  // BG="" → use location prompt; BG=preset → use that preset (location ignored)
  const bgDesc = background
    ? (BACKGROUNDS[background] || background)
    : (location || 'natural fashion setting with soft ambient lighting');
  const ethnicDesc = ETHNICITIES[ethnicity] || ethnicity;
  const genderWord = gender === 'male' ? 'man' : 'woman';

  const garmentRef = garmentCount === 1
    ? 'the first provided reference image'
    : `the first ${garmentCount} provided reference images (garment items)`;

  const poseA = 'standing with natural confidence facing the camera, clean posture, weight slightly shifted to one side';
  const poseB = 'in a relaxed 3/4 turn, chin slightly tilted, editorial stance — a more dynamic fashion moment';
  const compA = 'Classic editorial composition. Slightly centered. Subject-driven, the garment is the story. Clean and deliberate.';
  const compB = 'Dynamic editorial composition. Off-center framing. Strong directional light with intentional shadow. More editorial tension.';

  const faceNote = hasFaceRef
    ? `FACE REFERENCE: The LAST provided image is a face reference photo. Reproduce this person's facial features, hair, skin tone, and overall appearance on the model. Do NOT treat this image as a garment.`
    : '';

  const situationNote = situation
    ? `SCENE / SITUATION: ${situation}`
    : '';

  const filmText = filmMode && FILM_PRESETS[filmMode] ? FILM_PRESETS[filmMode] : '';

  return `Generate a professional high-end fashion editorial photograph.

SUBJECT: A ${ethnicDesc} ${genderWord}, ${height}cm tall, slim fashion model build.${hasFaceRef ? ' Apply the face reference provided as the last image.' : ''}
OUTFIT: The model wears EXACTLY the garment(s) shown in ${garmentRef}. Reproduce all visible details faithfully — color, texture, pattern, cut, silhouette, and fit. Do NOT alter, substitute, or simplify any garment.
BACKGROUND: ${bgDesc}.${situationNote ? `\n${situationNote}` : ''}
POSE: The model is ${variant === 'A' ? poseA : poseB}.
FRAMING: Full body from head to toe. Aspect ratio ${aspectRatio}. Use the optimal editorial composition for this ratio while keeping the full body visible.
COMPOSITION: ${variant === 'A' ? compA : compB}
QUALITY: High-end fashion editorial photography. Sharp focus on the garments. Beautiful professional lighting. No text, no watermarks, no logos.${filmText ? `\n\n${filmText}` : ''}${faceNote ? `\n\n${faceNote}` : ''}`;
}

// Submit job to APIMart and return task_id immediately (no polling here)
async function submitAPIMart(
  imageDataUrls: string[],
  prompt: string,
  aspectRatio: string,
): Promise<string | null> {
  if (!APIMART_API_KEY) return null;

  const res = await fetch(APIMART_GENERATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${APIMART_API_KEY}`,
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      prompt,
      size: aspectRatio,
      resolution: '1K',
      n: 1,
      image_urls: imageDataUrls,
    }),
  });

  if (!res.ok) {
    console.error('[APIMart] Submit failed:', res.status, await res.text());
    return null;
  }

  const data = await res.json();
  console.log('[APIMart] Submit response:', JSON.stringify(data));

  const taskId: string | undefined =
    data.data?.[0]?.task_id ?? data.data?.task_id ?? data.task_id;
  if (!taskId) {
    console.error('[APIMart] No task_id in response');
    return null;
  }
  return taskId;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      garmentImages,
      faceImage = null,         // base64 data URL | null
      background = 'studioWhite',
      modelSettings = {},
      sceneSettings = {},       // { location, situation, filmMode }
      aspectRatio = '3:4',      // '3:4' | '9:16' | '1:1' | '16:9' | '4:3' | '4:5'
      firebaseUid = null,
      variant = 'A',
    } = body;

    if (!garmentImages || garmentImages.length === 0) {
      return NextResponse.json({ error: 'garmentImages required' }, { status: 400 });
    }

    const { gender = 'female', height = 170, ethnicity = 'japanese' } = modelSettings;
    const { location, situation, filmMode } = sceneSettings;

    // ── Server-side credit check (check only — deduct after successful generation) ──
    let creditId: string | null = null;
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
          creditId = credit.id;
        }
      }
    }

    // ── Validate garment images ──
    const validGarments = garmentImages.filter((img: string) => /^data:image\/\w+;base64,/.test(img));
    if (validGarments.length === 0) {
      return NextResponse.json({ error: 'Invalid garment image format' }, { status: 400 });
    }

    // ── Build prompt ──
    const prompt = buildPrompt(
      validGarments.length,
      background,
      gender,
      height,
      ethnicity,
      variant,
      { location, situation, filmMode, hasFaceRef: !!faceImage, aspectRatio }
    );

    console.log(`[Generate] variant=${variant} film=${filmMode || 'none'} uid=${firebaseUid || 'guest'} ar=${aspectRatio}`);

    // Build flat array of data URIs: garments first, face ref last
    const imageDataUrls: string[] = [...validGarments];
    if (faceImage && /^data:image\/\w+;base64,/.test(faceImage)) imageDataUrls.push(faceImage);

    // Submit job — return taskId immediately, client polls /api/my/generate/poll
    const taskId = await submitAPIMart(imageDataUrls, prompt, aspectRatio);
    if (!taskId) {
      return NextResponse.json({ error: '生成ジョブの送信に失敗しました。再度お試しください。' }, { status: 500 });
    }

    return NextResponse.json({ success: true, taskId, creditId, variant });
  } catch (err) {
    console.error('[Generate] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

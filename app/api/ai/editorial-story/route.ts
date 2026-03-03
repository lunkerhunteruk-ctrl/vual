import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface EditorialStoryRequest {
  storyConcept: string;
  shotCount: number;
  garmentName?: string;
  garmentDescription?: string;
  secondGarmentName?: string;
  thirdGarmentName?: string;
  fourthGarmentName?: string;
  fifthGarmentName?: string;
  modelGender: string;
  modelEthnicity: string;
  modelHeight: number;
  locale?: string;
}

/**
 * POST /api/ai/editorial-story
 * Generate detailed per-shot editorial prompts from a story concept
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const body: EditorialStoryRequest = await request.json();
    const {
      storyConcept,
      shotCount,
      garmentName,
      garmentDescription,
      secondGarmentName,
      thirdGarmentName,
      fourthGarmentName,
      fifthGarmentName,
      modelGender,
      modelEthnicity,
      modelHeight,
      locale = 'en',
    } = body;

    if (!storyConcept?.trim()) {
      return NextResponse.json({ error: 'storyConcept is required' }, { status: 400 });
    }

    const validShotCount = Math.min(Math.max(shotCount || 3, 2), 6);

    // Build garment list
    const garments = [garmentName, secondGarmentName, thirdGarmentName, fourthGarmentName, fifthGarmentName]
      .filter(Boolean)
      .join(', ');

    const garmentDetail = garmentDescription
      ? `\nGarment details: ${garmentDescription.slice(0, 500)}`
      : '';

    const gender = modelGender === 'female' ? 'female' : 'male';
    const ethnicityMap: Record<string, string> = {
      'japanese': 'Japanese',
      'korean': 'Korean',
      'chinese': 'Chinese',
      'eastern-european': 'Eastern European',
      'western-european': 'Western European',
      'african': 'African',
      'latin': 'Latin American',
      'southeast-asian': 'Southeast Asian',
      'scandinavian': 'Scandinavian',
    };
    const ethnicity = ethnicityMap[modelEthnicity] || modelEthnicity;

    const prompt = `You are a world-class fashion editorial art director working for Vogue and Harper's Bazaar. Given a story concept and product information, generate ${validShotCount} distinct fashion editorial shot descriptions for a luxury lookbook.

STORY CONCEPT: ${storyConcept}

MODEL: ${gender}, ${ethnicity}, ${modelHeight}cm
GARMENTS: ${garments || 'fashion garments'}${garmentDetail}

For each shot, generate:

1. A PROMPT (150-200 words): A detailed image generation prompt written in English, describing the exact scene in the style of a high-end fashion editorial brief. Include ALL of the following:
   - "Editorial fashion photography" as the opening phrase
   - The model's ethnicity, gender, and what they are wearing (reference the exact garments provided)
   - Precise location/setting within the story concept
   - Model pose and body positioning (standing, walking, sitting, leaning, turning, crouching, etc.)
   - Camera angle and framing (three-quarter view, profile, low angle, over-shoulder, close-up, wide shot, etc.)
   - Specific lighting description (golden hour, diffused dawn light, dramatic shadows, rim light, backlight, etc.)
   - Color palette and mood keywords
   - How the garments interact with the environment (wind, drape, movement)
   - End with: "[orientation] orientation [ratio] aspect ratio, high resolution, photorealistic"

2. An ASPECT RATIO best suited for the shot's composition:
   - "3:4" for portrait/full-body close shots
   - "16:9" for cinematic wide landscape shots
   - "4:3" for landscape environmental shots
   - "1:1" for tight artistic framing
   - "9:16" for vertical story-format shots

3. A short LABEL (max 20 characters) — evocative title for the shot.

CRITICAL RULES:
- Each shot MUST have a DIFFERENT pose, camera angle, and ideally different aspect ratio for visual variety
- The shots should tell a cohesive visual story with narrative flow (beginning → middle → climax)
- The prompts MUST be in English regardless of the story concept language
- The model MUST be described as wearing the EXACT garments provided, woven naturally into the scene
- Do NOT include any text overlays, watermarks, or labels in the prompt
- The model must ALWAYS stand on dry ground. NEVER place the model inside water, puddles, or wet surfaces. For beach, lake, river, or ocean scenes, the model must be on dry shore, sand, rocks, a dock, or a pier — never wading or stepping into the water

IMPORTANT: Respond in EXACTLY this JSON format, nothing else:
{"shots": [{"prompt": "Editorial fashion photography, ...", "aspectRatio": "3:4", "label": "Dawn Arrival"}, ...]}`;

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 4000,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Editorial Story] Gemini error:', errorText);
      return NextResponse.json(
        buildFallback(storyConcept, validShotCount, garments, gender, ethnicity, modelHeight),
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.shots && Array.isArray(parsed.shots) && parsed.shots.length > 0) {
          // Validate and normalize each shot
          const shots = parsed.shots.slice(0, validShotCount).map((s: any) => ({
            prompt: typeof s.prompt === 'string' ? s.prompt : '',
            aspectRatio: ['1:1', '3:4', '4:3', '9:16', '16:9'].includes(s.aspectRatio)
              ? s.aspectRatio
              : '3:4',
            label: typeof s.label === 'string' ? s.label.slice(0, 20) : '',
          }));
          return NextResponse.json({ shots });
        }
      }
    } catch (e) {
      console.error('[Editorial Story] Parse error:', e, 'Raw:', text.slice(0, 500));
    }

    // Fallback
    return NextResponse.json(
      buildFallback(storyConcept, validShotCount, garments, gender, ethnicity, modelHeight),
    );
  } catch (error: any) {
    console.error('[Editorial Story] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function buildFallback(
  concept: string,
  shotCount: number,
  garments: string,
  gender: string,
  ethnicity: string,
  height: number,
) {
  const aspectRatios = ['3:4', '16:9', '16:9', '3:4', '4:3', '1:1'];
  const poses = [
    'standing with confident posture, looking away from camera',
    'walking naturally mid-stride, profile view',
    'sitting elegantly, looking directly at camera',
    'leaning against a wall, three-quarter view',
    'in a dynamic fashion pose, low angle shot',
    'standing in silhouette, backlit',
  ];

  const shots = Array.from({ length: shotCount }, (_, i) => ({
    prompt: `Editorial fashion photography, ${ethnicity} ${gender} model wearing ${garments || 'the styled garments'}, ${height}cm tall, ${poses[i % poses.length]}, ${concept}, Vogue editorial style, ${aspectRatios[i % aspectRatios.length] === '16:9' ? 'landscape' : 'portrait'} orientation ${aspectRatios[i % aspectRatios.length]} aspect ratio, high resolution, photorealistic`,
    aspectRatio: aspectRatios[i % aspectRatios.length],
    label: `Shot ${i + 1}`,
  }));

  return { shots };
}

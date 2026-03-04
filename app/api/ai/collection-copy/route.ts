import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * POST /api/ai/collection-copy
 * Generate cinematic editorial title + description from scene prompt + look image
 * Body: { scenePrompt: string, lookImageBase64?: string, locale?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { scenePrompt, lookImageBase64, lookImageUrl, locale = 'ja' } = body as {
      scenePrompt?: string;
      lookImageBase64?: string;
      lookImageUrl?: string;
      locale?: string;
    };

    if (!scenePrompt && !lookImageBase64 && !lookImageUrl) {
      return NextResponse.json({ error: 'scenePrompt, lookImageBase64, or lookImageUrl required' }, { status: 400 });
    }

    // If URL provided, fetch and convert to base64 (avoids Vercel body size limits)
    let resolvedImageBase64 = lookImageBase64;
    if (!resolvedImageBase64 && lookImageUrl) {
      try {
        const imgRes = await fetch(lookImageUrl);
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer());
          resolvedImageBase64 = buf.toString('base64');
        }
      } catch (e) {
        console.error('[Collection Copy] Failed to fetch image from URL:', e);
      }
    }

    const langInstruction = locale.startsWith('ja')
      ? 'Output MUST be in Japanese (日本語).'
      : locale.startsWith('fr')
        ? 'Output MUST be in French.'
        : locale.startsWith('ko')
          ? 'Output MUST be in Korean.'
          : locale.startsWith('zh')
            ? 'Output MUST be in Chinese.'
            : `Output MUST be in the language matching locale "${locale}". If unsure, use English.`;

    const sceneContext = scenePrompt
      ? `\nScene direction:\n${scenePrompt}`
      : '';

    const imageNote = resolvedImageBase64
      ? ' Study the attached image closely — its mood, light, color palette, composition, and the way garments move and drape.'
      : '';

    const prompt = `You are an editorial fashion copywriter AND a video production director for a luxury magazine like Vogue or Harper's Bazaar.${imageNote}

Given the scene direction and/or the styled look image, generate:

1. TITLE (max 50 characters): Evocative, cinematic, poetic. Not a product name or generic phrase.
   Think film titles, poetry fragments, atmospheric moments — e.g. "夜明けの残り香", "霧の向こうの沈黙", "光と影の境界線で"

2. DESCRIPTION (2-3 sentences): Emotional, cinematic editorial copy that captures the mood, light, movement, and story of the scene. Paint a visual narrative.
   You may describe garments by their visible appearance (color, silhouette, texture, drape, movement) but follow the rules below.

3. SHOT_DURATION_SEC (integer, 4-8): The ideal duration for this shot's video clip, chosen based on the scene's role and pacing:
   - 4s: Quick establishing shots, atmospheric transitions, fast-cut energy
   - 5s: Detail close-ups, texture moments, accessory focus
   - 6s: Standard full-body shots, walking sequences, balanced scenes
   - 7s: Dramatic reveals, turning moments, garment-in-motion hero shots
   - 8s: Slow cinematic wide shots, emotional climax scenes, contemplative endings
   Choose organically based on what the scene demands — vary across shots to create natural editorial rhythm.

4. VIDEO_PROMPT_VEO (for Google Veo 3.1, in English): A detailed video generation prompt (150-200 words) using this structure:
   - Scene: One clear sentence describing the overall action and vibe
   - Visual style: Define the aesthetic (e.g. "35mm film grain, muted earth tones, editorial fashion")
   - Camera movement: Specific camera behavior (dolly, tracking, crane, slow push-in, etc.)
   - Main subject: The model's appearance, garments, pose, and subtle movement (hair, fabric sway, weight shift)
   - Background: Setting details and environmental motion (wind, light shifts, ambient elements)
   - Lighting and mood: Specific light quality (soft wrap, hard rim, golden hour, motivated practicals)
   - Audio direction: FOLEY ONLY — NO background music, NO score, NO soundtrack. Only realistic diegetic sounds: footsteps on stone/wood/gravel, fabric rustling and swishing, soft breathing, wind through hair, distant ambient sounds (birds, water, city hum). The audio must feel like a raw field recording on set.
   - End with: "[SHOT_DURATION_SEC] second clip, cinematic aspect ratio, photorealistic quality, no background music" (use the duration you chose above)

5. VIDEO_PROMPT_KLING (for Kling 3.0, in English): A detailed video generation prompt (150-200 words) using this structure:
   - Scene: Location and atmosphere in one sentence
   - Character: Model's appearance, garments described by visual appearance, body positioning
   - Action sequence: "First [subtle movement], then [secondary action], finally [hold pose]" — keep movements minimal and elegant
   - Camera: Specific framing and movement (e.g. "slow dolly from medium to close-up, slight upward tilt")
   - Style: Color palette, film reference, motion intensity 0.3-0.4 (subtle, fashion-editorial pace)
   - Audio: FOLEY ONLY — NO background music, NO score. Only diegetic sounds: footsteps, fabric movement, breathing, environmental ambience (wind, birds, distant sounds). Raw on-set audio feel.
   - End with: "Fashion editorial, photorealistic, no background music, [SHOT_DURATION_SEC] seconds" (use the duration you chose above)

6. TELOP_CAPTION_JA (Japanese, max 30 characters): A poetic one-line subtitle for this scene. Cinematic, evocative — like a film subtitle. NOT the same as the title.

7. TELOP_CAPTION_EN (English, max 40 characters): English version of the same poetic subtitle. NOT a translation of the title.
${sceneContext}

${langInstruction} (applies to TITLE and DESCRIPTION only — video prompts and telop_caption_en MUST be in English, telop_caption_ja MUST be in Japanese)

CRITICAL RULES:
- NEVER mention specific fabric or material names (silk, cotton, linen, polyester, cashmere, wool, leather, etc. / シルク、コットン、リネン、ポリエステル、カシミヤ、ウール、レザー等)
- Describe garments ONLY by what is visually apparent: color, shape, movement, drape, texture impression
- Be cinematic, atmospheric, evocative — like a film still caption or a poetry fragment
- The title should feel like a chapter heading in a visual novel
- Do NOT mention brand names or product names
- Video prompts must describe SUBTLE, ELEGANT movements — no dramatic action. Think breathing, gentle sway, wind in hair, slow turn of head, fabric catching light
- GAZE SHIFT detection: If the image shows the model looking AWAY from camera (profile, three-quarter, looking down/aside), describe a "gaze shift" sequence in the video prompt — the model starts in the pose shown, then slowly turns to look directly into the camera with a confident, magnetic gaze, while subtly brushing hair back or sweeping it aside. This creates an emotionally captivating moment. Use 7s duration for gaze shift shots.
- Telop captions should feel like film subtitles — atmospheric fragments, not descriptions

IMPORTANT: Respond in EXACTLY this JSON format, nothing else:
{"title": "Your Title Here", "description": "Your description here as plain text.", "shot_duration_sec": 6, "video_prompt_veo": "Scene: ...", "video_prompt_kling": "Scene: ...", "telop_caption_ja": "光の中で息をする", "telop_caption_en": "breathing in the light"}`;

    const parts: any[] = [{ text: prompt }];
    if (resolvedImageBase64) {
      // Strip data URI prefix if present
      const base64Data = resolvedImageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: base64Data,
        },
      });
    }

    // Retry up to 3 times on API errors (rate limits, transient failures)
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 1.0,
              maxOutputTokens: 1500,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Collection Copy] Gemini error (attempt ${attempt + 1}):`, errorText);
          if (attempt < MAX_RETRIES - 1) {
            await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
            continue;
          }
          return NextResponse.json({ ...fallbackCopy(locale), fallback: true });
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.title) {
            const duration = Math.min(8, Math.max(4, parseInt(parsed.shot_duration_sec) || 6));
            return NextResponse.json({
              title: parsed.title,
              description: parsed.description || '',
              shot_duration_sec: duration,
              video_prompt_veo: parsed.video_prompt_veo || '',
              video_prompt_kling: parsed.video_prompt_kling || '',
              telop_caption_ja: parsed.telop_caption_ja || '',
              telop_caption_en: parsed.telop_caption_en || '',
            });
          }
        }

        console.error(`[Collection Copy] Parse failed (attempt ${attempt + 1}), raw:`, text.substring(0, 200));
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
      } catch (retryErr) {
        console.error(`[Collection Copy] Attempt ${attempt + 1} error:`, retryErr);
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
      }
    }

    return NextResponse.json({ ...fallbackCopy(locale), fallback: true });
  } catch (error: any) {
    console.error('[Collection Copy] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function fallbackTitle(locale: string): string {
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return locale.startsWith('ja') ? `VUALルック — ${date}` : `VUAL Look — ${date}`;
}

function fallbackCopy(locale: string) {
  const desc = locale.startsWith('ja')
    ? '光が織りなす一瞬の物語。'
    : 'A fleeting story woven in light.';
  return { title: fallbackTitle(locale), description: desc };
}

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
    const { scenePrompt, lookImageBase64, lookImageUrl, locale = 'ja', shotIndex, totalShots, detailMode } = body as {
      scenePrompt?: string;
      lookImageBase64?: string;
      lookImageUrl?: string;
      locale?: string;
      detailMode?: string;
      shotIndex?: number;
      totalShots?: number;
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
      ? 'LANGUAGE RULE: "title" and "description" MUST be written in Japanese (日本語). Do NOT use Chinese, English, Korean, or any other language for these fields. If you are unsure, write in Japanese.'
      : locale.startsWith('fr')
        ? 'LANGUAGE RULE: "title" and "description" MUST be written in French. Do NOT use any other language for these fields.'
        : locale.startsWith('ko')
          ? 'LANGUAGE RULE: "title" and "description" MUST be written in Korean. Do NOT use any other language for these fields.'
          : locale.startsWith('zh')
            ? 'LANGUAGE RULE: "title" and "description" MUST be written in Chinese. Do NOT use any other language for these fields.'
            : `LANGUAGE RULE: "title" and "description" MUST be written in the language matching locale "${locale}". If unsure, use English.`;

    // Determine wind shot assignments for editorial multi-shot stories
    let windInstruction = '';
    if (typeof shotIndex === 'number' && typeof totalShots === 'number' && totalShots > 1) {
      // Assign ~1/3 of shots as wind shots (e.g. 2 of 6, 1 of 3)
      const windShots: number[] = [];
      if (totalShots >= 6) {
        windShots.push(1, 3); // shots 2 and 4 (0-indexed)
      } else if (totalShots >= 3) {
        windShots.push(1); // shot 2
      }
      if (windShots.includes(shotIndex)) {
        // One special "hair blown across face + strong camera gaze" shot
        const isHeroWindShot = shotIndex === windShots[windShots.length - 1];
        if (isHeroWindShot) {
          windInstruction = `
WIND SHOT (MANDATORY for this shot): This shot MUST feature strong, visible wind. The wind blows the model's hair partially across her face, but she stands firm and powerful, gazing directly into the camera with unwavering confidence. Her garments billow and ripple dramatically in the wind. The wind direction should be consistent throughout the clip. Emphasize the contrast between the wild movement of hair and fabric and the model's composed, magnetic stillness. Do NOT have her touch or adjust her hair — she remains poised despite the wind.`;
        } else {
          windInstruction = `
WIND SHOT (MANDATORY for this shot): This shot MUST feature visible wind creating dynamic movement. Wind catches the garments — fabric billows, ripples, and flows. The model's hair moves naturally in the breeze. Emphasize the sense of motion and energy the wind brings to the scene. Do NOT have her touch or adjust her hair.`;
        }
      }
    }

    const sceneContext = scenePrompt
      ? `\nScene direction:\n${scenePrompt}`
      : '';

    // Detail mode: instruct for Ken Burns-optimized close-up video prompts
    const detailModeLabels: Record<string, string> = {
      'shoes': 'shoes/footwear close-up',
      'shoes-wall': 'shoes close-up (one foot on wall, casual cool pose)',
      'face': 'face/portrait close-up (looking away)',
      'face-gaze': 'face/portrait close-up (direct camera gaze, powerful)',
      'face-profile': 'face/portrait profile view (side angle)',
      'upper-body': 'upper body/garment detail close-up',
      'upper-body-gaze': 'upper body close-up (direct camera gaze, commanding)',
      'upper-body-texture': 'upper body close-up (fabric texture focus, looking away)',
      'bag': 'bag/accessory close-up',
      'bag-detail': 'bag/accessory extreme close-up (hardware, texture)',
    };
    const detailInstruction = detailMode
      ? `\nDETAIL SHOT MODE (${detailModeLabels[detailMode] || detailMode}): This is a CLOSE-UP detail shot, NOT a full-body shot. The video prompts must describe extremely subtle, almost imperceptible movement — this shot will use Ken Burns (slow pan/zoom on a still image). Focus on: gentle light shifts, subtle shadow movement, tiny fabric micro-movements from a breeze, dust particles in light beams. Camera should be nearly static with only a very slow drift. Use 4s duration for detail shots. The title and description should be poetic and focused on texture, light, and intimate details — NOT action or poses.`
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

3. SHOT_DURATION_SEC (MUST be exactly 4, 6, or 8 — these are the ONLY valid values for Veo 3.1):
   - 4s: Quick establishing shots, atmospheric transitions, detail close-ups, texture moments, fast-cut energy
   - 6s: Standard full-body shots, walking sequences, balanced scenes, dramatic reveals, garment-in-motion hero shots
   - 8s: Slow cinematic wide shots, emotional climax scenes, contemplative endings, gaze shift moments
   IMPORTANT: Never use 5 or 7. Only 4, 6, or 8 are valid. Vary across shots to create natural editorial rhythm.

4. VIDEO_PROMPT_VEO (for Google Veo 3.1, in English): A concise video generation prompt (max 150 words) using this structure:
   - Scene: One clear sentence describing the overall action and vibe
   - Visual style: Define the aesthetic (e.g. "35mm film grain, muted earth tones, editorial fashion")
   - Camera movement: Specific camera behavior (dolly, tracking, crane, slow push-in, etc.)
   - Main subject: The model's appearance, garments, pose, and subtle movement (hair, fabric sway, weight shift). IMPORTANT: Specify which hand holds each accessory/bag and state it remains fixed throughout (e.g. "right hand holding bag at her side, maintained throughout")
   - Background: Setting details and environmental motion (wind, light shifts, ambient elements)
   - Lighting and mood: Specific light quality (soft wrap, hard rim, golden hour, motivated practicals)
   - Audio direction: NO background music, NO score, NO soundtrack. Only realistic diegetic and environmental sounds: footsteps on stone/wood/gravel, fabric rustling, soft breathing, wind through hair, AND natural ambient sounds — flowing water, river/stream sounds, rain, birdsong, insects chirping, rustling leaves, distant city hum. The audio should feel like an immersive field recording capturing the real atmosphere of the location.
   - End with: "X second clip, cinematic aspect ratio, photorealistic quality, no background music" where X is the ACTUAL number you chose for shot_duration_sec (4, 6, or 8). Write the real number, NOT a placeholder.

5. VIDEO_PROMPT_KLING (for Kling 3.0, in English): A concise video generation prompt (max 150 words) using this structure:
   - Scene: Location and atmosphere in one sentence
   - Character: Model's appearance, garments described by visual appearance, body positioning. Specify exact hand/arm positions for held items — bags and accessories must stay in the SAME hand/position for the entire clip, never switching or teleporting
   - Action sequence: "First [subtle movement], then [secondary action], finally [hold pose]" — keep movements minimal and elegant
   - Camera: Specific framing and movement (e.g. "slow dolly from medium to close-up, slight upward tilt")
   - Style: Color palette, film reference, motion intensity 0.3-0.4 (subtle, fashion-editorial pace)
   - Audio: NO background music, NO score. Diegetic and environmental sounds only: footsteps, fabric movement, breathing, AND natural ambient sounds — flowing water, rain, birdsong, insects, rustling leaves, wind, distant city hum. Immersive location atmosphere.
   - End with: "Fashion editorial, photorealistic, no background music, X seconds" where X is the ACTUAL number you chose for shot_duration_sec (4, 6, or 8). Write the real number, NOT a placeholder.

6. TELOP_CAPTION_JA (Japanese, max 30 characters): A poetic one-line subtitle for this scene. Cinematic, evocative — like a film subtitle. NOT the same as the title.

7. TELOP_CAPTION_EN (English, max 40 characters): English version of the same poetic subtitle. NOT a translation of the title.
${sceneContext}
${windInstruction}
${detailInstruction}

${langInstruction}
(The language rule above applies to TITLE and DESCRIPTION only — video prompts and telop_caption_en MUST always be in English, telop_caption_ja MUST always be in Japanese, regardless of locale.)

CRITICAL RULES:
- NEVER mention specific fabric or material names (silk, cotton, linen, polyester, cashmere, wool, leather, etc. / シルク、コットン、リネン、ポリエステル、カシミヤ、ウール、レザー等)
- Describe garments ONLY by what is visually apparent: color, shape, movement, drape, texture impression
- Be cinematic, atmospheric, evocative — like a film still caption or a poetry fragment
- The title should feel like a chapter heading in a visual novel
- Do NOT mention brand names or product names
- VIDEO MOVEMENT PHILOSOPHY: This is high-fashion editorial, NOT a fashion show or commercial. Movement must be minimal, natural, and understated. The model is a living sculpture in a cinematic world.
  ALLOWED movements (use these):
    - Walking: if the image shows walking, the model simply CONTINUES walking in the same direction at the same pace. No stopping, no turning, no posing mid-walk.
    - Standing still: the model remains mostly still. Allowed subtle actions: wind naturally moving fabric and hair, slowly gazing upward at the sky or ceiling, slowly shifting gaze into the distance, gently resting a hand on a railing/wall/column, a barely perceptible weight shift.
    - Breathing and micro-movements: chest rising and falling, a slight head tilt, eyes blinking naturally.
    - Environmental motion: wind, light shifts, shadows moving, clouds, leaves.
  STRICTLY FORBIDDEN movements (NEVER include these):
    - Spinning, twirling, or turning around on the spot
    - Lifting, holding up, or spreading the hem/skirt/fabric of the garment
    - Dramatic poses, runway poses, or any exaggerated gestures
    - Touching or adjusting hair (brushing, tucking, sweeping, flipping)
    - Dancing, jumping, crouching, or any athletic movement
    - Waving, beckoning, blowing kisses, or any hand gestures toward camera
    - Removing, opening, or adjusting any garment or accessory
    - Any movement that feels "performed" or self-conscious — the model should appear unaware of the camera
- PHYSICAL CONTINUITY: Items the model holds (bags, accessories) must STAY in the SAME hand/position throughout the entire clip. NEVER have items teleport, switch hands, appear, or disappear mid-shot. If a bag is on the left shoulder at the start, it must remain on the left shoulder for the entire duration. Explicitly state hand/arm positions in the prompt (e.g. "left hand holding a woven bag at her side throughout the shot"). Any item visible in the reference image must be described with a FIXED position that does not change.
- GAZE SHIFT detection: If the image shows the model looking AWAY from camera (profile, three-quarter, looking down/aside), describe a "gaze shift" sequence in the video prompt — the model starts in the pose shown, then slowly turns to look directly into the camera with a confident, magnetic gaze. This creates an emotionally captivating moment. Use 8s duration for gaze shift shots.
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
            // Validate language: if locale is 'ja', title+description must contain hiragana or katakana
            if (locale.startsWith('ja')) {
              const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(parsed.title + (parsed.description || ''));
              if (!hasJapanese && attempt < MAX_RETRIES - 1) {
                console.warn(`[Collection Copy] Wrong language detected (attempt ${attempt + 1}), retrying...`, parsed.title.slice(0, 50));
                await new Promise(r => setTimeout(r, 1000));
                continue;
              }
            }
            // Snap to nearest valid Veo 3.1 duration (4, 6, or 8 only)
            const rawDur = parseInt(parsed.shot_duration_sec) || 6;
            const duration = rawDur <= 4 ? 4 : rawDur <= 5 ? 4 : rawDur <= 7 ? 6 : 8;

            // Replace any leftover [SHOT_DURATION_SEC] placeholders with actual duration
            const durStr = String(duration);
            const fixPrompt = (p: string) =>
              p.replace(/\[SHOT_DURATION_SEC\]/g, durStr);

            // Remove forbidden movements from video prompts
            const stripForbiddenActions = (p: string) =>
              p
                // Hair touching
                .replace(/,?\s*(?:while\s+)?(?:subtly\s+|gently\s+|slowly\s+|softly\s+)?(?:brushing|sweeping|tucking|pushing|running\s+(?:her\s+)?fingers?\s+through|touching|playing\s+with|adjusting|flipping|tossing)\s+(?:her\s+)?hair\s*(?:back|aside|behind\s+(?:her\s+)?ear)?/gi, '')
                .replace(/,?\s*(?:her\s+)?(?:fingers?\s+)?(?:lightly\s+|gently\s+|subtly\s+)?(?:grazing|caressing|lifting|sweeping)\s+(?:her\s+)?hair/gi, '')
                .replace(/,?\s*(?:a\s+)?(?:subtle\s+|gentle\s+)?hair\s+(?:tuck|brush|sweep|flip|toss)/gi, '')
                // Spinning/twirling
                .replace(/,?\s*(?:she\s+)?(?:slowly\s+|gently\s+|gracefully\s+|elegantly\s+)?(?:spins?|twirls?|pirouettes?|rotates?|turns?\s+(?:around|in\s+(?:a\s+)?(?:full\s+)?circle))\s*(?:on\s+the\s+spot|in\s+place)?/gi, '')
                // Lifting/holding skirt/hem/fabric
                .replace(/,?\s*(?:she\s+)?(?:gently\s+|subtly\s+|slowly\s+|playfully\s+)?(?:lifts?|holds?\s+up|raises?|spreads?|fans?\s+out|gathers?|grabs?|picks?\s+up)\s+(?:the\s+)?(?:hem|skirt|fabric|dress|garment|edge)\s*(?:of\s+(?:her|the)\s+\w+)?/gi, '')
                // Dramatic/runway poses
                .replace(/,?\s*(?:she\s+)?(?:strikes?\s+(?:a\s+)?(?:dramatic\s+|confident\s+|bold\s+)?pose|poses?\s+(?:dramatically|confidently|boldly))/gi, '')
                // Dancing/jumping
                .replace(/,?\s*(?:she\s+)?(?:dances?|jumps?|leaps?|crouches?|squats?|kneels?)/gi, '')
                // Waving/beckoning
                .replace(/,?\s*(?:she\s+)?(?:waves?|beckons?|blows?\s+(?:a\s+)?kiss(?:es)?|gestures?\s+(?:toward|at|to)\s+(?:the\s+)?camera)/gi, '')
                .replace(/\s{2,}/g, ' ').trim();

            let veoPrompt = stripForbiddenActions(fixPrompt(parsed.video_prompt_veo || ''));
            let klingPrompt = stripForbiddenActions(fixPrompt(parsed.video_prompt_kling || ''));

            // Auto-trim if over 150 words
            const MAX_WORDS = 150;
            const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

            const trimPromises: Promise<void>[] = [];
            if (wordCount(veoPrompt) > MAX_WORDS) {
              console.log(`[Collection Copy] Veo prompt too long (${wordCount(veoPrompt)} words), trimming...`);
              trimPromises.push(
                trimVideoPrompt(veoPrompt, duration, apiKey).then((t: string | null) => { if (t) veoPrompt = t; })
              );
            }
            if (wordCount(klingPrompt) > MAX_WORDS) {
              console.log(`[Collection Copy] Kling prompt too long (${wordCount(klingPrompt)} words), trimming...`);
              trimPromises.push(
                trimVideoPrompt(klingPrompt, duration, apiKey).then((t: string | null) => { if (t) klingPrompt = t; })
              );
            }
            if (trimPromises.length > 0) {
              await Promise.all(trimPromises);
            }

            return NextResponse.json({
              title: parsed.title,
              description: parsed.description || '',
              shot_duration_sec: duration,
              video_prompt_veo: veoPrompt,
              video_prompt_kling: klingPrompt,
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

async function trimVideoPrompt(prompt: string, duration: number, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Shorten this video generation prompt to under 120 words while keeping all essential details (scene, subject, camera, style, audio). Keep the ending line about duration and aspect ratio. Remove redundant adjectives and merge similar descriptions. Do NOT add new details.\n\nOriginal prompt:\n${prompt}\n\nReturn ONLY the shortened prompt, nothing else.`,
          }],
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text && text.split(/\s+/).filter(Boolean).length <= 150) {
      return text;
    }
    return null;
  } catch (e) {
    console.error('[Collection Copy] Trim prompt failed:', e);
    return null;
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

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
    const { scenePrompt, lookImageBase64, locale = 'ja' } = body as {
      scenePrompt?: string;
      lookImageBase64?: string;
      locale?: string;
    };

    if (!scenePrompt && !lookImageBase64) {
      return NextResponse.json({ error: 'scenePrompt or lookImageBase64 required' }, { status: 400 });
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

    const imageNote = lookImageBase64
      ? ' Study the attached image closely — its mood, light, color palette, composition, and the way garments move and drape.'
      : '';

    const prompt = `You are an editorial fashion copywriter for a luxury magazine like Vogue or Harper's Bazaar.${imageNote}

Given the scene direction and/or the styled look image, generate:

1. TITLE (max 50 characters): Evocative, cinematic, poetic. Not a product name or generic phrase.
   Think film titles, poetry fragments, atmospheric moments — e.g. "夜明けの残り香", "霧の向こうの沈黙", "光と影の境界線で"

2. DESCRIPTION (2-3 sentences): Emotional, cinematic editorial copy that captures the mood, light, movement, and story of the scene. Paint a visual narrative.
   You may describe garments by their visible appearance (color, silhouette, texture, drape, movement) but follow the rules below.
${sceneContext}

${langInstruction}

CRITICAL RULES:
- NEVER mention specific fabric or material names (silk, cotton, linen, polyester, cashmere, wool, leather, etc. / シルク、コットン、リネン、ポリエステル、カシミヤ、ウール、レザー等)
- Describe garments ONLY by what is visually apparent: color, shape, movement, drape, texture impression
- Be cinematic, atmospheric, evocative — like a film still caption or a poetry fragment
- The title should feel like a chapter heading in a visual novel
- Do NOT mention brand names or product names

IMPORTANT: Respond in EXACTLY this JSON format, nothing else:
{"title": "Your Title Here", "description": "Your description here as plain text."}`;

    const parts: any[] = [{ text: prompt }];
    if (lookImageBase64) {
      // Strip data URI prefix if present
      const base64Data = lookImageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: base64Data,
        },
      });
    }

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Collection Copy] Gemini error:', errorText);
      return NextResponse.json(fallbackCopy(locale), { status: 200 });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          title: parsed.title || fallbackTitle(locale),
          description: parsed.description || '',
        });
      }
    } catch (e) {
      console.error('[Collection Copy] Parse error:', e, 'Raw:', text);
    }

    return NextResponse.json(fallbackCopy(locale));
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

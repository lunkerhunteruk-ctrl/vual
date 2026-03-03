import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface ProductInfo {
  name: string;
  description?: string;
  category?: string;
  price?: number;
  currency?: string;
}

/**
 * POST /api/ai/collection-copy
 * Generate collection title + description from product data + optional look image
 * Body: { products: ProductInfo[], locale?: string, lookImageBase64?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { products, locale = 'ja', lookImageBase64, includeCredits = false } = body as {
      products: ProductInfo[];
      locale?: string;
      lookImageBase64?: string;
      includeCredits?: boolean;
    };

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'products required' }, { status: 400 });
    }

    const productSummary = products
      .map((p, i) => {
        let line = `${i + 1}. "${p.name}"`;
        if (p.category) line += ` (${p.category})`;
        if (p.description) line += ` — ${p.description.slice(0, 300)}`;
        return line;
      })
      .join('\n');

    const langInstruction = locale.startsWith('ja')
      ? 'Output MUST be in Japanese (日本語).'
      : locale.startsWith('fr')
        ? 'Output MUST be in French.'
        : locale.startsWith('ko')
          ? 'Output MUST be in Korean.'
          : locale.startsWith('zh')
            ? 'Output MUST be in Chinese.'
            : `Output MUST be in the language matching locale "${locale}". If unsure, use English.`;

    const imageContext = lookImageBase64
      ? ' The attached image shows the actual styled look — use its mood, color palette, setting, and overall vibe to inspire your copy.'
      : '';

    const creditsInstruction = includeCredits
      ? `\n3. After the description, add a CREDITS section (separated by a line break). List each product with its name, material/fabric if known from the description, and price. Format each line as: "Product Name / Material / ¥Price". If material is unknown, omit it. This should feel like a fashion magazine credits block.\n\nIMPORTANT: Include the credits as part of the "description" field, separated by two newlines from the editorial copy.`
      : '';

    const prompt = `You are a luxury fashion copywriter. Given the following products that form a coordinated look/collection${imageContext}, generate:

1. A short, evocative TITLE (max 60 characters) — creative, memorable, not generic. No quotes around it.
2. A DESCRIPTION (2-4 sentences) — emotional, editorial-style copy that paints a mood and lifestyle, weaving in the products naturally. Make it feel like a fashion magazine editorial caption.${creditsInstruction}

Products:
${productSummary}

${langInstruction}

IMPORTANT: Respond in EXACTLY this JSON format, nothing else:
{"title": "Your Title Here", "description": "Your description here as plain text."}`;

    const parts: any[] = [{ text: prompt }];
    if (lookImageBase64) {
      parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: lookImageBase64,
        },
      });
    }

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Collection Copy] Gemini error:', errorText);
      return NextResponse.json(fallbackCopy(products, locale), { status: 200 });
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

    return NextResponse.json(fallbackCopy(products, locale));
  } catch (error: any) {
    console.error('[Collection Copy] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function fallbackTitle(locale: string): string {
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return locale.startsWith('ja') ? `VUALルック — ${date}` : `VUAL Look — ${date}`;
}

function fallbackCopy(products: ProductInfo[], locale: string) {
  const names = products.map((p) => p.name).join(', ');
  const desc = locale.startsWith('ja')
    ? `${names}を使ったキュレーションルック。`
    : `A curated look featuring ${names}.`;
  return { title: fallbackTitle(locale), description: desc };
}

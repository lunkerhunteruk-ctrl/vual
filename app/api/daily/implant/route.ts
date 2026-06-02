import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.1-flash-image-preview';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_RETRIES = 3;

const R2_BASE = 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections';

function extractBase64(dataUrl: string): { data: string; mimeType: string } | null {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  if (!dataUrl.startsWith('data:') && dataUrl.length > 100) {
    return { mimeType: 'image/jpeg', data: dataUrl };
  }
  return null;
}

async function fetchR2File(path: string): Promise<Buffer | null> {
  try {
    const res = await fetch(`${R2_BASE}/${path}`);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return Buffer.from(buf);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { entityImage, lookFile, height } = body;

    if (!entityImage || !lookFile) {
      return NextResponse.json({ error: 'entityImage and lookFile are required' }, { status: 400 });
    }

    const modelHeight = height || 170;

    const lookMatch = lookFile.match(/collections\/([^/]+\/look\d+)\.\w+/);
    if (!lookMatch) {
      return NextResponse.json({ error: 'Invalid lookFile format' }, { status: 400 });
    }
    const recipeBase = lookMatch[1] + '-recipe';

    const promptBuf = await fetchR2File(`${recipeBase}/prompt.txt`);
    if (!promptBuf) {
      return NextResponse.json({ success: false, error: `Recipe not found: ${recipeBase}` }, { status: 404 });
    }
    const basePrompt = promptBuf.toString('utf-8');
    const prompt = `The model is ${modelHeight}cm tall with a slim build.\n${basePrompt}`;

    const imageParts: any[] = [];
    const entityData = extractBase64(entityImage);
    if (!entityData) {
      return NextResponse.json({ error: 'Invalid entity image' }, { status: 400 });
    }
    imageParts.push({
      inline_data: { mime_type: entityData.mimeType, data: entityData.data },
    });

    for (const name of ['garment.jpeg', 'ref2.jpeg', 'ref3.jpeg', 'ref4.jpeg', 'ref5.jpeg', 'ref6.jpeg', 'shoes.jpeg', 'jacket.jpeg', 'extra2.jpeg']) {
      const buf = await fetchR2File(`${recipeBase}/${name}`);
      if (buf) {
        imageParts.push({
          inline_data: { mime_type: 'image/jpeg', data: buf.toString('base64') },
        });
      }
    }

    const parts = [...imageParts, { text: prompt }];
    console.log(`[INJECT] ${recipeBase} — ${imageParts.length} images (1 face + ${imageParts.length - 1} garments)`);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(`[INJECT] Attempt ${attempt + 1}/${MAX_RETRIES} for ${recipeBase}...`);

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
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

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[INJECT] Gemini error:', errorText);
          lastError = new Error(`Gemini ${response.status}: ${errorText}`);
          continue;
        }

        const data = await response.json();
        const candidates = data.candidates || [];
        const finishReason = candidates[0]?.finishReason;

        if (finishReason === 'IMAGE_PROHIBITED_CONTENT') {
          console.log(`[INJECT] Content filter on attempt ${attempt + 1}`);
          lastError = new Error('IMAGE_PROHIBITED_CONTENT');
          if (attempt + 1 < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 1000));
          }
          continue;
        }

        for (const candidate of candidates) {
          const responseParts = candidate.content?.parts || [];
          for (const part of responseParts) {
            const inlineData = part.inline_data || part.inlineData;
            if (inlineData?.data) {
              const base64 = inlineData.data;
              const mimeType = inlineData.mime_type || inlineData.mimeType || 'image/jpeg';
              console.log(`[INJECT] Success on attempt ${attempt + 1}`);
              return NextResponse.json({
                success: true,
                resultImage: `data:${mimeType};base64,${base64}`,
              });
            }
          }
        }

        lastError = new Error(`No image in response. finishReason=${finishReason}`);
      } catch (error) {
        console.error(`[INJECT] Attempt ${attempt + 1} error:`, error);
        lastError = error as Error;
      }
    }

    return NextResponse.json({
      success: false,
      error: `INJECT failed after ${MAX_RETRIES} attempts: ${lastError?.message}`,
    }, { status: 500 });
  } catch (error) {
    console.error('INJECT error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

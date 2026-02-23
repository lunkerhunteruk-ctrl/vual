import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'asia-northeast1';

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json({ size: null });
    }

    if (!PROJECT_ID) {
      // Fallback: simple regex extraction
      return NextResponse.json({
        size: extractSizeWithRegex(description),
      });
    }

    const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
    const model = vertexAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `以下の商品説明からサイズ情報を抽出してJSONで返してください。
数値はcm単位の数字のみ返してください。該当する情報がない場合はnullを返してください。

商品説明:
${description}

以下のJSON形式で返答してください（他の説明は不要）:
{
  "bodyWidth": 身幅の数値またはnull,
  "length": 着丈の数値またはnull,
  "sleeveLength": 袖丈の数値またはnull,
  "shoulderWidth": 肩幅の数値またはnull
}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const response = await result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const size = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ size });
    }

    return NextResponse.json({ size: null });
  } catch (error) {
    console.error('Size extraction error:', error);
    return NextResponse.json({ size: null });
  }
}

// Fallback regex extraction
function extractSizeWithRegex(description: string): Record<string, number | null> {
  const result: Record<string, number | null> = {
    bodyWidth: null,
    length: null,
    sleeveLength: null,
    shoulderWidth: null,
  };

  // Common patterns
  const patterns = [
    { key: 'bodyWidth', regex: /身幅[：:\s]*(\d+)/i },
    { key: 'length', regex: /着丈[：:\s]*(\d+)/i },
    { key: 'sleeveLength', regex: /袖丈[：:\s]*(\d+)/i },
    { key: 'shoulderWidth', regex: /肩幅[：:\s]*(\d+)/i },
  ];

  for (const { key, regex } of patterns) {
    const match = description.match(regex);
    if (match) {
      result[key] = parseInt(match[1], 10);
    }
  }

  return result;
}

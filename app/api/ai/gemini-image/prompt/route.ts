import { NextRequest, NextResponse } from 'next/server';

// Re-export buildPrompt for batch queue use
// This endpoint returns the generated prompt text without calling Gemini

export async function POST(request: NextRequest) {
  try {
    // Dynamic import to reuse the same prompt building logic
    const { buildPromptFromPayload } = await import('../prompt-builder');
    const body = await request.json();
    const prompt = buildPromptFromPayload(body);
    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('[Prompt] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { generateProductDescription } from '@/lib/ai/gemini';

interface GenerateDescriptionRequest {
  productName: string;
  category: string;
  materials?: string;
  features?: string[];
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'luxury' | 'playful';
  language?: 'en' | 'ja';
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateDescriptionRequest = await request.json();

    if (!body.productName || !body.category) {
      return NextResponse.json(
        { error: 'Product name and category are required' },
        { status: 400 }
      );
    }

    const description = await generateProductDescription({
      productName: body.productName,
      category: body.category,
      materials: body.materials,
      features: body.features,
      targetAudience: body.targetAudience,
      tone: body.tone || 'professional',
      language: body.language || 'en',
    });

    return NextResponse.json({ description });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate description' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { generateModelCasting, type ModelCastingRequest } from '@/lib/ai/vertex-vton';

export async function POST(request: NextRequest) {
  try {
    const body: ModelCastingRequest = await request.json();

    if (!body.productImage) {
      return NextResponse.json(
        { error: 'Product image is required' },
        { status: 400 }
      );
    }

    if (!body.modelSettings) {
      return NextResponse.json(
        { error: 'Model settings are required' },
        { status: 400 }
      );
    }

    // In production, this would call Vertex AI
    // For now, return placeholder response
    const result = await generateModelCasting(body);

    return NextResponse.json({
      success: true,
      images: result.generatedImages,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('Model casting error:', error);

    // Return mock data for development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        images: [
          // Placeholder images for development
          '/placeholder-model-1.jpg',
          '/placeholder-model-2.jpg',
          '/placeholder-model-3.jpg',
          '/placeholder-model-4.jpg',
        ],
        metadata: {
          model: 'mock',
          processingTime: 0,
        },
      });
    }

    return NextResponse.json(
      { error: 'Failed to generate model casting' },
      { status: 500 }
    );
  }
}

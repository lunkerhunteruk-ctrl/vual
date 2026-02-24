import { NextRequest, NextResponse } from 'next/server';
import { generateVTON, type VTONRequest } from '@/lib/ai/vertex-vton';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.personImage) {
      return NextResponse.json(
        { error: 'Person image is required' },
        { status: 400 }
      );
    }

    if (!body.garmentImage) {
      return NextResponse.json(
        { error: 'Garment image is required' },
        { status: 400 }
      );
    }

    // Images should be base64 from client-side conversion
    if (!body.personImage.startsWith('data:') || !body.garmentImage.startsWith('data:')) {
      return NextResponse.json(
        { error: 'Images must be base64 encoded' },
        { status: 400 }
      );
    }

    const vtonRequest: VTONRequest = {
      personImage: body.personImage,
      garmentImage: body.garmentImage,
      category: body.category || 'upper_body',
      mode: body.mode,
    };

    const result = await generateVTON(vtonRequest);

    return NextResponse.json({
      success: true,
      resultImage: result.resultImage,
      confidence: result.confidence,
      processingTime: result.processingTime,
    });
  } catch (error) {
    console.error('VTON error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if Google Cloud is configured
    if (errorMessage.includes('GOOGLE_CLOUD_PROJECT_ID')) {
      return NextResponse.json({
        success: false,
        error: 'Google Cloud is not configured. Please set GOOGLE_CLOUD_PROJECT_ID environment variable.',
      });
    }

    return NextResponse.json({
      success: false,
      error: `Generation failed: ${errorMessage}`,
    });
  }
}

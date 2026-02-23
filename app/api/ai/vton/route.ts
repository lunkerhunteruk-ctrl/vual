import { NextRequest, NextResponse } from 'next/server';
import { generateVTON, type VTONRequest } from '@/lib/ai/vertex-vton';

export async function POST(request: NextRequest) {
  try {
    const body: VTONRequest = await request.json();

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

    const result = await generateVTON(body);

    return NextResponse.json({
      success: true,
      resultImage: result.resultImage,
      confidence: result.confidence,
      processingTime: result.processingTime,
    });
  } catch (error) {
    console.error('VTON error:', error);

    // Return placeholder for development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        resultImage: '/placeholder-vton-result.jpg',
        confidence: 0.85,
        processingTime: 2000,
        mock: true,
      });
    }

    return NextResponse.json(
      { error: 'Failed to generate virtual try-on' },
      { status: 500 }
    );
  }
}

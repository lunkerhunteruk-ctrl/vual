import { NextRequest, NextResponse } from 'next/server';
import { generateVTON, generateVTONLegacy, type VTONRequest, type VTONRequestLegacy } from '@/lib/ai/vertex-vton';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.personImage) {
      return NextResponse.json(
        { error: 'Person image is required' },
        { status: 400 }
      );
    }

    // Support both new multi-garment and legacy single-garment format
    const garmentImages: string[] = body.garmentImages
      || (body.garmentImage ? [body.garmentImage] : []);
    const categories: string[] = body.categories
      || (body.category ? [body.category] : []);

    if (garmentImages.length === 0) {
      return NextResponse.json(
        { error: 'At least one garment image is required' },
        { status: 400 }
      );
    }

    if (garmentImages.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 garments per generation' },
        { status: 400 }
      );
    }

    // Fill categories to match garment count
    const filledCategories = garmentImages.map(
      (_, i) => categories[i] || 'upper_body'
    );

    const result = await generateVTON({
      personImage: body.personImage,
      garmentImages,
      categories: filledCategories,
    });

    return NextResponse.json({
      success: true,
      resultImage: result.resultImage,
      confidence: result.confidence,
      processingTime: result.processingTime,
    });
  } catch (error) {
    console.error('VTON error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

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

import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const LOCATION = 'us-central1'; // Image generation available in US

interface GarmentSize {
  bodyWidth?: number;
  length?: number;
  sleeveLength?: number;
  shoulderWidth?: number;
}

interface ModelSettings {
  gender: string;
  height: number;
  ethnicity: string;
  pose: string;
}

interface SizeSpec {
  columns: string[];
  rows: { size: string; values: Record<string, string> }[];
}

interface RequestBody {
  garmentImage: string;
  garmentName?: string;
  garmentSize?: GarmentSize;
  garmentSizeSpecs?: SizeSpec;
  modelSettings: ModelSettings;
  modelImage?: string;
  background: string;
  aspectRatio: string;
  customPrompt?: string;
  locale?: string;
}

// Background descriptions
const backgroundDescriptions: Record<string, string> = {
  studioWhite: 'clean white studio background with soft professional lighting',
  studioGray: 'neutral gray studio background with professional fashion photography lighting',
  outdoorUrban: 'modern urban street background with city architecture, natural daylight',
  outdoorNature: 'natural outdoor setting with soft natural lighting, greenery',
  cafeIndoor: 'stylish cafe interior with warm ambient lighting',
  beachResort: 'tropical beach or resort setting with bright natural sunlight',
};

// Ethnicity descriptions
const ethnicityDescriptions: Record<string, string> = {
  japanese: 'Japanese',
  korean: 'Korean',
  chinese: 'Chinese',
  'eastern-european': 'Eastern European',
  'western-european': 'Western European',
  african: 'African',
  latin: 'Latin American',
  'southeast-asian': 'Southeast Asian',
};

// Pose descriptions
const poseDescriptions: Record<string, string> = {
  standing: 'standing with confident posture',
  walking: 'walking naturally mid-stride',
  sitting: 'sitting elegantly',
  dynamic: 'in a dynamic fashion pose',
  leaning: 'leaning casually against a wall',
};

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();

    if (!body.garmentImage) {
      return NextResponse.json(
        { error: 'Garment image is required' },
        { status: 400 }
      );
    }

    // Build the detailed prompt
    const prompt = buildPrompt(body);

    if (!PROJECT_ID) {
      // Return mock response for development
      return NextResponse.json({
        success: true,
        images: [
          '/placeholder-generated-1.jpg',
          '/placeholder-generated-2.jpg',
        ],
        prompt,
        mock: true,
      });
    }

    // Initialize Vertex AI for image generation
    const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
    const model = vertexAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

    // Build parts array with text and images
    const parts: any[] = [{ text: prompt }];

    // Add garment image if base64
    if (body.garmentImage.startsWith('data:')) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: body.garmentImage.replace(/^data:image\/\w+;base64,/, ''),
        },
      });
    }

    // Add model image if provided and base64
    if (body.modelImage?.startsWith('data:')) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: body.modelImage.replace(/^data:image\/\w+;base64,/, ''),
        },
      });
    }

    // Generate image with Gemini Flash Image
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts,
      }],
      generationConfig: {
        // Image generation specific config
        responseModalities: ['IMAGE', 'TEXT'],
      } as any,
    });

    const response = await result.response;

    // Extract generated images from response
    const images: string[] = [];
    const candidates = response.candidates || [];

    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if ((part as any).inlineData?.data) {
          const base64 = (part as any).inlineData.data;
          const mimeType = (part as any).inlineData.mimeType || 'image/png';
          images.push(`data:${mimeType};base64,${base64}`);
        }
      }
    }

    if (images.length === 0) {
      // Fallback to Imagen if Gemini Image doesn't return images
      return await generateWithImagen(body, prompt);
    }

    return NextResponse.json({
      success: true,
      images,
      prompt,
    });
  } catch (error) {
    console.error('Gemini image generation error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed',
      images: ['/placeholder-generated-1.jpg'],
    });
  }
}

function buildPrompt(body: RequestBody): string {
  const { modelSettings, modelImage, garmentSize, garmentSizeSpecs, background, customPrompt, locale } = body;

  // Build size description from structured sizeSpecs if available
  let sizeDescription = '';
  if (garmentSizeSpecs && garmentSizeSpecs.rows.length > 0) {
    // Use M size or first available
    const mRow = garmentSizeSpecs.rows.find(r => r.size === 'M') || garmentSizeSpecs.rows[0];
    const sizeDetails = Object.entries(mRow.values)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}: ${v}cm`)
      .join(', ');
    if (sizeDetails) {
      sizeDescription = locale === 'ja'
        ? `この服のサイズ${mRow.size}は ${sizeDetails} です。`
        : `This garment in size ${mRow.size} has measurements: ${sizeDetails}.`;
    }
  }

  // Calculate fit description based on model height and garment size
  let fitDescription = '';
  if (garmentSize?.length && modelSettings.height) {
    const lengthRatio = garmentSize.length / modelSettings.height;
    if (lengthRatio > 0.5) {
      fitDescription = locale === 'ja'
        ? '着丈が長めでヒップ下まで届く丈感'
        : 'longer length reaching below hip';
    } else if (lengthRatio > 0.4) {
      fitDescription = locale === 'ja'
        ? 'ウエスト周りの標準的な丈感'
        : 'standard length around waist';
    } else {
      fitDescription = locale === 'ja'
        ? 'クロップド丈のショート丈感'
        : 'cropped short length';
    }
  }

  // Build model description - use reference image if provided
  const modelDescription = modelImage
    ? `Use the model shown in the reference image as the base appearance`
    : `A ${ethnicityDescriptions[modelSettings.ethnicity] || modelSettings.ethnicity} ${modelSettings.gender === 'female' ? 'woman' : 'man'}`;

  const parts = [
    `Professional high-end fashion photography.`,
    modelDescription,
    `who is ${modelSettings.height}cm tall,`,
    `${poseDescriptions[modelSettings.pose] || modelSettings.pose},`,
    `wearing the garment shown in the reference image.`,
    sizeDescription,
    fitDescription ? `The garment appears with ${fitDescription}.` : '',
    `${backgroundDescriptions[background] || background}.`,
    `Sharp focus, editorial fashion magazine quality, 8K resolution.`,
    `Realistic skin texture, natural pose, professional model.`,
    customPrompt ? `Additional details: ${customPrompt}` : '',
  ];

  return parts.filter(Boolean).join(' ');
}

// Fallback to Imagen if needed
async function generateWithImagen(body: RequestBody, prompt: string) {
  try {
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken.token}`,
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 2,
          aspectRatio: body.aspectRatio.replace(':', ':'),
          safetyFilterLevel: 'block_some',
          personGeneration: 'allow_adult',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Imagen API error: ${response.status}`);
    }

    const data = await response.json();
    const images = data.predictions?.map(
      (p: { bytesBase64Encoded: string }) => `data:image/png;base64,${p.bytesBase64Encoded}`
    ) || [];

    return NextResponse.json({
      success: true,
      images,
      prompt,
      model: 'imagen-3',
    });
  } catch (error) {
    console.error('Imagen fallback error:', error);
    return NextResponse.json({
      success: false,
      error: 'Both Gemini and Imagen generation failed',
      images: [],
    });
  }
}

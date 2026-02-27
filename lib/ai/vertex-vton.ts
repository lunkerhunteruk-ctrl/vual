// Virtual Try-On using Gemini API for image generation

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.1-flash-image-preview';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

export interface VTONRequest {
  personImage: string; // Base64 encoded image
  garmentImage: string; // Base64 encoded image
  category: 'upper_body' | 'lower_body' | 'dresses' | 'footwear';
  mode?: 'standard' | 'high_quality' | 'add_item';
}

export interface VTONResponse {
  resultImage: string; // Base64 encoded result image
  confidence: number;
  processingTime: number;
}

// Call Gemini API directly with image generation support
async function callGeminiImageAPI(parts: any[]): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: '3:4',
          imageSize: '1K',
          image_size: '1K',
        },
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
    console.error('[Gemini API] Error response:', errorText);
    throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// Generate virtual try-on using Gemini API
export async function generateVTON(request: VTONRequest): Promise<VTONResponse> {
  const startTime = Date.now();
  const MAX_RETRIES = 3;

  const categoryDesc = request.category === 'upper_body' ? 'top/shirt/blouse' :
                       request.category === 'lower_body' ? 'pants/skirt/bottom' :
                       request.category === 'footwear' ? 'shoes/footwear' :
                       'dress/full outfit';

  const isAddingToExisting = request.mode === 'add_item';

  const promptVariants = [
    isAddingToExisting
      ? `Generate a professional fashion photo. The model in the first image is already wearing some clothing.
ADD the ${categoryDesc} from the second image to complete the outfit.

CRITICAL INSTRUCTIONS:
- KEEP the model's face, body type, pose, skin tone, and ALL EXISTING CLOTHING from the first image
- ADD the new ${categoryDesc} from the second image - it must look IDENTICAL (same color, pattern, texture, style)
- The result should show the model wearing ALL the existing clothes AND the new ${categoryDesc}
- If adding pants/bottom: keep the top unchanged, add the pants
- If adding top: keep the bottom unchanged, add the top
- If adding shoes/footwear: keep ALL existing clothes unchanged, just add the shoes on the feet
- Studio white background, professional lighting
- Full body shot showing the complete outfit including feet
- High quality, 8K resolution, fashion magazine style`
      : `Generate a professional fashion photo. Take the model from the first image and dress them in the ${categoryDesc} garment from the second image.

CRITICAL INSTRUCTIONS:
- The model's face, body type, pose, and skin tone must match EXACTLY the person in the first image
- The garment must look IDENTICAL to the second image - same color, pattern, texture, and style
- Create a realistic fashion photography result with the model wearing this exact garment
- Studio white background, professional lighting
- Full body shot showing the complete outfit
- High quality, 8K resolution, fashion magazine style`,
    isAddingToExisting
      ? `E-commerce product visualization: Show the person from image 1 wearing their current outfit plus the ${categoryDesc} product from image 2. Professional product photography, white background, full body.`
      : `E-commerce product visualization: Show the person from image 1 wearing the ${categoryDesc} product from image 2. Professional product photography, white background, full body.`,
    isAddingToExisting
      ? `Fashion catalog photo: Combine the outfit from image 1 with the ${categoryDesc} from image 2 on the same person. Clean white background.`
      : `Fashion catalog photo: Show the person in image 1 wearing the ${categoryDesc} from image 2. Clean white background.`,
  ];

  const personImageData = request.personImage.replace(/^data:image\/\w+;base64,/, '');
  const garmentImageData = request.garmentImage.replace(/^data:image\/\w+;base64,/, '');

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const prompt = promptVariants[attempt] || promptVariants[promptVariants.length - 1];
      console.log(`[VTON] Attempt ${attempt + 1}/${MAX_RETRIES} using ${GEMINI_MODEL}...`);

      const parts = [
        { text: prompt },
        { inline_data: { mime_type: 'image/jpeg', data: personImageData } },
        { inline_data: { mime_type: 'image/jpeg', data: garmentImageData } },
      ];

      const data = await callGeminiImageAPI(parts);
      const processingTime = Date.now() - startTime;

      const candidates = data.candidates || [];
      const finishReason = candidates[0]?.finishReason;
      console.log(`[VTON Debug] Attempt ${attempt + 1} - finishReason: ${finishReason}, parts: ${candidates[0]?.content?.parts?.length || 0}`);

      if (finishReason === 'IMAGE_PROHIBITED_CONTENT') {
        console.log(`[VTON] Content filter triggered on attempt ${attempt + 1}, ${attempt + 1 < MAX_RETRIES ? 'retrying...' : 'no more retries'}`);
        lastError = new Error(`IMAGE_PROHIBITED_CONTENT on attempt ${attempt + 1}`);
        if (attempt + 1 < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000));
        }
        continue;
      }

      // Extract generated image
      for (const candidate of candidates) {
        const responseParts = candidate.content?.parts || [];
        for (const part of responseParts) {
          if (part.text) {
            console.log('[VTON Debug] Text response:', part.text);
          }
          const inlineData = part.inline_data || part.inlineData;
          if (inlineData?.data) {
            const base64 = inlineData.data;
            const mimeType = inlineData.mime_type || inlineData.mimeType || 'image/png';
            console.log(`[VTON] Success on attempt ${attempt + 1}, mimeType: ${mimeType}, size: ${base64.length}`);
            return {
              resultImage: `data:${mimeType};base64,${base64}`,
              confidence: 0.9,
              processingTime,
            };
          }
        }
      }

      lastError = new Error(`No image in response. finishReason=${finishReason}`);
    } catch (error) {
      console.error(`[VTON] Attempt ${attempt + 1} error:`, error);
      lastError = error as Error;
    }
  }

  throw new Error(`VTON failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
}


// Utility: Convert image URL to base64
export async function imageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return base64;
}

// Utility: Convert base64 to data URL
export function base64ToDataUrl(base64: string, mimeType: string = 'image/png'): string {
  if (base64.startsWith('data:')) {
    return base64;
  }
  return `data:${mimeType};base64,${base64}`;
}

// Check if AI services are properly configured
export async function checkVertexAIConnection(): Promise<{
  connected: boolean;
  projectId: string | undefined;
  location: string;
  error?: string;
}> {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Test Gemini API with a simple request
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello' }] }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned ${response.status}`);
    }

    return {
      connected: true,
      projectId: PROJECT_ID,
      location: LOCATION,
    };
  } catch (error) {
    return {
      connected: false,
      projectId: PROJECT_ID,
      location: LOCATION,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

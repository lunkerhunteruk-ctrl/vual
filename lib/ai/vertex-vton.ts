// Virtual Try-On using Gemini API for image generation
// Supports coordinate try-on: multiple garments in a single generation

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.1-flash-image-preview';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const MAX_RETRIES = 3;

export interface VTONRequest {
  personImage: string; // Base64 data URL
  garmentImages: string[]; // Array of base64 data URLs (1-5 items)
  categories: string[]; // Category per garment (same order)
}

// Legacy single-garment interface for backward compatibility
export interface VTONRequestLegacy {
  personImage: string;
  garmentImage: string;
  category: string;
  mode?: 'standard' | 'high_quality' | 'add_item';
}

export interface VTONResponse {
  resultImage: string; // Base64 encoded result image
  confidence: number;
  processingTime: number;
}

function extractBase64(dataUrl: string): { data: string; mimeType: string } | null {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  // Raw base64 without data URL prefix
  if (!dataUrl.startsWith('data:') && dataUrl.length > 100) {
    return { mimeType: 'image/jpeg', data: dataUrl };
  }
  return null;
}

// Call Gemini API directly with image generation support
async function callGeminiImageAPI(
  parts: any[],
  aspectRatio: string = '3:4',
  imageSize: string = '1K'
): Promise<any> {
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
          aspectRatio,
          imageSize,
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

function categoryLabel(cat: string): string {
  switch (cat) {
    case 'upper_body': return 'top/shirt/blouse';
    case 'lower_body': return 'pants/skirt/bottom';
    case 'footwear': return 'shoes/footwear';
    case 'dresses': return 'dress/full outfit';
    case 'bags': return 'bag/handbag';
    case 'accessories': return 'accessory/scarf/hat';
    case 'jewelry_ring': return 'ring';
    case 'jewelry_necklace': return 'necklace/pendant';
    case 'jewelry_earring': return 'earring';
    case 'jewelry_bracelet': return 'bracelet/bangle';
    default: return 'garment';
  }
}

function buildCoordinatePrompt(categories: string[]): string {
  const garmentDescs: string[] = [];
  for (let i = 0; i < categories.length; i++) {
    const label = categoryLabel(categories[i]);
    const ordinal = i === 0 ? 'first' : i === 1 ? 'second' : i === 2 ? 'third' : i === 3 ? 'fourth' : 'fifth';
    garmentDescs.push(`the ${label} from the ${ordinal} garment image`);
  }

  const allGarments = garmentDescs.join(', ');

  return [
    `CRITICAL INSTRUCTION - GARMENT FIDELITY IS THE TOP PRIORITY:`,
    `You MUST reproduce the EXACT garments from the provided reference images with 100% accuracy.`,
    `DO NOT create similar-looking alternatives. The garments must be PIXEL-PERFECT matches to the originals.`,
    ``,
    `GARMENT DETAILS TO PRESERVE EXACTLY:`,
    `- Exact color and shade (no color shifts)`,
    `- Exact pattern, print, or texture`,
    `- Exact neckline shape and style`,
    `- Exact sleeve length, cuff style, and details`,
    `- Exact buttons, zippers, pockets, seams, and all design elements`,
    `- Exact fabric drape and material appearance`,
    `- Exact silhouette and fit`,
    ``,
    `Generate a professional fashion photo for virtual try-on.`,
    `The FIRST image is the person's photo — use their EXACT face, body type, pose, and skin tone.`,
    `IMPORTANT: Completely REMOVE whatever clothing the person is currently wearing. Replace ALL existing garments entirely with ONLY the provided reference garments. No part of the original clothing should be visible.`,
    `Dress this person in a coordinated outfit using ALL of the following garments: ${allGarments}.`,
    ``,
    `The result must show the person wearing ALL ${categories.length} items together as a complete coordinated outfit.`,
    `Studio white background, professional lighting.`,
    `Full body shot showing the complete outfit including feet.`,
    `High quality, 8K resolution, fashion magazine style.`,
    `CRITICAL: Generate EXACTLY ONE single person. Do NOT create collages, split views, or multiple copies.`,
    `CRITICAL: DO NOT render any text, labels, watermarks, or words on the image.`,
    `REMINDER: The garments MUST be exact copies from the reference images.`,
  ].filter(Boolean).join(' ');
}

function buildSimplifiedCoordinatePrompt(categories: string[]): string {
  const items = categories.map((c) => categoryLabel(c)).join(', ');
  return `Virtual try-on: Show the person from the first image wearing these items from the garment images: ${items}. Remove all original clothing the person is wearing — only the provided garments should be visible. Professional fashion photography, white background, full body. One person only, no collages. Garments must match the reference images exactly.`;
}

function buildMinimalCoordinatePrompt(categories: string[]): string {
  const items = categories.map((c) => categoryLabel(c)).join(', ');
  return `Fashion photo: Person from image 1 wearing the ${items} from the other images. Remove all original clothing. White background, full body, one person.`;
}

// --- Jewelry VTON helpers ---

function isJewelryCategory(cat: string): boolean {
  return ['jewelry_ring', 'jewelry_necklace', 'jewelry_earring', 'jewelry_bracelet'].includes(cat);
}

function jewelryBodyPart(cat: string): string {
  switch (cat) {
    case 'jewelry_ring': return 'hand and fingers';
    case 'jewelry_necklace': return 'neck and décolletage';
    case 'jewelry_earring': return 'ear and side of face';
    case 'jewelry_bracelet': return 'wrist and forearm';
    default: return 'hand';
  }
}

function buildJewelryVTONPrompt(category: string): string {
  const bodyPart = jewelryBodyPart(category);
  return [
    `CRITICAL — JEWELRY FIDELITY IS THE TOP PRIORITY:`,
    `Reproduce the EXACT jewelry from the reference image with 100% accuracy.`,
    `Preserve exact metal color/finish, gemstone details, design pattern, and proportions.`,
    ``,
    `Virtual try-on: The FIRST image shows the customer's ${bodyPart}.`,
    `Place the jewelry piece from the SECOND image naturally on their ${bodyPart}.`,
    `Close-up shot focused on the ${bodyPart} with the jewelry.`,
    `Clean, elegant background. Sharp focus on jewelry details.`,
    `Professional jewelry photography quality.`,
    `CRITICAL: Show ONLY the ${bodyPart} area — close-up, NOT full body.`,
    `CRITICAL: DO NOT render any text, labels, or watermarks.`,
    `CRITICAL: Generate ONE single close-up shot. No collages or split views.`,
  ].filter(Boolean).join(' ');
}

function buildSimplifiedJewelryVTONPrompt(category: string): string {
  const bodyPart = jewelryBodyPart(category);
  return `Virtual try-on: Place the jewelry from image 2 on the ${bodyPart} from image 1. Close-up, sharp focus, clean background. One image only.`;
}

function buildMinimalJewelryVTONPrompt(category: string): string {
  const bodyPart = jewelryBodyPart(category);
  return `Photo: jewelry from image 2 on the ${bodyPart} from image 1. Close-up, clean background.`;
}

// Generate virtual try-on — coordinate mode (all garments in one generation)
export async function generateVTON(request: VTONRequest): Promise<VTONResponse> {
  const startTime = Date.now();

  if (request.garmentImages.length === 0) {
    throw new Error('At least one garment image is required');
  }

  // Build image parts: person first, then all garments
  const imageParts: any[] = [];

  // Person image
  const personData = extractBase64(request.personImage);
  if (!personData) {
    throw new Error('Invalid person image data');
  }
  imageParts.push({
    inline_data: { mime_type: personData.mimeType, data: personData.data },
  });

  // All garment images
  for (const garmentImg of request.garmentImages) {
    const garmentData = extractBase64(garmentImg);
    if (garmentData) {
      imageParts.push({
        inline_data: { mime_type: garmentData.mimeType, data: garmentData.data },
      });
    }
  }

  // Detect jewelry mode from first category
  const jewelry = request.categories.length > 0 && isJewelryCategory(request.categories[0]);
  const jewelryCat = jewelry ? request.categories[0] : '';

  const promptVariants = jewelry
    ? [
        buildJewelryVTONPrompt(jewelryCat),
        buildSimplifiedJewelryVTONPrompt(jewelryCat),
        buildMinimalJewelryVTONPrompt(jewelryCat),
      ]
    : [
        buildCoordinatePrompt(request.categories),
        buildSimplifiedCoordinatePrompt(request.categories),
        buildMinimalCoordinatePrompt(request.categories),
      ];

  // Jewelry: 1:1 aspect; Fashion: 3:4
  const vtonAspectRatio = jewelry ? '1:1' : '3:4';
  const vtonImageSize = '1K';

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const prompt = promptVariants[attempt] || promptVariants[promptVariants.length - 1];
      console.log(
        `[VTON] Attempt ${attempt + 1}/${MAX_RETRIES}, ${request.garmentImages.length} item(s)${jewelry ? ' (jewelry)' : ''}...`
      );

      const parts = [{ text: prompt }, ...imageParts];
      const data = await callGeminiImageAPI(parts, vtonAspectRatio, vtonImageSize);
      const processingTime = Date.now() - startTime;

      const candidates = data.candidates || [];
      const finishReason = candidates[0]?.finishReason;

      if (finishReason === 'IMAGE_PROHIBITED_CONTENT') {
        console.log(
          `[VTON] Content filter on attempt ${attempt + 1}, ${attempt + 1 < MAX_RETRIES ? 'retrying...' : 'no more retries'}`
        );
        lastError = new Error(`IMAGE_PROHIBITED_CONTENT on attempt ${attempt + 1}`);
        if (attempt + 1 < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000));
        }
        continue;
      }

      // Extract generated image
      for (const candidate of candidates) {
        const responseParts = candidate.content?.parts || [];
        for (const part of responseParts) {
          const inlineData = part.inline_data || part.inlineData;
          if (inlineData?.data) {
            const base64 = inlineData.data;
            const mimeType = inlineData.mime_type || inlineData.mimeType || 'image/png';
            console.log(
              `[VTON] Success on attempt ${attempt + 1}, mimeType: ${mimeType}, size: ${base64.length}`
            );
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

// Legacy single-garment wrapper for backward compatibility
export async function generateVTONLegacy(request: VTONRequestLegacy): Promise<VTONResponse> {
  return generateVTON({
    personImage: request.personImage,
    garmentImages: [request.garmentImage],
    categories: [request.category],
  });
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

// Gemini AI Integration for product descriptions, chat, and more
// Uses Google AI SDK

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiResponse {
  text: string;
  finishReason: string;
}

export interface GenerateContentParams {
  prompt: string;
  model?: 'gemini-pro' | 'gemini-pro-vision';
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
}

export interface GenerateProductDescriptionParams {
  productName: string;
  category: string;
  materials?: string;
  features?: string[];
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'luxury' | 'playful';
  language?: 'en' | 'ja';
}

export interface ChatParams {
  messages: GeminiMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

// Generate content using Gemini
export async function generateContent(params: GenerateContentParams): Promise<GeminiResponse> {
  const {
    prompt,
    model = 'gemini-pro',
    maxTokens = 1024,
    temperature = 0.7,
    topP = 0.95,
    topK = 40,
  } = params;

  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured');
  }

  const response = await fetch(
    `${GEMINI_API_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
          topP,
          topK,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];

  return {
    text: candidate?.content?.parts?.[0]?.text || '',
    finishReason: candidate?.finishReason || 'UNKNOWN',
  };
}

// Generate product description
export async function generateProductDescription(
  params: GenerateProductDescriptionParams
): Promise<string> {
  const {
    productName,
    category,
    materials,
    features,
    targetAudience,
    tone = 'professional',
    language = 'en',
  } = params;

  const toneGuide = {
    professional: 'Write in a professional and informative tone.',
    casual: 'Write in a friendly and approachable tone.',
    luxury: 'Write in an elegant and sophisticated tone that conveys exclusivity.',
    playful: 'Write in a fun and energetic tone.',
  };

  const languageGuide = language === 'ja'
    ? 'Write the description in Japanese (日本語で書いてください).'
    : 'Write the description in English.';

  const prompt = `
Generate a compelling product description for an e-commerce website.

Product Name: ${productName}
Category: ${category}
${materials ? `Materials: ${materials}` : ''}
${features?.length ? `Key Features: ${features.join(', ')}` : ''}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}

${toneGuide[tone]}
${languageGuide}

Keep the description concise (2-3 paragraphs) and highlight the product's unique selling points.
Include a brief mention of styling suggestions if applicable.
Do not use markdown formatting, write in plain text.
`.trim();

  const response = await generateContent({
    prompt,
    temperature: 0.7,
    maxTokens: 500,
  });

  return response.text;
}

// Chat with context
export async function chat(params: ChatParams): Promise<GeminiResponse> {
  const {
    messages,
    systemPrompt,
    maxTokens = 1024,
    temperature = 0.7,
  } = params;

  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured');
  }

  const contents = messages.map(msg => ({
    role: msg.role,
    parts: msg.parts,
  }));

  // Add system prompt as the first user message if provided
  if (systemPrompt) {
    contents.unshift({
      role: 'user',
      parts: [{ text: `System: ${systemPrompt}` }],
    });
    contents.splice(1, 0, {
      role: 'model',
      parts: [{ text: 'Understood. I will follow these instructions.' }],
    });
  }

  const response = await fetch(
    `${GEMINI_API_URL}/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];

  return {
    text: candidate?.content?.parts?.[0]?.text || '',
    finishReason: candidate?.finishReason || 'UNKNOWN',
  };
}

// Generate SEO metadata
export async function generateSEOMetadata(
  productName: string,
  description: string,
  category: string
): Promise<{ title: string; metaDescription: string; keywords: string[] }> {
  const prompt = `
Generate SEO metadata for this product:
Product: ${productName}
Category: ${category}
Description: ${description}

Return a JSON object with:
- title: An SEO-optimized title (max 60 characters)
- metaDescription: A compelling meta description (max 160 characters)
- keywords: An array of 5-8 relevant keywords

Return only valid JSON, no explanation.
`.trim();

  const response = await generateContent({
    prompt,
    temperature: 0.3,
    maxTokens: 300,
  });

  try {
    return JSON.parse(response.text);
  } catch {
    return {
      title: productName,
      metaDescription: description.slice(0, 160),
      keywords: [category],
    };
  }
}

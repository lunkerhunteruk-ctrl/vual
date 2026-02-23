import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

// Mock product database - in production, fetch from real database
const mockProducts = [
  { id: '1', name: 'Oversized Blazer', category: 'Outer', color: 'black', style: 'casual-formal' },
  { id: '2', name: 'Silk Blouse', category: 'Tops', color: 'white', style: 'elegant' },
  { id: '3', name: 'Wool Cardigan', category: 'Tops', color: 'beige', style: 'casual' },
  { id: '4', name: 'Cotton T-Shirt', category: 'Tops', color: 'white', style: 'casual' },
  { id: '5', name: 'Cashmere Sweater', category: 'Tops', color: 'gray', style: 'elegant-casual' },
  { id: '6', name: 'Denim Jeans', category: 'Bottoms', color: 'blue', style: 'casual' },
  { id: '7', name: 'Pleated Skirt', category: 'Bottoms', color: 'black', style: 'elegant' },
  { id: '8', name: 'Wide Pants', category: 'Bottoms', color: 'beige', style: 'casual-formal' },
  { id: '9', name: 'Silk Dress', category: 'Dress', color: 'navy', style: 'elegant' },
  { id: '10', name: 'Leather Bag', category: 'Bag', color: 'brown', style: 'classic' },
];

// Category pairing logic
const categoryPairs: Record<string, string[]> = {
  'Tops': ['Bottoms'],
  'Outer': ['Tops', 'Bottoms'],
  'Bottoms': ['Tops'],
  'Dress': [],
  'Bag': [],
};

export async function POST(request: NextRequest) {
  try {
    const { keyItemId } = await request.json();

    if (!keyItemId) {
      return NextResponse.json(
        { error: 'Key item ID is required' },
        { status: 400 }
      );
    }

    // Get key item details
    const keyItem = mockProducts.find(p => p.id === keyItemId);
    if (!keyItem) {
      return NextResponse.json(
        { error: 'Key item not found' },
        { status: 404 }
      );
    }

    // Get possible categories for pairing
    const pairCategories = categoryPairs[keyItem.category] || [];
    if (pairCategories.length === 0) {
      return NextResponse.json({
        success: true,
        suggestedItemId: null,
        reason: 'No pairing needed for this category',
      });
    }

    // Get candidate items
    const candidates = mockProducts.filter(p =>
      pairCategories.includes(p.category) && p.id !== keyItemId
    );

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        suggestedItemId: null,
        reason: 'No matching items in inventory',
      });
    }

    // Use Gemini to suggest the best coordinate
    if (!PROJECT_ID) {
      // Fallback to simple matching if Vertex AI not configured
      const suggested = candidates[0];
      return NextResponse.json({
        success: true,
        suggestedItemId: suggested.id,
        suggestedItem: suggested,
        reason: 'Default selection (Vertex AI not configured)',
      });
    }

    const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
    const model = vertexAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `You are a professional fashion stylist. Given a key fashion item, suggest the best matching item from the available inventory for a cohesive coordinate.

Key Item:
- Name: ${keyItem.name}
- Category: ${keyItem.category}
- Color: ${keyItem.color}
- Style: ${keyItem.style}

Available items to pair with:
${candidates.map((c, i) => `${i + 1}. ID: ${c.id}, Name: ${c.name}, Category: ${c.category}, Color: ${c.color}, Style: ${c.style}`).join('\n')}

Consider color harmony, style compatibility, and overall balance. Respond with ONLY the ID number of the best matching item, nothing else.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const response = await result.response;
    const suggestedId = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    // Validate the response
    const suggestedItem = candidates.find(c => c.id === suggestedId);

    if (suggestedItem) {
      return NextResponse.json({
        success: true,
        suggestedItemId: suggestedItem.id,
        suggestedItem,
        reason: 'AI-suggested coordinate',
      });
    }

    // Fallback if AI response is invalid
    return NextResponse.json({
      success: true,
      suggestedItemId: candidates[0].id,
      suggestedItem: candidates[0],
      reason: 'Default selection (AI response unclear)',
    });
  } catch (error) {
    console.error('Suggest coordinate error:', error);

    // Return a default suggestion on error
    return NextResponse.json({
      success: true,
      suggestedItemId: '6', // Default to denim jeans
      reason: 'Default fallback',
    });
  }
}

/**
 * Prompt builder for batch queue.
 * Wraps the payload from batch_queue into the format expected by buildPrompt in route.ts.
 *
 * Since buildPrompt is deeply embedded in route.ts with many dependencies,
 * we replicate a simplified version here for batch use.
 */

export function buildPromptFromPayload(payload: any): string {
  const {
    modelSettings = {},
    modelImage,
    background = '',
    customPrompt = '',
    aspectRatio = '3:4',
    locale = 'ja',
    artistic,
    sceneVariant,
    detailMode,
    shotIndex,
    totalShots,
    garmentImages = [],
    secondGarmentImages = [],
    thirdGarmentImages = [],
    fourthGarmentImages = [],
    fifthGarmentImages = [],
  } = payload;

  const modelDesc = modelImage
    ? 'Generate an image using the EXACT model appearance from the provided model reference images. A full-body reference AND a face close-up crop are provided — use the close-up to ensure the face, facial features, expression, AND MAKEUP are reproduced with maximum accuracy and consistency across all shots. Face, body type, skin tone, and all visible cosmetics (eye makeup, lip color, brow shape, contour) must match exactly.'
    : `A fashion model`;

  const garmentDesc = garmentImages.length > 0
    ? `wearing EXACTLY the garment shown in the provided reference images`
    : '';

  const secondDesc = secondGarmentImages.length > 0 ? ' and also wearing the item from the next garment image' : '';
  const thirdDesc = thirdGarmentImages.length > 0 ? ' and wearing the shoes/accessories from the following garment image' : '';
  const fourthDesc = fourthGarmentImages.length > 0 ? ' and carrying/wearing the bag/accessory from the next accessory image' : '';
  const fifthDesc = fifthGarmentImages.length > 0 ? ' and also wearing/using the accessory from the next image' : '';

  const parts = [
    'CRITICAL INSTRUCTION - GARMENT FIDELITY IS THE TOP PRIORITY:',
    'You MUST reproduce the EXACT garments from the provided reference images with 100% accuracy.',
    'DO NOT create similar-looking alternatives. The garments must be PIXEL-PERFECT matches to the originals.',
    '',
    'GARMENT DETAILS TO PRESERVE EXACTLY:',
    '- Exact color and shade (no color shifts)',
    '- Exact pattern, print, or texture',
    '- Exact neckline shape and style',
    '- Exact sleeve length, cuff style, and details',
    '- Exact buttons, zippers, pockets, seams, and all design elements',
    '- Exact fabric drape and material appearance',
    '- Exact silhouette and fit',
    '',
    'Professional high-end fashion photography.',
    modelDesc,
    modelSettings.height ? `who is ${modelSettings.height}cm tall,` : '',
    modelSettings.pose ? `${modelSettings.pose},` : '',
    garmentDesc + secondDesc + thirdDesc + fourthDesc + fifthDesc + '.',
    customPrompt
      ? customPrompt.length >= 80
        ? `SCENE & STYLING DIRECTION (THIS IS THE PRIMARY CREATIVE BRIEF — follow it faithfully): ${customPrompt}`
        : `MANDATORY STYLING (DO NOT IGNORE): ${customPrompt}.`
      : '',
    customPrompt && customPrompt.length >= 80 ? '' : (background || ''),
    'Sharp focus, editorial fashion magazine quality, ultra high resolution 8K.',
    'Extremely detailed, photorealistic rendering with fine texture details.',
    'Realistic skin texture, natural pose, professional model.',
    'EXPRESSION: Emotionless, eternal beauty — a face that reveals nothing, like a sculpture. No smile, no warmth, no sadness. Perfectly composed, untouchable, timeless.',
    'LIGHTING PRIORITY: Even when shooting at indoor locations or inside buildings, actively seek BRIGHT, well-lit scenes. Position the model near windows, doorways, open courtyards, or any source of natural daylight.',
    'IMPORTANT: Show the full body including feet if shoes/footwear are included.',
    'IMPORTANT: The model must ALWAYS stand on dry ground.',
    'CRITICAL: DO NOT render any text, labels, watermarks, or words on the image.',
    `OUTPUT FORMAT: Generate the image in ${aspectRatio} aspect ratio.`,
    'REMINDER: The garments MUST be exact copies from the reference images - not interpretations or similar items.',
  ];

  return parts.filter(Boolean).join(' ');
}

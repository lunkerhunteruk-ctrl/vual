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
    offshot,
    offshotVariant = 'A',
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
  const fullGarmentDesc = garmentDesc + secondDesc + thirdDesc + fourthDesc + fifthDesc;

  // ============ OFFSHOT MODE ============
  if (offshot) {
    const seed = (shotIndex || 0) * 7 + Math.floor(Date.now() / 60000);
    const pick = (arr: string[]) => arr[seed % arr.length];
    const locationNote = customPrompt ? `LOCATION: ${customPrompt}` : `Setting: ${background}`;
    const cityName = customPrompt || '';

    if (offshotVariant === 'A') {
      return buildOffshotA(modelDesc, fullGarmentDesc, locationNote, pick, shotIndex);
    } else {
      return buildOffshotB(modelDesc, fullGarmentDesc, cityName, pick, shotIndex);
    }
  }

  // ============ NORMAL MODE ============
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
    fullGarmentDesc + '.',
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


function buildOffshotA(modelDesc: string, garmentDesc: string, locationNote: string, pick: (arr: string[]) => string, shotIndex?: number): string {
  const offshotDirective = `CRITICAL INSTRUCTION: This is NOT a fashion photograph. This is a RAW, CANDID, BEHIND-THE-SCENES snapshot taken by a crew member with a film camera during downtime. The model is NOT posing, NOT performing, NOT aware of being photographed (or only just noticed). This must look like a REAL moment captured by accident — like a photo you'd find on a photographer's contact sheet that was never meant to be published.

ANTI-FASHION RULES:
- The model must NOT be centered perfectly in frame. Off-center composition, cut-off limbs, tilted horizon are OK and encouraged.
- NO perfect lighting setup. Use only available ambient light — overhead fluorescent, window light, practical lamps.
- The model's body language must be RELAXED and UNPOSED — slouching, leaning, curled up, mid-motion. Never standing straight with good posture like a fashion model.
- Background should show REAL environment clutter — cables, equipment cases, paper cups, chairs, bags, coats on hooks, etc.
- The overall feeling should be intimate, voyeuristic, unpolished — like a diary photo, NOT a magazine spread.`;

  const leica = 'Shot on Leica M6 with Summicron 35mm f/2, Kodak Portra 400 film. Handheld, slightly imperfect focus.';
  const leicaBW = 'Shot on Leica M6 with Summicron 35mm f/2, Kodak Tri-X 400 black and white film. Handheld, motion blur allowed.';
  const qualityColor = 'QUALITY: Heavy film grain, slightly warm color cast, soft focus edges, natural available light only. The framing is deliberately imperfect — extra headroom, slight tilt, subject off-center. Looks like it was shot quickly without careful composition. 3:4 portrait format. No text, no watermarks.';
  const qualityBW = 'QUALITY: Black and white, heavy grain, high contrast, documentary style. Imperfect framing. 3:4 portrait format. No text, no watermarks.';
  const qualityGolden = 'QUALITY: Heavy film grain, golden late-afternoon light, slightly faded warm colors. Casual, imperfect composition with environmental context. 3:4 portrait format. No text, no watermarks.';

  const categories = [
    {
      actions: [
        'holding a paper coffee cup with both hands, steam rising faintly. She looks slightly sleepy, not yet "on" for the camera',
        'sitting cross-legged reading a worn paperback book, completely absorbed',
        'scrolling through her phone with one thumb, a faint private smile on her lips',
        'staring out a window or into the empty distance, chin resting on her hand. Completely zoned out',
        'sitting with legs stretched out, eating a pastry from a paper bag on her lap. Completely unglamorous and real',
      ],
      wardrobe: 'wearing casual clothes OR partially styled — maybe the garment from the reference images thrown over a plain t-shirt',
      location: `${locationNote} — backstage/waiting area.`,
      film: leica, quality: qualityColor,
      expression: 'Drowsy, private, unguarded — a real human moment before the mask goes on. NOT posing.',
    },
    {
      actions: [
        'checking herself in a small mirror, adjusting a collar with precise fingers',
        'tying her shoes, crouched down, hair falling forward',
        'buttoning the cuff of her sleeve with focused attention',
      ],
      wardrobe: `${garmentDesc} — partially dressed, still getting ready`,
      location: `${locationNote} — nearby makeshift prep area.`,
      film: leica,
      quality: 'QUALITY: Heavy film grain, warm tungsten color from practical lights, slightly underexposed, candid. Shallow depth of field. 3:4 portrait format. No text, no watermarks.',
      expression: 'Focused, self-contained, absorbed in the task. NOT looking at camera.',
    },
    {
      actions: [
        'walking through a corridor toward the shoot location, looking at her phone',
        'walking ahead of the camera, seen from behind, slightly motion-blurred',
        'standing in a doorway between two spaces, half in shadow and half in light',
      ],
      wardrobe: garmentDesc,
      location: `${locationNote} — corridor or pathway.`,
      film: leicaBW, quality: qualityBW,
      expression: 'Absent-minded, private. NOT performing. Just existing between moments.',
    },
    {
      actions: [
        'leaning against a wall with eyes half-closed, drinking water from a plastic bottle',
        'sitting on stone steps, knees drawn up, arms wrapped around them, staring at nothing',
        'perched on a windowsill, one leg dangling, looking out at the view with a quiet, private expression',
      ],
      wardrobe: `${garmentDesc} — still in full wardrobe but posture completely relaxed`,
      location: `${locationNote} — quiet corner during a break.`,
      film: leica,
      quality: 'QUALITY: Heavy film grain, available light, slightly overexposed highlights, warm. Casual framing — not centered, some negative space. 3:4 portrait format. No text, no watermarks.',
      expression: 'Tired but beautiful. The exhaustion showing through the perfect makeup.',
    },
    {
      actions: [
        'has just noticed the photographer taking a candid shot. She turns toward the camera with a look between "really?" and a suppressed smile',
        'covers her face partially with one hand, laughing silently — caught mid-laugh',
        'looks directly into the lens with a deadpan expression, deliberately NOT smiling — a playful standoff',
      ],
      wardrobe: garmentDesc,
      location: `${locationNote}.`,
      film: leica,
      quality: 'QUALITY: Heavy film grain, warm tones, slightly soft focus (shot quickly), natural light. The moment feels stolen. 3:4 portrait format. No text, no watermarks.',
      expression: 'A flicker of real personality. NOT a posed expression — genuine, spontaneous, human.',
    },
    {
      actions: [
        'scrolling her phone in the now-quiet location, completely off-duty',
        'walking away from camera toward the exit, silhouetted against the light outside. The day is done',
        'leaning on a railing or ledge, looking at the sunset or evening sky',
      ],
      wardrobe: 'still wearing the garments from the shoot but visibly relaxed — jacket unbuttoned, hair slightly mussed',
      location: `${locationNote} — after the shoot, crew packing up.`,
      film: leica, quality: qualityGolden,
      expression: 'Quiet relief, private contentment, completely off-duty.',
    },
  ];

  const idx = typeof shotIndex === 'number' ? shotIndex % categories.length : 0;
  const cat = categories[idx];
  const action = pick(cat.actions);

  return `${offshotDirective}

${cat.film}
${modelDesc}
The model is ${cat.wardrobe}.
${cat.location}

SCENE: The model ${action}.
EXPRESSION: ${cat.expression}
${cat.quality}

REMINDER: This is a BEHIND-THE-SCENES candid snapshot, NOT a fashion photo. Imperfect framing, relaxed posture, real environment.`;
}


function buildOffshotB(modelDesc: string, garmentDesc: string, cityName: string, pick: (arr: string[]) => string, shotIndex?: number): string {
  const directive = `CRITICAL INSTRUCTION: This is NOT a fashion photograph. This is a CANDID, AFTER-HOURS snapshot taken after the fashion shoot is done for the day. The model has wrapped the shoot, changed into more relaxed styling, and is now out with the crew — eating, drinking, celebrating, or traveling. The vibe is EVENING/NIGHT, warm lighting, intimate, real.

ANTI-FASHION RULES:
- This is a social moment, NOT a photoshoot. The model is relaxed, laughing, eating, drinking — being a real person.
- Framing is imperfect — shot on a phone or a small camera by a friend at the table. Off-center, slightly tilted, maybe someone's arm or glass partially blocking the frame.
- Lighting is warm ambient — restaurant candles, pub pendant lights, neon signs, car dashboard glow, street lamps. NO studio lighting.
- Other people (crew members, friends) may be partially visible — arms, shoulders, backs of heads, hands holding glasses.
- The overall feeling is private, warm, celebratory — like a photo posted on someone's close friends Instagram story.`;

  const leicaNight = 'Shot on Leica M6 with Summicron 35mm f/2, Kodak Portra 800 film pushed to 1600. Handheld, available light only, warm color cast from ambient lighting.';
  const qualityNight = 'QUALITY: Heavy film grain (Portra 800 pushed), warm amber/golden color cast from candles and ambient light, shallow depth of field, slightly soft focus. Intimate framing — feels like a friend took this photo. 3:4 portrait format. No text, no watermarks.';
  const qualityNeon = 'QUALITY: Heavy film grain, mixed color temperature — warm practicals vs cool neon. Cinematic night-time feel. Slightly underexposed with bright highlights from signs and lights. 3:4 portrait format. No text, no watermarks.';
  const qualityCar = 'QUALITY: Heavy film grain, mixed lighting — dashboard glow, passing streetlights creating moving shadows. Intimate, private, documentary feel. 3:4 portrait format. No text, no watermarks.';

  const cityContext = cityName
    ? `MANDATORY LOCATION: The venue MUST be in or very near ${cityName}. The restaurant, bar, or venue must look and feel authentically local to ${cityName} — local cuisine, local language on signs and menus, local architectural style, local people in the background. Do NOT set this in Japan, Tokyo, or any Asian city unless ${cityName} is explicitly in that region. The location must be geographically accurate to ${cityName}.`
    : 'The venue should feel authentic and local to the shooting location.';

  const categories = [
    {
      actions: [
        'raising a glass in a toast with crew members around a table full of food and drinks. Everyone is mid-cheer, glasses clinking',
        'laughing hard at something someone just said, leaning back in her chair, one hand on the table for balance',
        'taking a group selfie with 2-3 crew members, all squeezing into frame, phone held at arm\'s length',
        'arm around a crew member\'s shoulder, both holding drinks, posing for someone else\'s camera with relaxed, happy expressions',
      ],
      wardrobe: `${garmentDesc} — still in the shoot outfit but slightly loosened up: top button undone, sleeves pushed up, jacket draped over chair`,
      location: `A lively restaurant or dining venue. ${cityContext} The table is full of shared plates, glasses, bottles, napkins. Warm pendant lights overhead.`,
      film: leicaNight, quality: qualityNight,
      expression: 'Pure joy and relief. The shoot is done, the work was good, and now it\'s time to celebrate.',
    },
    {
      actions: [
        'mid-bite of food, chopsticks or fork halfway to her mouth, looking at the camera with a surprised "don\'t photograph me eating" expression',
        'resting her chin on both hands, elbows on the table, listening to a story with a warm, engaged smile',
        'holding up a piece of food toward the camera, showing it off proudly — "look how good this is"',
        'sitting sideways in her chair, legs crossed, one arm draped over the back, wine glass dangling from her fingers',
      ],
      wardrobe: `${garmentDesc} — jacket removed, draped over the back of her chair. More relaxed than during the shoot`,
      location: `An authentic local restaurant. ${cityContext} Beautiful food, ceramic dishes, candles. Warm lighting.`,
      film: leicaNight, quality: qualityNight,
      expression: 'Relaxed, social, enjoying the food and company.',
    },
    {
      actions: [
        'holding a pint of beer up at eye level, examining the golden color against the warm pub light',
        'mid-sip of beer, foam on her upper lip, eyes looking over the rim of the glass at the camera with a playful glint',
        'sitting at a worn wooden bar counter, one elbow on the bar, beer in hand, turned toward the camera with a relaxed smile',
        'cheers-ing beer glasses with someone, the glasses meeting in the center of frame, her face visible behind, grinning',
      ],
      wardrobe: `${garmentDesc} — casual, jacket off, sleeves rolled up`,
      location: `A cozy, authentic pub or beer hall. ${cityContext} Worn wooden bar, brass taps, warm amber lighting.`,
      film: leicaNight, quality: qualityNight,
      expression: 'Easy confidence, warmth. The relaxed version of her that only comes out after a few beers.',
    },
    {
      actions: [
        'holding an elegant cocktail — the glass catches the light, colorful liquid glowing. She looks at the camera over the rim with a knowing smile',
        'stirring her cocktail absently with a straw, looking directly at the camera with a warm, slightly tipsy smile',
        'laughing with her head thrown back slightly, cocktail held safely to the side',
        'taking a photo of her cocktail with her phone, caught being "that person" and not caring',
      ],
      wardrobe: `${garmentDesc} — styled but relaxed, the shoot look transformed into a night-out look`,
      location: `A stylish cocktail bar. ${cityContext} Dim lighting, candles, dark wood or marble bar top. Bottles backlit on shelves.`,
      film: leicaNight, quality: qualityNeon,
      expression: 'Magnetic, slightly mysterious. The nighttime version of her.',
    },
    {
      actions: [
        'sitting in the back seat of a car, head leaned against the window, city lights streaking past outside. She looks at the camera with tired but content eyes',
        'in the back seat, showing her phone screen to the person next to her, both laughing. Dashboard lights illuminating their faces',
        'looking out the car window at the night city, chin resting on her hand, reflections of neon signs on the glass overlapping her face',
        'sitting in the back seat, scrolling through the day\'s photos on her phone, face lit by the screen glow. A quiet smile',
      ],
      wardrobe: `${garmentDesc} — wrapped in a jacket or coat for warmth, slightly disheveled from a long day`,
      location: `Inside a car driving through the city at night. ${cityContext} City lights, neon signs visible through the windows. Dashboard instruments glowing softly.`,
      film: leicaNight, quality: qualityCar,
      expression: 'Tired contentment. The quiet aftermath of a great day and evening.',
    },
  ];

  const idx = typeof shotIndex === 'number' ? shotIndex % categories.length : 0;
  const cat = categories[idx];
  const action = pick(cat.actions);

  return `${directive}

${cat.film}
${modelDesc}
The model is ${cat.wardrobe}.
${cat.location}

SCENE: The model ${action}.
EXPRESSION: ${cat.expression}
${cat.quality}

REMINDER: This is an AFTER-HOURS candid snapshot — evening/night, warm ambient lighting, real social moment. NOT a fashion photo.`;
}

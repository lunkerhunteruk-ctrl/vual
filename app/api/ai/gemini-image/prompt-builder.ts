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
    } else if (offshotVariant === 'C') {
      return buildOffshotC(modelDesc, fullGarmentDesc, cityName, pick, shotIndex);
    } else if (offshotVariant === 'B') {
      return buildOffshotB(modelDesc, fullGarmentDesc, cityName, pick, shotIndex);
    } else {
      // Scene-specific offshot (breakfast, lunch, dinner, nightclub, pub-bar)
      return buildOffshotScene(offshotVariant, modelDesc, fullGarmentDesc, cityName, pick, shotIndex);
    }
  }

  // ============ DETAIL MODE ============
  if (detailMode) {
    return buildDetailPrompt(detailMode, modelDesc, fullGarmentDesc, customPrompt, background, aspectRatio);
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
    'ACCESSORIES RULE: The model must NOT wear any rings, bracelets, necklaces, or jewelry unless they are explicitly provided as reference images.',
    aspectRatio === '9:16'
      ? 'VERTICAL FORMAT (9:16 PORTRAIT ORIENTATION): Compose the image vertically. Use the height of the frame to show both the model AND the environment. Position the model around center or slightly below center — leave generous space ABOVE the model for sky, ceilings, architecture, or landscape. The vertical format should emphasize the HEIGHT and DEPTH of the location. Do NOT crop the scene tightly around the model — let the environment breathe.'
      : '',
    `OUTPUT FORMAT: Generate the image in ${aspectRatio} aspect ratio.`,
    'REMINDER: The garments MUST be exact copies from the reference images - not interpretations or similar items.',
  ];

  return parts.filter(Boolean).join(' ');
}


/** Apply Japan mode transformations to offshot prompt text */
function applyJapanMode(text: string, locationSource: string): string {
  if (!locationSource.includes('日本')) return text;
  return text
    .replace(/taken by a crew member/gi, 'taken by her close female friend')
    .replace(/a crew member/gi, 'her close female friend (a stylish Japanese woman of similar age)')
    .replace(/crew members/gi, 'her close female friend')
    .replace(/crew member/gi, 'her close female friend')
    .replace(/crew packing up/gi, 'a quiet moment together')
    .replace(/a mix of Japanese and international staff/gi, 'her close female friend, a stylish Japanese woman of similar age');
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
  const qualityColor = 'QUALITY: Heavy film grain, slightly warm color cast, soft focus edges, natural available light only. The framing is deliberately imperfect — extra headroom, slight tilt, subject off-center. Looks like it was shot quickly without careful composition. 3:4 portrait format. No text, no watermarks.';
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
      film: leica, quality: qualityColor,
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

  const raw = `${offshotDirective}

${cat.film}
${modelDesc}
The model is ${cat.wardrobe}.
${cat.location}

SCENE: The model ${action}.
EXPRESSION: ${cat.expression}
${cat.quality}

REMINDER: This is a BEHIND-THE-SCENES candid snapshot, NOT a fashion photo. Imperfect framing, relaxed posture, real environment.`;

  return applyJapanMode(raw, locationNote);
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

  const seed = (shotIndex || 0) * 7 + Math.floor(Date.now() / 60000);
  const restaurantGenres = [
    'traditional local cuisine restaurant',
    'Italian restaurant or trattoria',
    'French bistro or brasserie',
    'grilled meat restaurant',
    'local grill bar',
    'local pub with home-style bar food',
    'seafood restaurant',
    'steakhouse',
    'noodle or soup restaurant',
    'tapas bar',
    'wine bar with small plates',
    'local BBQ restaurant',
  ];
  const genreA = restaurantGenres[seed % restaurantGenres.length];
  const genreB = restaurantGenres[(seed + 3) % restaurantGenres.length];

  const categories = [
    // Shot 1: CAFE
    {
      actions: [
        'holding a latte or cappuccino, steam rising, looking out the window with a quiet, content expression',
        'mid-bite of a pastry or cake, fork in hand, looking at the camera with a "this is amazing" expression',
        'leaning back in her cafe chair, both hands wrapped around a warm coffee cup, watching people walk by outside',
        'laughing at something on her phone while stirring her coffee absently, completely relaxed',
        'sitting at a window seat, face half-lit by golden afternoon light, coffee cup on the table, reading her phone with a soft smile',
      ],
      wardrobe: `${garmentDesc} — still in the shoot outfit but jacket draped over the chair, slightly loosened up`,
      location: `A cozy local cafe near ${cityName || 'the shooting location'}. ${cityContext} Afternoon to early evening light. Coffee cups, pastries, warm interior.`,
      film: leicaNight, quality: qualityNight,
      expression: 'Quiet contentment. The first moment of real relaxation after wrapping the shoot.',
    },
    // Shot 2: RESTAURANT A
    {
      actions: [
        'mid-bite of food, chopsticks or fork halfway to her mouth, looking at the camera with a surprised expression mixed with amusement',
        'resting her chin on both hands, elbows on the table, listening to a story with a warm, engaged smile',
        'holding up a piece of food toward the camera, showing it off proudly',
        'raising a glass in a toast with crew members, everyone mid-cheer',
        'sitting sideways in her chair, legs crossed, one arm draped over the back, drink dangling from her fingers',
      ],
      wardrobe: `${garmentDesc} — jacket removed, draped over chair. More relaxed than during the shoot`,
      location: `A ${genreA} near ${cityName || 'the shooting location'}. ${cityContext} Beautiful food, drinks, lively atmosphere. Warm lighting, authentic interior.`,
      film: leicaNight, quality: qualityNight,
      expression: 'Relaxed, social, enjoying the food and company.',
    },
    // Shot 3: RESTAURANT B
    {
      actions: [
        'laughing hard at something someone just said, leaning back in her chair, eyes squeezed shut',
        'leaning over the table to look at someone\'s phone screen, pointing at something while holding her drink',
        'taking a group selfie with 2-3 crew members, all squeezing into frame',
        'standing up making a playful speech or toast, one hand holding a glass up',
        'mid-chew, cheeks slightly full, eyes wide as she realizes the camera is on her',
      ],
      wardrobe: `${garmentDesc} — outfit slightly loosened, sleeves pushed up, top button undone`,
      location: `A ${genreB} near ${cityName || 'the shooting location'}. ${cityContext} A second stop of the evening. Shared plates, bottles, warm pendant lights.`,
      film: leicaNight, quality: qualityNight,
      expression: 'Pure joy and relief. Celebrating with the crew.',
    },
    // Shot 4: BAR / PUB
    {
      actions: [
        'holding a drink up at eye level, examining it against the warm bar light with a satisfied expression',
        'mid-sip, eyes looking over the rim at the camera with a playful glint',
        'sitting at a bar counter, one elbow on the bar, drink in hand, turned toward the camera with a relaxed smile',
        'cheers-ing glasses with someone, her face visible behind the glasses, grinning',
        'stirring her cocktail absently, looking directly at the camera with a warm smile',
      ],
      wardrobe: `${garmentDesc} — casual, jacket off, sleeves rolled up. Completely comfortable`,
      location: `A cozy bar, pub, or drinking spot near ${cityName || 'the shooting location'}. ${cityContext} Warm amber lighting, bottles on shelves, lively but intimate.`,
      film: leicaNight, quality: qualityNeon,
      expression: 'Easy confidence, warmth. The relaxed nighttime version of her.',
    },
    // Shot 5: CAR RIDE
    {
      actions: [
        'sitting in the back seat, head leaned against the window, city lights streaking past. Tired but content eyes looking at camera',
        'in the back seat, showing her phone screen to the person next to her, both laughing',
        'looking out the car window at the night city, chin resting on her hand, reflections of lights on the glass',
        'asleep in the back seat, head tilted to one side, jacket used as a blanket',
        'scrolling through the day\'s photos on her phone, face lit by screen glow, a quiet private smile',
      ],
      wardrobe: `${garmentDesc} — wrapped in a jacket for warmth, slightly disheveled from a long day`,
      location: `Inside a car driving through ${cityName || 'the city'} at night. ${cityContext} Local architecture and city lights visible through windows.`,
      film: leicaNight, quality: qualityCar,
      expression: 'Tired contentment. The quiet aftermath of a great day and evening.',
    },
    // Shot 6: NIGHT STREET
    {
      actions: [
        'walking down a narrow street at night, slightly ahead of camera, turning back with a warm smile — streetlights creating rim light',
        'standing under a neon sign or streetlight, leaning against a wall, phone in hand, looking at camera with a relaxed gaze',
        'crouching to pet a stray cat on the sidewalk, laughing, her drink placed on the ground beside her',
        'walking arm-in-arm with a crew member (partially visible), mid-laugh, on an empty street',
        'standing at a crosswalk, wind in her hair, city lights reflecting off wet pavement',
        'sitting on a low wall on the street, eating street food or ice cream, looking up at camera with a content smile',
      ],
      wardrobe: `${garmentDesc} — jacket on for the cool night air, styled but lived-in`,
      location: `A street near ${cityName || 'the shooting location'} at night. ${cityContext} Local architecture, shop fronts, street signs in the local language, warm streetlights. Authentic to this specific area.`,
      film: leicaNight, quality: qualityNeon,
      expression: 'Free, unguarded, magnetic. Off-duty, walking through a city she\'s falling in love with.',
    },
  ];

  const idx = typeof shotIndex === 'number' ? shotIndex % categories.length : 0;
  const cat = categories[idx];
  const action = pick(cat.actions);

  const raw = `${directive}

${cat.film}
${modelDesc}
The model is ${cat.wardrobe}.
${cat.location}

SCENE: The model ${action}.
EXPRESSION: ${cat.expression}
${cat.quality}

REMINDER: This is an AFTER-HOURS candid snapshot — evening/night, warm ambient lighting, real social moment. NOT a fashion photo.`;

  return applyJapanMode(raw, cityName);
}


function buildOffshotC(modelDesc: string, garmentDesc: string, cityName: string, pick: (arr: string[]) => string, shotIndex?: number): string {
  const directive = `CRITICAL INSTRUCTION: This is NOT a fashion photograph. This is a CANDID, MORNING/DAYTIME snapshot taken BEFORE the fashion shoot begins. The model woke up at the hotel, got ready, and is now heading to the shoot location. The vibe is MORNING to MIDDAY — fresh, bright natural light, real daily routines of a working model on location.

ANTI-FASHION RULES:
- This is a private morning/daytime moment, NOT a photoshoot. The model is getting ready, eating breakfast, commuting — being a real person before work starts.
- Framing is imperfect — shot on a phone or small camera by a crew member who is also getting ready. Off-center, casual, unstaged.
- Lighting is natural morning/daytime light — hotel room window light, restaurant ambient, taxi window light, cafe daylight. NO studio lighting.
- Other people (crew members — a mix of Japanese and international staff) may be partially visible — arms, backs, someone checking their phone, a makeup artist with a coffee.
- The overall feeling is fresh, optimistic, real — like a photo from a model's "day in my life" Instagram story.`;

  const leicaMorning = 'Shot on Leica M6 with Summicron 35mm f/2, Kodak Portra 400 film. Handheld, natural morning light, slightly warm color cast.';
  const qualityMorning = 'QUALITY: Fine film grain (Portra 400), soft warm morning light, natural color palette. Casual framing — feels like a crew member snapped this between tasks. 3:4 portrait format. No text, no watermarks.';
  const qualityBright = 'QUALITY: Fine film grain, bright natural daylight, clean colors with slight warmth. Fresh, airy feeling. Casual composition. 3:4 portrait format. No text, no watermarks.';
  const qualityInterior = 'QUALITY: Fine film grain, soft window light mixing with warm interior lighting, gentle shadows. Intimate, private morning atmosphere. 3:4 portrait format. No text, no watermarks.';

  const cityContext = cityName
    ? `MANDATORY LOCATION: The setting MUST be in or very near ${cityName}. The hotel, cafe, restaurant, or street must look and feel authentically local to ${cityName} — local architecture, local language on signs and menus, local style, local people in the background. Do NOT set this in Japan, Tokyo, or any Asian city unless ${cityName} is explicitly in that region. The location must be geographically accurate to ${cityName}.`
    : 'The setting should feel authentic and local to the shooting location.';

  const categories = [
    // Shot 1: HOTEL BREAKFAST BUFFET
    {
      actions: [
        'at the hotel breakfast buffet, picking up a fruit bowl with a shy, bashful smile — caught by the camera mid-reach. Other breakfast items visible on the buffet line',
        'seated at the breakfast table with a continental breakfast spread — croissants, jam, butter, orange juice, coffee. She is mid-bite, looking at the camera with a natural, relaxed smile',
        'at the breakfast table with various plates of food spread out, she has just accidentally spilled a glass of water — looking at the camera with a surprised, slightly embarrassed laugh, one hand reaching for a napkin',
        'eating a bowl of granola yogurt at the breakfast table, giving a peace sign to the camera with a big genuine grin. Coffee and fruit on the table',
        'standing at the buffet holding a plate, deciding what to take — she notices the camera and gives a warm, candid smile. Morning light from the restaurant windows',
      ],
      wardrobe: 'wearing casual but put-together morning clothes — a simple knit top and comfortable pants, or a casual dress. Hair neatly styled (not messy). Light natural makeup already done',
      location: `A hotel breakfast buffet restaurant in ${cityName || 'the shooting location'}. ${cityContext} A comfortable 3-star or 4-star hotel — clean, welcoming, approachable (NOT a luxury 5-star hotel). Morning light through large windows, other hotel guests visible in background. Buffet counter with food trays, fresh bread, fruits, cereals.`,
      film: leicaMorning, quality: qualityMorning,
      expression: 'Bright, warm, genuine — a natural morning smile. NOT sleepy or drowsy.',
    },
    // Shot 2: HOTEL LOBBY — CANDID STAFF SHOT
    {
      actions: [
        'standing in the hotel lobby, a crew member has just called her name and snapped a photo — she looks directly at the camera with a natural, relaxed smile. Lobby furniture and reception area visible behind her',
        'sitting on a lobby sofa with her bag beside her, looking directly at the camera with a calm, friendly expression — a crew member took this casually while waiting for everyone to gather',
        'standing near the hotel entrance with morning light streaming in, bag over her shoulder, looking at the camera with a confident, ready-to-go expression',
        'leaning against a lobby pillar or wall, phone in one hand, looking directly at the camera with a warm half-smile — a casual snap by a passing crew member',
        'walking through the lobby toward the exit, she turns to look at the camera with a bright smile — other guests and staff visible in the background, luggage cart nearby',
      ],
      wardrobe: `${garmentDesc} — dressed and ready for the day. Bag over shoulder or in hand`,
      location: `The lobby of a 3-star or 4-star hotel in ${cityName || 'the shooting location'}. ${cityContext} NOT a luxury grand hotel — a clean, comfortable, approachable hotel with a welcoming atmosphere. Simple but tidy lobby with reception desk, seating area, maybe a small coffee station. The hotel should feel like a real working crew would actually stay here. Bright morning light from entrance.`,
      film: leicaMorning, quality: qualityBright,
      expression: 'Looking directly at camera. Natural, friendly, approachable — a casual photo taken by a crew member.',
    },
    // Shot 3: HOTEL ROOM — BED SCENE (STILL LIFE)
    {
      actions: [
        'sitting on the edge of the unmade hotel bed, phone in hand, looking at the camera — the bed behind her is scattered with personal items: sunglasses, room key, lip balm, a magazine, phone charger, a water bottle. Morning light streaming through sheer curtains',
        'lying on her stomach on the hotel bed, chin propped on both hands, looking at the camera with a playful grin — the bed surface around her is scattered with sunglasses, a scarf, earbuds, snacks, and a coffee cup on the nightstand',
        'standing beside the bed reaching for her sunglasses on the pillow, looking at the camera — the unmade bed is covered with the beautiful chaos of getting ready: clothes laid out, accessories, charger cables, makeup bag',
        'sitting cross-legged in the middle of the unmade bed, surrounded by scattered items — sunglasses, hat, phone, magazine, room key. She looks at the camera with a relaxed, content expression. Morning light through curtains',
        'perched on the edge of the bed, one leg tucked under her, scrolling her phone — the bed behind her shows scattered personal items: sunglasses on the pillow, a scarf, snacks, earbuds. She glances up at the camera',
      ],
      wardrobe: 'wearing comfortable travel clothes — a simple t-shirt and casual pants, or a light dress. Makeup done, hair styled. Barefoot or in hotel slippers (NO outdoor shoes on the bed)',
      location: `A hotel room in ${cityName || 'the shooting location'}. ${cityContext} A comfortable 3-star or 4-star hotel room — not luxurious but clean and pleasant. Unmade bed with white sheets, scattered personal items creating an editorial still-life. Soft morning light through curtains. Open suitcase visible, hanging clothes on a chair. IMPORTANT: Do NOT place shoes on the bed — shoes should be on the floor by the door or beside the bed.`,
      film: leicaMorning, quality: qualityInterior,
      expression: 'Relaxed, unhurried morning energy. The comfortable mess of real life on location.',
    },
    // Shot 4: HOTEL CHECKOUT / LOBBY
    {
      actions: [
        'standing at the hotel front desk, handing over a room key card, small luggage or tote bag at her feet — a crew member waiting nearby with coffee',
        'walking through the hotel lobby pulling a small carry-on, phone in other hand, looking at the screen for directions or messages',
        'sitting in the hotel lobby on a sofa, legs crossed, waiting for the crew with her bag beside her — scrolling her phone, a takeaway coffee on the side table',
        'standing near the hotel entrance, putting on sunglasses as morning light floods through the glass doors — ready to head out, bag over her shoulder',
        'in the hotel elevator with a crew member (partially visible), both looking at their phones, reflected in the mirror — bags at their feet, heading down to the lobby',
      ],
      wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Do NOT change or substitute any items. Sunglasses pushed up on her head or hanging from the collar. A tote bag or small carry-on`,
      location: `The lobby or front desk of a 3-star or 4-star hotel in ${cityName || 'the shooting location'}. ${cityContext} Clean and comfortable hotel interior — NOT a luxury grand hotel. Morning activity — other guests checking out, staff behind the desk. Bright natural light from the entrance.`,
      film: leicaMorning, quality: qualityBright,
      expression: 'Alert, organized, transitioning from private morning mode to work mode. A professional getting her day started.',
    },
    // Shot 5: TAXI / CAR RIDE TO LOCATION
    {
      actions: [
        'in the back seat of a taxi, looking out the window at the passing cityscape — morning light illuminating her face, buildings and streets of the city visible through the glass',
        'sitting in the back of a taxi, reviewing photos or notes on her phone, face lit by screen and window light — the city visible through the window behind her',
        'in the back seat, laughing at something a crew member beside her (partially visible) said, the city\'s downtown area rolling past outside the window',
        'leaning forward in the taxi to look at something through the windshield — a landmark or busy intersection of the city visible ahead, morning traffic around them',
        'in the back seat looking directly at the camera with a relaxed smile, one arm resting on the window — the city streets visible through the glass behind her',
      ],
      wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Sunglasses on or pushed up, bag on the seat beside her`,
      location: `Inside a taxi or car driving through the busy downtown area near ${cityName || 'the shooting location'}. ${cityContext} Local street signs, shops, architecture, and morning commuters visible through windows. The route passes through a recognizable commercial or entertainment district.`,
      film: leicaMorning, quality: 'QUALITY: Fine film grain, mixed lighting — soft morning daylight through car windows, occasional shadow from buildings. Documentary feel, intimate car interior framing. 3:4 portrait format. No text, no watermarks.',
      expression: 'Quiet anticipation, observing a city she\'s working in. The calm before the creative storm.',
    },
    // Shot 6: CAFE — COFFEE & LUNCH
    {
      actions: [
        'sitting at a cafe terrace table with a latte, looking directly at the camera with a warm, genuine smile — pastries and a magazine on the table',
        'seated by the cafe window with a sandwich or salad plate, looking up at the camera with a bright, relaxed expression — natural light on her face',
        'at a cafe table with both elbows on the table, chin in hands, looking directly at the camera with a playful, content smile — empty coffee cups and crumbs on the table',
        'holding up a coffee cup in a casual toast toward the camera, smiling — a crew member\'s arm partially visible across the table',
        'sitting at an outdoor cafe table, fork in hand over a plate of local food, looking at the camera with a "this is so good" expression — bright daylight, street visible behind her',
      ],
      wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Sunglasses on top of head or on the table. A light jacket or bag draped over the chair`,
      location: `A local cafe near ${cityName || 'the shooting location'}. ${cityContext} Authentic local cafe — not a chain. Local pastries or food in the display, local language on the menu board, neighborhood regulars in the background. Bright daylight, outdoor terrace or large windows. Plants, wooden furniture, warm atmosphere.`,
      film: leicaMorning, quality: qualityBright,
      expression: 'Looking directly at camera. Relaxed, happy, genuine — enjoying a real moment before work begins.',
    },
  ];

  const idx = typeof shotIndex === 'number' ? shotIndex % categories.length : 0;
  const cat = categories[idx];
  const action = pick(cat.actions);

  const raw = `${directive}

${cat.film}
${modelDesc}
The model is ${cat.wardrobe}.
${cat.location}

SCENE: The model ${action}.
EXPRESSION: ${cat.expression}
${cat.quality}

REMINDER: This is a MORNING/DAYTIME candid snapshot — fresh natural light, real daily routines, pre-shoot energy. NOT a fashion photo.`;

  return applyJapanMode(raw, cityName);
}


// ============ OFFSHOT SCENE-SPECIFIC BUILDERS ============

export function buildOffshotScene(
  sceneId: string,
  modelDesc: string,
  garmentDesc: string,
  cityName: string,
  pick: (arr: string[]) => string,
  shotIndex?: number,
): string {
  const seed = (shotIndex || 0) * 7 + Math.floor(Date.now() / 60000);

  // If the user typed a specific venue/place (more than just a city name), use it directly
  // Simple heuristic: if input contains 2+ words or non-ASCII (Japanese etc), treat as specific venue
  const isSpecificVenue = cityName && (cityName.trim().split(/\s+/).length >= 2 || /[^\x00-\x7F]/.test(cityName));

  // Japan mode: if "日本" is in the prompt, switch to "hanging out with a close female friend" setting
  const isJapan = cityName.includes('日本');

  const cityContext = cityName
    ? `MANDATORY LOCATION: The venue MUST be ${isSpecificVenue ? cityName.replace('日本', '').trim() : `in or very near ${cityName.replace('日本', '').trim()}`}. It must look and feel authentically local — local cuisine, local language on signs/menus, local architectural style, local people in the background.${isJapan ? ' This is in JAPAN.' : ` Do NOT set this in Japan or any Asian city unless ${cityName} is explicitly in that region.`} The location must be geographically accurate.`
    : 'The venue should feel authentic and local to the shooting location.';

  const leicaMorning = 'Shot on Leica M6 with Summicron 35mm f/2, Kodak Portra 400 film. Handheld, natural light, slightly warm color cast.';
  const leicaNight = 'Shot on Leica M6 with Summicron 35mm f/2, Kodak Portra 800 film pushed to 1600. Handheld, available light only, warm color cast from ambient lighting.';
  const qualityMorning = 'QUALITY: Fine film grain (Portra 400), soft warm morning light, natural color palette. Casual framing — feels like a friend snapped this. 3:4 portrait format. No text, no watermarks.';
  const qualityNight = 'QUALITY: Heavy film grain (Portra 800 pushed), warm amber/golden color cast from candles and ambient light, shallow depth of field, slightly soft focus. Intimate framing. 3:4 portrait format. No text, no watermarks.';
  const qualityNeon = 'QUALITY: Heavy film grain, mixed color temperature — warm practicals vs cool neon/LED. Cinematic night-time feel. Slightly underexposed with bright highlights from lights. 3:4 portrait format. No text, no watermarks.';

  const companionDesc = isJapan
    ? 'She is hanging out with her close female friend (a stylish Japanese woman of similar age). The friend may be partially visible — arm, shoulder, hand holding a drink/phone, or sitting across the table. Sometimes they pose together for a photo. The vibe is two close friends on a day out — NOT a work crew.'
    : 'Other people (crew members — a mix of Japanese and international staff) may be partially visible — arms, backs, hands holding glasses or phones.';

  const photographerDesc = isJapan
    ? 'shot on a phone or small camera by her friend'
    : 'shot on a phone or small camera by a crew member';

  const baseDirective = `CRITICAL INSTRUCTION: This is NOT a fashion photograph. This is a CANDID snapshot ${photographerDesc}. The model is a real person in a real social moment. Framing is imperfect — off-center, slightly tilted, casual.
${companionDesc}
The overall feeling is private, warm, real — like a photo posted on someone's close friends Instagram story.`;

  const scenes: Record<string, {
    actions: string[];
    wardrobe: string;
    location: string;
    film: string;
    quality: string;
    expression: string;
    reminder: string;
  }> = {
    // ============ BREAKFAST ============
    'breakfast': (() => {
      const breakfastVenues = [
        'hotel breakfast buffet restaurant',
        'local bakery and cafe serving breakfast',
        'charming neighborhood breakfast spot',
        'hotel restaurant with a la carte breakfast',
        'popular local brunch cafe',
        'street-side cafe serving morning pastries and coffee',
      ];
      const venue = breakfastVenues[seed % breakfastVenues.length];
      return {
        actions: [
          'at the breakfast buffet, picking up a fruit bowl with a shy, bashful smile — caught by the camera mid-reach. Plates of pastries and bread behind her on the buffet line',
          'seated at the table with a continental breakfast spread — croissants, jam, butter, orange juice, coffee. She looks at the camera mid-bite with a natural, relaxed smile',
          'at the breakfast table with various plates spread out, she has just accidentally spilled a glass of water — looking at the camera with a surprised, embarrassed laugh, one hand reaching for a napkin',
          'eating a bowl of granola yogurt, giving a peace sign to the camera with a big genuine grin. Coffee cup and fresh fruit on the table beside her',
          'standing at the buffet holding a plate, deciding what to take — she notices the camera and gives a warm candid smile. Morning light from restaurant windows illuminating her face',
          'pouring coffee from a carafe at the breakfast table, concentrating on not spilling, then looking up at the camera with a sleepy but warm smile. Toast and eggs on her plate',
          'laughing with a crew member (partially visible) over breakfast, one hand holding a coffee cup, the other gesturing mid-story. Plates of food between them',
          'sitting at the breakfast table, holding a piece of toast up to the camera like showing off a trophy — playful, silly, genuine morning energy',
        ],
        wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Hair neatly styled. Natural makeup`,
        location: isSpecificVenue
          ? `At ${cityName}. ${cityContext} Morning light, other guests in the background. Breakfast food, fresh bread, fruits, cereals, coffee visible.`
          : `A ${venue} in ${cityName || 'the shooting location'}. ${cityContext} A comfortable, approachable place (NOT a luxury 5-star hotel). Morning light through windows, other guests in the background. Fresh bread, fruits, cereals, coffee visible.`,
        film: leicaMorning,
        quality: qualityMorning,
        expression: 'Bright, warm, genuine — a natural morning smile. Friendly and approachable.',
        reminder: 'This is a MORNING breakfast candid snapshot — fresh natural light, real morning routine. NOT a fashion photo.',
      };
    })(),

    // ============ LUNCH ============
    'lunch': (() => {
      const lunchVenues = [
        'trendy local bistro',
        'casual outdoor terrace restaurant',
        'authentic local street food market with seating',
        'cozy neighborhood sandwich and salad shop',
        'popular local noodle or rice spot',
        'bright cafe with large windows serving lunch sets',
        'local food hall with communal tables',
        'garden restaurant with natural shade',
      ];
      const venue = lunchVenues[seed % lunchVenues.length];
      return {
        actions: [
          'sitting at a terrace table in bright daylight, fork in hand over a plate of local food, looking directly at the camera with a "this is SO good" expression — a crew member across the table partially visible',
          'taking a photo of her beautifully plated lunch with her phone — concentrating on getting the angle right, then looking up at the camera with a grin',
          'mid-bite of a sandwich or local dish, cheeks slightly full, caught by the camera — she covers her mouth with one hand, laughing with her eyes',
          'leaning back in her chair, legs crossed, holding a glass of sparkling water or lemonade, looking directly at the camera with a relaxed, content post-meal smile',
          'pointing excitedly at something on the menu, turning to the camera with wide eyes — "we HAVE to order this" energy. A crew member\'s hand visible holding another menu',
          'sharing a plate of appetizers with crew members, reaching across the table for the last piece — looking at the camera with a playful "it\'s mine" expression',
          'sitting at the table with empty plates pushed aside, chin resting on her hands, looking directly at the camera with a lazy, satisfied smile — bright midday light on her face',
          'walking out of the restaurant into bright sunshine, sunglasses going on, takeaway coffee in hand — she looks back at the camera with a bright, energized smile',
        ],
        wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Sunglasses on top of head or on the table`,
        location: isSpecificVenue
          ? `At ${cityName}. ${cityContext} Bright daylight, outdoor seating or large windows. Local cuisine visible. Relaxed midday atmosphere.`
          : `A ${venue} near ${cityName || 'the shooting location'}. ${cityContext} Bright daylight, outdoor seating or large windows. Local cuisine, handwritten menus or chalkboards in the local language. Relaxed midday atmosphere.`,
        film: leicaMorning,
        quality: 'QUALITY: Fine film grain (Portra 400), bright natural daylight, vibrant but natural colors. Casual framing with outdoor light. 3:4 portrait format. No text, no watermarks.',
        expression: 'Looking at camera. Relaxed, happy, energized — midday break with good food and good company.',
        reminder: 'This is a DAYTIME lunch candid snapshot — bright daylight, outdoor atmosphere, real social moment. NOT a fashion photo.',
      };
    })(),

    // ============ DINNER ============
    'dinner': (() => {
      const dinnerVenues = [
        'traditional local cuisine restaurant',
        'Italian restaurant or trattoria',
        'French bistro or brasserie',
        'seafood restaurant near the waterfront',
        'cozy neighborhood restaurant with candlelight',
        'modern farm-to-table restaurant',
        'family-run local restaurant with home-style cooking',
        'rooftop restaurant with city views',
      ];
      const venueA = dinnerVenues[seed % dinnerVenues.length];
      const venueB = dinnerVenues[(seed + 3) % dinnerVenues.length];
      const venue = (shotIndex || 0) % 2 === 0 ? venueA : venueB;
      return {
        actions: [
          'mid-bite of food, chopsticks or fork halfway to her mouth, looking at the camera with a surprised "don\'t photograph me eating" expression mixed with amusement — warm candlelight on her face',
          'resting her chin on both hands, elbows on the table, listening to a story with a warm, engaged smile — dinner plates and wine glasses between her and the partially visible crew member across the table',
          'raising a glass in a toast toward the camera — SHOT WITH ON-CAMERA FLASH (small hotshoe flash unit mounted on the Leica): harsh direct flash illuminates her face and the glass brightly against the dark restaurant background. Flash reflects in the wine/drink. Her smile is big and genuine, caught in the stark white flash light. The background falls into darkness beyond the flash range',
          'laughing hard at something someone just said, leaning back in her chair, one hand on the table — eyes squeezed shut from genuine laughter. Beautiful food on the table',
          'taking a group selfie with 2-3 crew members, all squeezing into frame — SHOT WITH ON-CAMERA FLASH (small hotshoe flash unit mounted on the Leica): the flash washes their faces in bright white light, red-eye possible, background goes dark. Big genuine smiles, slightly overexposed skin from the direct flash. Classic party photo look',
          'holding up a piece of food toward the camera on her fork or chopsticks, showing it off proudly — "look how good this is" expression. Sharing plates and bottles on the table',
          'standing up making a playful speech or toast, one hand holding a glass up — the crew at the table looking up at her, amused. Warm restaurant lighting',
          'sitting sideways in her chair, legs crossed, one arm draped over the back, drink dangling from her fingers — looking at the camera with completely relaxed confidence. The energy of someone who has earned this meal',
        ],
        wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Jacket removed and draped over chair, slightly more relaxed than during the shoot`,
        location: isSpecificVenue
          ? `At ${cityName}. ${cityContext} Warm interior lighting — candles, pendant lights, warm wall sconces. Beautiful food and drinks on the table. Lively but intimate dinner atmosphere.`
          : `A ${venue} near ${cityName || 'the shooting location'}. ${cityContext} Warm interior lighting — candles, pendant lights, warm wall sconces. Beautiful food and drinks on the table. Lively but intimate dinner atmosphere. Authentic local restaurant — not a tourist trap.`,
        film: leicaNight,
        quality: qualityNight,
        expression: 'Relaxed, social, warm — celebrating the end of a shoot day with the crew over great food.',
        reminder: 'This is an EVENING dinner candid snapshot — warm ambient lighting, real social moment, great food. NOT a fashion photo.',
      };
    })(),

    // ============ NIGHTCLUB ============
    'nightclub': (() => {
      const clubTypes = [
        'underground techno club',
        'stylish rooftop lounge club',
        'intimate house music venue',
        'trendy cocktail bar with a dance floor',
        'converted warehouse club space',
        'upscale nightclub with DJ booth',
      ];
      const clubType = clubTypes[seed % clubTypes.length];
      return {
        actions: [
          'on the dance floor, caught mid-movement — SHOT WITH ON-CAMERA FLASH (small hotshoe flash unit mounted on the Leica): harsh direct flash freezes her mid-dance, hair flying, body in motion. The flash blows out her skin and outfit brightly against the pitch-dark club background. Other dancers are ghostly silhouettes. Wild, free grin captured in the stark flash light',
          'standing near the DJ booth or speakers, eyes closed, head tilted, completely lost in the music — a crew member next to her (partially visible) also dancing. Strobe lights and smoke',
          'at a standing table near the dance floor, holding a drink, leaning toward a crew member to say something over the music — she looks at the camera mid-sentence with a knowing smile. Pulsing colored lights',
          'sitting in a booth or on a couch in the VIP or chill-out area, legs tucked under her, drink in hand — looking at the camera with tired but happy eyes. Bass-heavy ambient light, other people around',
          'walking through the club crowd — SHOT WITH ON-CAMERA FLASH (small hotshoe flash unit mounted on the Leica): the flash catches her turning back to the camera laughing, face brightly lit against the dark crowd behind her. Eyes slightly squinted from the flash. Other clubgoers reduced to dark shapes. The harsh flash creates a raw, documentary nightlife photo feel',
          'taking a selfie with a crew member in the club bathroom mirror — flash reflecting in the mirror, makeup slightly worn from dancing, huge smiles. Real party energy',
          'leaning against the bar, one elbow propped, cocktail in hand — the bartender mixing drinks behind her, colored bottles backlit. She looks at the camera with magnetic, confident nightlife energy',
          'outside the club entrance, cooling off — hair slightly damp, drink in hand, laughing with crew members in the night air. Neon sign of the club visible, smokers and other clubgoers around',
        ],
        wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Slightly lived-in from dancing — sleeves pushed up, top button undone, hair slightly tousled`,
        location: isSpecificVenue
          ? `At ${cityName}. ${cityContext} Dark interior with dramatic colored lighting — LED strips, lasers, strobes, neon. Smoke/haze machine atmosphere. DJ booth visible. Other clubgoers dancing or socializing.`
          : `A ${clubType} in ${cityName || 'the shooting location'}. ${cityContext} Dark interior with dramatic colored lighting — LED strips, lasers, strobes, neon. Smoke/haze machine atmosphere. DJ booth visible. Other clubgoers dancing or socializing. The venue should feel authentic to the local nightlife scene.`,
        film: leicaNight,
        quality: qualityNeon,
        expression: 'Free, electric, alive — the uninhibited nightlife version of her. Pure joy of being off-duty and dancing.',
        reminder: 'This is a NIGHTCLUB candid snapshot — dramatic colored lighting, dancing energy, real nightlife moment. NOT a fashion photo.',
      };
    })(),

    // ============ PUB & BAR ============
    'pub-bar': (() => {
      const barTypes = [
        'cozy traditional pub with worn wooden bar',
        'craft beer bar with taps lining the wall',
        'intimate wine bar with exposed brick',
        'neighborhood dive bar with character',
        'rooftop cocktail bar with city views',
        'jazz bar with live music corner',
        'local standing bar or neighborhood watering hole',
        'speakeasy-style cocktail bar with dim lighting',
      ];
      const barType = barTypes[seed % barTypes.length];
      return {
        actions: [
          'sitting at the bar counter, one elbow on the bar, cocktail or beer in hand — turned toward the camera with a relaxed, warm smile. Bottles and warm lighting behind the bartender',
          'mid-sip of her drink, eyes looking over the rim directly at the camera with a playful glint — foam or condensation on the glass',
          'cheers-ing glasses with a crew member, the glasses meeting in the center of frame — SHOT WITH ON-CAMERA FLASH (small hotshoe flash unit mounted on the Leica): harsh direct flash lights up their faces and the clinking glasses brightly. The warm bar background goes dark beyond the flash range. Big grins, slightly overexposed skin, flash reflecting in the glass surfaces. Raw party snapshot feel',
          'laughing with her head thrown back slightly, drink held safely to the side — reacting to something hilarious. Bar regulars and warm pendant lights in the background',
          'sitting in a corner booth, legs tucked under her, cradling a warm drink — looking directly at the camera with a quiet, intimate smile. The bar buzzes softly around her',
          'standing at a high table, leaning on it with both arms, drink between her hands — SHOT WITH ON-CAMERA FLASH (small hotshoe flash unit mounted on the Leica): the flash harshly illuminates her face and upper body against the dim bar behind her. She looks at the camera with easy confidence, caught in the bright white flash. A crew member beside her mid-gesture is partially lit. The flash creates deep shadows and a candid, unpolished nightlife photo look',
          'at the bar, examining a cocktail held up to the warm light, admiring the color — she turns to the camera with a satisfied "this is perfect" expression',
          'playing darts, pool, or a bar game with crew members — caught mid-throw or mid-shot, competitive grin, one eye squinted. Drinks on a nearby table, bar atmosphere around them',
        ],
        wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Casual, jacket off, sleeves rolled up. Completely comfortable and at ease`,
        location: isSpecificVenue
          ? `At ${cityName}. ${cityContext} Warm amber/golden lighting from pendant lights, bar back-lighting, candles. Worn surfaces, character. Lively but intimate atmosphere.`
          : `A ${barType} in ${cityName || 'the shooting location'}. ${cityContext} Warm amber/golden lighting from pendant lights, bar back-lighting, candles. Worn surfaces, character. A real bar where locals drink — not a hotel lobby bar. Lively but intimate atmosphere.`,
        film: leicaNight,
        quality: qualityNight,
        expression: 'Easy confidence, warmth, connection — the relaxed nighttime version of her. Real conversation, real drinks, real laughter.',
        reminder: 'This is a PUB/BAR candid snapshot — warm amber lighting, drinks, intimate social atmosphere. NOT a fashion photo.',
      };
    })(),

    // ============ SNAP — STREET SNAPSHOT AT ANY LOCATION ============
    'snap': (() => {
      const locationName = cityName || 'the location';
      return {
        actions: [
          `walking through ${locationName}, mid-stride, one hand holding her bag strap — she glances at the camera with a natural, effortless expression. A crew member walking beside her is partially visible. People and the environment of ${locationName} surround her`,
          `standing still for a moment at ${locationName}, scrolling her phone with one thumb — she looks up at the camera with a relaxed half-smile. The specific architecture and atmosphere of ${locationName} visible behind her`,
          `sitting on a bench, ledge, or seating area at ${locationName}, legs crossed, takeaway coffee in hand — looking directly at the camera with a calm, content expression. The surroundings of ${locationName} frame the shot`,
          `leaning against a wall, column, or railing at ${locationName}, arms crossed or one hand in her pocket — looking at the camera with quiet confidence. The distinct environment of ${locationName} provides context`,
          `holding a takeaway coffee or drink, walking through ${locationName} — she turns back toward the camera with a bright, spontaneous smile. Motion blur on the background, sharp focus on her face`,
          `crouching down or bending slightly to look at something interesting at ${locationName} — she looks up at the camera with a curious, playful expression. The unique details of ${locationName} visible around her`,
          `standing at a window or glass wall at ${locationName}, looking out at the view — she turns to the camera, backlit by the light from outside. Silhouette-edge lighting, the interior of ${locationName} softly visible`,
          `caught mid-laugh with a crew member (partially visible) at ${locationName} — genuine, unscripted moment. Both are carrying bags or coffee. The character of ${locationName} is clear in the background`,
          `waiting — sitting or standing casually at ${locationName}, people-watching with a relaxed, zoned-out expression — then notices the camera and gives a warm, natural smile. The energy and flow of ${locationName} visible around her`,
          `taking a selfie or photo of something at ${locationName} with her phone — the camera catches her from the side or slightly behind, showing both her and what she is photographing. The distinctive features of ${locationName} are prominent`,
        ],
        wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Styled and ready, but body language is completely casual and off-duty`,
        location: `At ${locationName}. Pick a SPECIFIC area within ${locationName} that would make a visually interesting candid snapshot — choose from the various spaces, corridors, waiting areas, entrances, restaurants, shops, platforms, concourses, outdoor areas, or any distinctive spot within ${locationName}. The chosen area must be recognizable as part of ${locationName} — show local signage, architecture, distinctive design elements, or environmental cues that make the location identifiable. Other people going about their day should be visible in the background.`,
        film: cityName ? leicaMorning : leicaNight,
        quality: cityName ? qualityMorning : qualityNight,
        expression: 'Natural, off-duty, real — NOT a model pose. The relaxed body language of someone between work moments.',
        reminder: `This is a CANDID STREET SNAPSHOT at ${locationName} — the model is a real person passing through, not posing for a fashion shoot. The location should be clearly identifiable. NOT a fashion photo.`,
      };
    })(),
  };

  const scene = scenes[sceneId];
  if (!scene) return '';

  // Japan mode: replace "crew member" references with "friend" and add selfie shots
  let actions = scene.actions;
  if (isJapan) {
    actions = actions.map(a => a
      .replace(/a crew member/gi, 'her close female friend (a stylish Japanese woman of similar age)')
      .replace(/crew members/gi, 'her close female friend')
      .replace(/crew member/gi, 'her close female friend')
    );
    // Add selfie shots for Japan mode
    const locationName = cityName.replace('日本', '').trim() || 'the location';
    actions.push(
      `taking a selfie together with her close female friend — both squeezing into frame, the model holding the phone at arm's length. ${locationName} is clearly visible in the background behind them. Both are smiling naturally, heads close together. The photo has the warm, intimate feel of a best-friends selfie posted on Instagram stories`,
      `posing for a two-shot with her close female friend — another person (partially visible hand) is taking the photo with a phone. They stand side by side or with arms linked, both looking at the camera with relaxed, genuine smiles. The distinctive surroundings of ${locationName} frame them. This looks like a treasured travel photo between close friends`,
    );
  }

  const action = pick(actions);

  return `${baseDirective}

${scene.film}
${modelDesc}
The model is ${scene.wardrobe}.
${scene.location}

SCENE: The model ${action}.
EXPRESSION: ${scene.expression}
${scene.quality}

REMINDER: ${scene.reminder}`;
}


function buildDetailPrompt(detailMode: string, modelDesc: string, garmentDesc: string, customPrompt: string, background: string, aspectRatio: string): string {
  const scene = customPrompt ? `SCENE DIRECTION: ${customPrompt}` : `Setting: ${background}.`;

  const detailPrompts: Record<string, string> = {
    'shoes': `DETAIL SHOT — SHOES/FOOTWEAR CLOSE-UP:
Generate a cinematic close-up photograph of the model's feet and shoes.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Low-angle close-up focusing on the shoes/feet and lower legs (below knee). The shoes must be the EXACT ones from the reference images.
LIGHTING: Beautiful dappled light filtering through architecture or trees, casting artistic light patterns and shadows on the shoes. Golden hour warmth.
MOOD: Emotional, luxurious, editorial — like a first-class brand campaign.
LENS: Shot on Canon TS-E 90mm f/2.8L Macro — tilt-shift creating a unique, selective focus plane at low angle.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'shoes-wall': `DETAIL SHOT — SHOES/FOOTWEAR CLOSE-UP (WALL LEAN POSE):
Generate a cinematic close-up photograph of the model's feet and shoes.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Low-angle close-up focusing on the shoes/feet and lower legs (below knee). The shoes must be the EXACT ones from the reference images.
POSE: The model stands on one foot with the other foot raised and pressing its sole flat against a wall behind — casual, effortlessly cool editorial pose.
LIGHTING: Beautiful dappled light, golden hour warmth.
MOOD: Effortlessly cool, editorial, slightly rebellious.
LENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — legendary bokeh renders the background into dreamy, painterly blur.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'face': `DETAIL SHOT — FACE/PORTRAIT CLOSE-UP:
Generate a cinematic close-up portrait of the model.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Tight close-up from chest/shoulders up, focusing on the face. Show enough of the garment neckline/collar.
EXPRESSION: Confident, magnetic, slightly contemplative — looking away from camera (three-quarter profile or gazing into distance). NOT looking at camera.
LIGHTING: Soft, cinematic light wrapping around the face. Subtle rim light or backlight creating depth. Warm skin tones.
MOOD: Intimate, editorial, emotionally resonant — like a Vogue portrait.
LENS: Shot on Zeiss Otus 85mm f/1.4 — clinically sharp with refined, dignified bokeh.
Hair should be natural and undisturbed.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'face-gaze': `DETAIL SHOT — FACE/PORTRAIT CLOSE-UP (DIRECT GAZE):
Generate a cinematic close-up portrait of the model.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Tight close-up from chest/shoulders up, focusing on the face.
EXPRESSION: MUST look directly into the camera with a strong, dignified, unwavering gaze. Quietly powerful. Chin slightly lifted, eyes sharp and clear.
LIGHTING: Soft, cinematic light wrapping around the face. Subtle rim light or backlight. Warm skin tones.
MOOD: Powerful, editorial, captivating — luxury brand campaign key visual.
LENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — razor-sharp face, background melts into creamy bokeh with organic swirl.
Hair should be natural and undisturbed.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'face-profile': `DETAIL SHOT — FACE/PORTRAIT (PROFILE):
Generate a cinematic profile portrait of the model.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: True PROFILE or strong three-quarter view — the model faces screen-left or screen-right, NOT toward camera. Show jawline, cheekbone, silhouette.
EXPRESSION: Serene, contemplative, looking into the distance. Camera is invisible to them.
LIGHTING: Strong rim light outlining the profile. Soft reflected fill on the face.
LENS: Shot on Zeiss Otus 85mm f/1.4 — clinical sharpness on the profile edge.
Hair should be natural and undisturbed.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'face-glance-back': `DETAIL SHOT — FACE/PORTRAIT (GLANCE BACK):
Generate a cinematic portrait of the model glancing back over their shoulder.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: The model's BODY faces AWAY from camera, but HEAD is turned to look back DIRECTLY at camera. Over-the-shoulder glance. Show from waist up.
EXPRESSION: Direct, intense eye contact. Magnetic, slightly mysterious, unhurried.
LIGHTING: Soft light catching the face as it turns. Back/shoulders slightly in shadow.
LENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — painterly bokeh with sharp face.
Hair should be natural and undisturbed.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'face-diagonal': `DETAIL SHOT — FACE/PORTRAIT (DIAGONAL THREE-QUARTER):
Generate a cinematic close-up portrait at a diagonal three-quarter angle.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Tight close-up from chest/shoulders up. Face at DIAGONAL three-quarter angle — approximately 30-40 degrees from camera. Shows jawline, one cheekbone prominently.
EXPRESSION: Calm, distant, emotionless. Eyes looking slightly past camera. NOT at camera.
LIGHTING: Beautiful directional light sculpting the face from the angled side.
LENS: Shot on Canon RF 85mm f/1.2L USM DS — smooth bokeh, luminous skin.
Hair should be natural and undisturbed.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'face-upward': `DETAIL SHOT — FACE/PORTRAIT (UPWARD GAZE):
Generate a cinematic close-up portrait of the model gazing slightly upward.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Tight close-up from chest/shoulders up, shot from slightly lower angle. Model tilts chin slightly upward, gazing diagonally up.
EXPRESSION: Serene, contemplative, quietly awed. NOT at camera. Eyes directed upward.
LIGHTING: Light from above, catching the face. Beautiful catchlights in upward-looking eyes.
LENS: Shot on Zeiss Otus 85mm f/1.4 — clinical sharpness with refined bokeh.
Hair should be natural and undisturbed.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'upper-body': `DETAIL SHOT — UPPER BODY CLOSE-UP:
Generate a cinematic upper-body photograph from waist up.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Medium close-up from waist/hip up, showing garment details — texture, drape, buttons, seams. The garment must be the EXACT one from reference images.
LIGHTING: Beautiful directional light emphasizing fabric texture. Architectural light, window light, or dappled natural light.
MOOD: Luxurious, tactile, editorial — like a high-end lookbook detail shot.
LENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary tonal depth, smooth medium-format bokeh.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'upper-body-gaze': `DETAIL SHOT — UPPER BODY CLOSE-UP (DIRECT GAZE):
Generate a cinematic upper-body photograph from waist up.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Medium close-up from waist/hip up, showing garment details.
EXPRESSION: MUST look directly into the camera with a strong, dignified gaze. Quietly powerful. Chin slightly lifted.
LIGHTING: Beautiful directional light emphasizing fabric texture.
MOOD: Powerful, editorial, captivating — luxury campaign hero shot.
LENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — razor-sharp subject, painterly bokeh.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'upper-body-texture': `DETAIL SHOT — UPPER BODY (FABRIC TEXTURE FOCUS):
Generate a cinematic upper-body photograph emphasizing garment texture and construction.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Medium close-up from waist up, slightly angled 3/4 body to show fabric drape in three dimensions.
EXPRESSION: Looking slightly away from camera. Calm, disengaged, statuesque.
LIGHTING: Raking sidelight sculpting every fold, seam, and texture of the fabric surface.
LENS: Shot on Hasselblad XCD 80mm f/1.9 (medium format) — micro-texture details, extraordinarily smooth tonal gradation.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'upper-body-side': `DETAIL SHOT — UPPER BODY (SIDE VIEW):
Generate a cinematic upper-body photograph from the side.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Medium close-up from waist up, shot from the SIDE (profile or strong 3/4 body angle). Shows garment silhouette, drape, and fit from the side.
EXPRESSION: Looking away, calm, emotionless. Profile or near-profile of the face.
LIGHTING: Strong rim light outlining the garment's silhouette edge. Soft fill on visible side.
LENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary silhouette rendering.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'upper-body-upward': `DETAIL SHOT — UPPER BODY (UPWARD GAZE):
Generate a cinematic upper-body photograph with the model gazing upward.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Medium close-up from waist up. Model tilts chin slightly upward. Shot from slightly below eye level. Shows garment neckline and collar.
EXPRESSION: Serene, contemplative, emotionless. NOT at camera. Chin tilted up.
LIGHTING: Light from above catching the garment's upper surfaces.
LENS: Shot on Zeiss Otus 85mm f/1.4 — clinical sharpness with dignified bokeh.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'upper-body-glance-back': `DETAIL SHOT — UPPER BODY (GLANCE BACK):
Generate a cinematic upper-body photograph of the model glancing back over her shoulder.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Medium close-up from waist up. Body faces AWAY from camera (back/3/4 back view), head turned to look back DIRECTLY at camera. Shows garment's back construction.
EXPRESSION: Direct, confident eye contact through the glance back. Magnetic, unhurried.
LIGHTING: Soft light catching the face as it turns. Back of garment in slightly different light.
LENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — painterly bokeh with sharp face.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'upper-body-hair-tuck': `DETAIL SHOT — UPPER BODY (HAIR BEHIND EAR):
Generate a cinematic upper-body photograph of the model tucking hair behind her ear.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Medium close-up from waist up. Model raises one hand to gently tuck a strand of hair behind her ear — natural, feminine gesture mid-motion. Reveals garment sleeve construction.
EXPRESSION: Looking slightly away from camera, calm, private. NOT at camera. Unposed, natural.
LIGHTING: Soft, flattering light. Raised hand and exposed ear/neck well-lit.
LENS: Shot on Canon RF 85mm f/1.2L USM DS — smooth, dreamy bokeh, luminous skin.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'bag': `DETAIL SHOT — BAG/ACCESSORY CLOSE-UP:
Generate a cinematic close-up focusing on the bag or accessory the model is carrying.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Close-up from waist down to mid-thigh, with the bag as the hero. Model's hand holding the bag visible. Show enough garment for outfit context. Bag must be EXACT from reference.
LIGHTING: Beautiful directional light revealing bag material texture — surface grain, stitching, construction quality.
MOOD: Luxurious, covetable, editorial — like an Hermès accessory campaign.
LENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary material texture rendering.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'bag-detail': `DETAIL SHOT — BAG/ACCESSORY EXTREME CLOSE-UP:
Generate a cinematic extreme close-up of the bag or accessory.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Tight crop on the bag — focus on the most prominent detail area (surface texture, stitching, closure, or defining design element). Model's hand grips or rests on the bag naturally. Only hand, arm, and nearby garment fabric visible.
POSE: Model holds bag casually at side, or bag rests on a surface with model's hand draped over it. Effortless, natural grip.
LIGHTING: Raking sidelight accentuating texture. Shallow depth of field with bag's front face razor-sharp.
LENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — bag surface impossibly sharp, everything else dissolves into painterly bokeh.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'walk-side-full': `DETAIL SHOT — CATWALK SIDE VIEW (FULL BODY):
Generate a cinematic side-view photograph of the model walking.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: FULL BODY from the SIDE — model walks across the frame in editorial stride. Camera perpendicular to walking direction. Both SHOES and BAG clearly visible. Full outfit head-to-toe from side angle.
POSE: Mid-stride, confident, unhurried. Bag swings naturally with walking motion.
LIGHTING: Beautiful directional light revealing full silhouette. Side angle creates depth in garment layers.
LENS: Shot on Contax Planar 45mm f/2 — natural perspective.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'walk-side-lower': `DETAIL SHOT — CATWALK SIDE VIEW (LOWER BODY):
Generate a cinematic side-view photograph focusing on the lower body while walking.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Cropped from waist/hip down to the ground — SHOES and lower garment are heroes. Shot from SIDE as model walks. BAG visible if carried at side. Ground texture visible.
POSE: Mid-stride from the side — one leg forward, one back, dynamic walking motion. Shoe detail sharp and clear.
LIGHTING: Low-angle light raking across the ground, long shadows from shoes and legs.
LENS: Shot on Canon TS-E 90mm f/2.8L Macro — tilt-shift selective focus.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'lean-side': `DETAIL SHOT — LEANING AGAINST WALL (SIDE VIEW):
Generate a cinematic side-view photograph of the model leaning against a wall or pillar.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: FULL BODY from the SIDE — model leans against a wall, pillar, or column. Both SHOES and BAG clearly visible. Side angle reveals garment drape at rest.
POSE: One shoulder against surface, weight on one leg, other leg bent or crossed. One hand holding bag, other relaxed. Candid, natural.
LIGHTING: Beautiful sidelight from architecture — window light, doorway, or ambient.
LENS: Shot on Leica Summilux-M 35mm f/1.4 ASPH — warm rendering with environmental context.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,

    'bench-side': `DETAIL SHOT — SEATED ON BENCH (SIDE VIEW):
Generate a cinematic side-view photograph of the model seated on a bench or ledge.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: FULL BODY from the SIDE — model sits on bench, stone ledge, or low wall. Legs crossed elegantly. BAG placed beside her on the surface, casually but visible. SHOES clearly visible with crossed legs showcasing them.
POSE: Seated, legs crossed, posture relaxed but elegant. One hand on bag, other on knee. A natural pause moment.
LIGHTING: Warm, natural directional light from the side. Seated pose creates interesting garment folds.
LENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary tonal depth.
${aspectRatio} aspect ratio. No text, no watermarks. Photorealistic 8K quality.`,
  };

  return detailPrompts[detailMode] || detailPrompts['upper-body'];
}

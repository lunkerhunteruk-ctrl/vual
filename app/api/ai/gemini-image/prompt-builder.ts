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

  const heightNote = modelSettings?.height ? ` The model is ${modelSettings.height}cm tall.` : '';
  const modelDesc = modelImage
    ? `Generate an image using the EXACT model appearance from the provided model reference images. This is an AI-generated virtual model, not a real person. She does not represent any existing individual. A full-body reference AND a face close-up crop are provided — use the close-up to ensure the face, facial features, expression, AND MAKEUP are reproduced with maximum accuracy and consistency across all shots. Face, body type, skin tone, and all visible cosmetics (eye makeup, lip color, brow shape, contour) must match exactly.${heightNote}
CRITICAL SKIN TONE RULE: The model's skin color for the ENTIRE BODY (face, neck, arms, hands, legs, feet) MUST match the skin tone shown in the provided face reference image. Do NOT use the skin color of any model in the garment reference images. The garment reference images are ONLY for clothing — ignore the skin color of the model wearing them. This applies to ALL visible skin.`
    : `A fashion model${heightNote}`;

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
      return buildOffshotScene(offshotVariant, modelDesc, fullGarmentDesc, cityName, pick, shotIndex, totalShots);
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
  const replaced = text
    .replace(/taken by a crew member/gi, 'taken by her close female friend')
    .replace(/a crew member/gi, 'her close female friend')
    .replace(/crew members/gi, 'her close female friend')
    .replace(/crew member/gi, 'her close female friend')
    .replace(/crew packing up/gi, 'a quiet moment together')
    .replace(/a mix of Japanese and international staff/gi, 'her close female friend')
    .replace(/Celebrating with the crew/gi, 'Enjoying the moment with her friend')
    .replace(/Other people \(.*?\) may be partially visible[^.]*\./gi, '')
    .replace(/partially visible/gi, 'sitting across from her or next to her')
    .replace(/BEHIND-THE-SCENES/gi, 'CANDID')
    .replace(/photographer's contact sheet that was never meant to be published/gi, "friend's phone gallery — a private memory between two close friends")
    .replace(/with a film camera during downtime/gi, 'with a phone or small camera')
    .replace(/equipment cases, paper cups, chairs, bags, coats on hooks, etc\./gi, 'personal belongings — bags, phones, coffee cups.')
    .replace(/cables, equipment cases/gi, 'personal items');
  return replaced + `

ABSOLUTE RULE — PEOPLE IN THE SCENE:
- There must be ZERO men visible in the image — no male hands, arms, backs, or silhouettes.
- There must be NO third person. Maximum 2 women total (the model + optionally her friend). No other friends, no staff serving in foreground, no bartenders facing them, no other diners at their table.
- No one should be photographing them from outside (no third-person photographer). Photos are either taken by the friend (who is invisible behind the camera) or selfies.
- Background people (random strangers far away, blurred) are acceptable, but NO ONE should appear to be part of their group.
- If this rule conflicts with any other instruction, THIS RULE WINS.`;
}

function buildOffshotA(modelDesc: string, garmentDesc: string, locationNote: string, pick: (arr: string[]) => string, shotIndex?: number): string {
  const offshotDirective = `CRITICAL INSTRUCTION: This is NOT a fashion photograph. This is a RAW, CANDID, BEHIND-THE-SCENES snapshot taken by a crew member with a film camera during downtime. The model is NOT posing, NOT performing, NOT aware of being photographed (or only just noticed). This must look like a REAL moment captured by accident — like a photo you'd find on a photographer's contact sheet that was never meant to be published.

ANTI-FASHION RULES:
- The model must NOT be centered perfectly in frame. Off-center composition, cut-off limbs, tilted horizon are OK and encouraged.
- NO perfect lighting setup. Use only available ambient light — overhead fluorescent, window light, practical lamps.
- The model's body language must be RELAXED and UNPOSED — slouching, leaning, curled up, mid-motion. Never standing straight with good posture like a fashion model.
- Background should show REAL environment clutter — cables, equipment cases, paper cups, chairs, bags, coats on hooks, etc.
- The overall feeling should be intimate, voyeuristic, unpolished — like a diary photo, NOT a magazine spread.

GARMENT RULE: The model must wear ONLY the garments provided in the reference images. Do NOT add, change, or coordinate any clothing items beyond what is shown in the references. No extra layers, no accessories, no shoes that aren't in the references. Reproduce the exact outfit as-is.`;

  const leica = 'Shot on Leica M6 with Summicron 35mm f/2, Kodak Portra 400 film. Handheld, slightly imperfect focus.';
  const qualityColor = 'QUALITY: Heavy film grain, slightly warm color cast, soft focus edges, natural available light only. The framing is deliberately imperfect — extra headroom, slight tilt, subject off-center. Looks like it was shot quickly without careful composition. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images.';
  const qualityGolden = 'QUALITY: Heavy film grain, golden late-afternoon light, slightly faded warm colors. Casual, imperfect composition with environmental context. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images.';

  const categories = [
    {
      actions: [
        'holding a paper coffee cup with both hands, steam rising faintly. She looks slightly sleepy, not yet "on" for the camera',
        'sitting cross-legged reading a worn paperback book, completely absorbed',
        'scrolling through her phone with one thumb, a barely perceptible smirk on her lips',
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
      quality: 'QUALITY: Heavy film grain, warm tungsten color from practical lights, slightly underexposed, candid. Shallow depth of field. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images.',
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
      quality: 'QUALITY: Heavy film grain, available light, slightly overexposed highlights, warm. Casual framing — not centered, some negative space. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images.',
      expression: 'Tired but beautiful. The exhaustion showing through the perfect makeup.',
    },
    {
      actions: [
        'has just noticed the photographer taking a candid shot. She turns toward the camera with a cool, unamused look — as if deciding whether to allow it',
        'covers her face partially with one hand, a cool, enigmatic smirk — caught off-guard but still composed',
        'looks directly into the lens with a deadpan expression, deliberately NOT smiling — a coolly amused standoff',
      ],
      wardrobe: garmentDesc,
      location: `${locationNote}.`,
      film: leica,
      quality: 'QUALITY: Heavy film grain, warm tones, slightly soft focus (shot quickly), natural light. The moment feels stolen. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images.',
      expression: 'A flicker of real personality — coolly amused, enigmatic. NOT a posed expression, but never fully unguarded.',
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
      expression: 'Quiet detached contentment, a cool stillness — off-duty but never fully unguarded.',
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
- The overall feeling is private, warm, celebratory — like a photo posted on someone's close friends Instagram story.

GARMENT RULE: The model must wear ONLY the garments provided in the reference images. Do NOT add, change, or coordinate any clothing items beyond what is shown in the references. No extra layers, no accessories, no shoes that aren't in the references. Reproduce the exact outfit as-is.`;

  const leicaNight = 'Shot on Leica M6 with Summicron 35mm f/2, Kodak Portra 800 film pushed to 1600. Handheld, available light only, warm color cast from ambient lighting.';
  const qualityNight = 'QUALITY: Heavy film grain (Portra 800 pushed), warm amber/golden color cast from candles and ambient light, shallow depth of field, slightly soft focus. Intimate framing — feels like a friend took this photo. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images.';
  const qualityNeon = 'QUALITY: Heavy film grain, mixed color temperature — warm practicals vs cool neon. Cinematic night-time feel. Slightly underexposed with bright highlights from signs and lights. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images.';
  const qualityCar = 'QUALITY: Heavy film grain, mixed lighting — dashboard glow, passing streetlights creating moving shadows. Intimate, private, documentary feel. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images.';

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
        'holding a latte or cappuccino, steam rising, looking out the window with a detached, contemplative expression',
        'mid-bite of a pastry or cake, fork in hand, looking at the camera with a cool, knowing expression',
        'leaning back in her cafe chair, both hands wrapped around a warm coffee cup, watching people walk by outside with quiet observation',
        'glancing at something on her phone while stirring her coffee absently, a faint enigmatic smile',
        'sitting at a window seat, face half-lit by golden afternoon light, coffee cup on the table, reading her phone with a barely perceptible smirk',
      ],
      wardrobe: `${garmentDesc} — still in the shoot outfit but jacket draped over the chair, slightly loosened up`,
      location: `A cozy local cafe near ${cityName || 'the shooting location'}. ${cityContext} Afternoon to early evening light. Coffee cups, pastries, warm interior.`,
      film: leicaNight, quality: qualityNight,
      expression: 'Quiet detachment. A cool, composed presence — she owns the space without trying.',
    },
    // Shot 2: RESTAURANT A
    {
      actions: [
        'mid-bite of food, chopsticks or fork halfway to her mouth, looking at the camera with a cool, unamused expression — as if daring the photographer',
        'resting her chin on one hand, elbow on the table, listening to a story with an enigmatic half-smile',
        'holding up a piece of food toward the camera with elegant fingers, a knowing look',
        'raising a glass in a toast with crew members, composed and confident',
        'sitting sideways in her chair, legs crossed, one arm draped over the back, drink dangling from her fingers — quiet authority',
      ],
      wardrobe: `${garmentDesc} — jacket removed, draped over chair. More relaxed than during the shoot`,
      location: `A ${genreA} near ${cityName || 'the shooting location'}. ${cityContext} Beautiful food, drinks, lively atmosphere. Warm lighting, authentic interior.`,
      film: leicaNight, quality: qualityNight,
      expression: 'Enigmatic, softly lit — a mysterious presence at the table.',
    },
    // Shot 3: RESTAURANT B
    {
      actions: [
        'a brief, contained laugh at something someone just said, leaning back in her chair — amused but composed',
        'leaning over the table to look at someone\'s phone screen, one hand elegantly holding her drink',
        'taking a group selfie with 2-3 crew members — she maintains a composed, cool expression with a slight mysterious smile',
        'standing up making a confident toast, one hand holding a glass up — commanding the table effortlessly',
        'mid-chew, eyes cool and direct as she realizes the camera is on her — unbothered',
      ],
      wardrobe: `${garmentDesc} — outfit slightly loosened, sleeves pushed up, top button undone`,
      location: `A ${genreB} near ${cityName || 'the shooting location'}. ${cityContext} A second stop of the evening. Shared plates, bottles, warm pendant lights.`,
      film: leicaNight, quality: qualityNight,
      expression: 'Cool confidence amid the celebration — she observes more than she reveals.',
    },
    // Shot 4: BAR / PUB
    {
      actions: [
        'holding a drink up at eye level, examining it against the warm bar light with a cool, appraising expression',
        'mid-sip, eyes looking over the rim at the camera with a subtly mischievous glint',
        'sitting at a bar counter, one elbow on the bar, drink in hand, turned toward the camera with a cool half-smile',
        'cheers-ing glasses with someone, her face visible behind the glasses — composed, knowing look',
        'stirring her cocktail absently, looking directly at the camera with an enigmatic expression',
      ],
      wardrobe: `${garmentDesc} — casual, jacket off, sleeves rolled up. Completely comfortable`,
      location: `A cozy bar, pub, or drinking spot near ${cityName || 'the shooting location'}. ${cityContext} Warm amber lighting, bottles on shelves, lively but intimate.`,
      film: leicaNight, quality: qualityNeon,
      expression: 'Quiet confidence — she owns the space without trying.',
    },
    // Shot 5: CAR RIDE
    {
      actions: [
        'sitting in the back seat, head leaned against the window, city lights streaking past. Cool, distant eyes looking at camera',
        'in the back seat, showing her phone screen to the person next to her, a faint mysterious smile',
        'looking out the car window at the night city, chin resting elegantly on her hand, reflections of lights on the glass',
        'asleep in the back seat, head tilted to one side, jacket used as a blanket',
        'scrolling through the day\'s photos on her phone, face lit by screen glow, an enigmatic, private expression',
      ],
      wardrobe: `${garmentDesc} — wrapped in a jacket for warmth, slightly disheveled from a long day`,
      location: `Inside a car driving through ${cityName || 'the city'} at night. ${cityContext} Local architecture and city lights visible through windows.`,
      film: leicaNight, quality: qualityCar,
      expression: 'Detached contentment. A quiet, mysterious stillness in the moving city.',
    },
    // Shot 6: NIGHT STREET
    {
      actions: [
        'walking down a narrow street at night, slightly ahead of camera, turning back with a cool half-smile — streetlights creating rim light',
        'standing under a neon sign or streetlight, leaning against a wall, phone in hand, looking at camera with an enigmatic gaze',
        'crouching to pet a stray cat on the sidewalk, a faint mysterious smile, her drink placed on the ground beside her',
        'walking alongside a crew member (partially visible), coolly amused, on an empty street',
        'standing at a crosswalk, wind in her hair, city lights reflecting off wet pavement — an untouchable presence',
        'sitting on a low wall on the street, eating street food or ice cream, looking up at camera with a knowing look',
      ],
      wardrobe: `${garmentDesc} — jacket on for the cool night air, styled but lived-in`,
      location: `A street near ${cityName || 'the shooting location'} at night. ${cityContext} Local architecture, shop fronts, street signs in the local language, warm streetlights. Authentic to this specific area.`,
      film: leicaNight, quality: qualityNeon,
      expression: 'Magnetic, enigmatic. Off-duty but never fully unguarded — walking through a city like she already owns it.',
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
- The overall feeling is fresh, optimistic, real — like a photo from a model's "day in my life" Instagram story.

GARMENT RULE: The model must wear ONLY the garments provided in the reference images. Do NOT add, change, or coordinate any clothing items beyond what is shown in the references. No extra layers, no accessories, no shoes that aren't in the references. Reproduce the exact outfit as-is.`;

  const leicaMorning = 'Shot on Leica M6 with Summicron 35mm f/2, Kodak Portra 400 film. Handheld, natural morning light, slightly warm color cast.';
  const qualityMorning = 'QUALITY: Fine film grain (Portra 400), soft warm morning light, natural color palette. Casual framing — feels like a crew member snapped this between tasks. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images.';
  const qualityBright = 'QUALITY: Fine film grain, bright natural daylight, clean colors with slight warmth. Fresh, airy feeling. Casual composition. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images.';
  const qualityInterior = 'QUALITY: Fine film grain, soft window light mixing with warm interior lighting, gentle shadows. Intimate, private morning atmosphere. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images.';

  const cityContext = cityName
    ? `MANDATORY LOCATION: The setting MUST be in or very near ${cityName}. The hotel, cafe, restaurant, or street must look and feel authentically local to ${cityName} — local architecture, local language on signs and menus, local style, local people in the background. Do NOT set this in Japan, Tokyo, or any Asian city unless ${cityName} is explicitly in that region. The location must be geographically accurate to ${cityName}.`
    : 'The setting should feel authentic and local to the shooting location.';

  const categories = [
    // Shot 1: HOTEL BREAKFAST BUFFET
    {
      actions: [
        'at the hotel breakfast buffet, picking up a fruit bowl with a cool, composed expression — caught by the camera mid-reach. Other breakfast items visible on the buffet line',
        'seated at the breakfast table with a continental breakfast spread — croissants, jam, butter, orange juice, coffee. She is mid-bite, looking at the camera with a calm, unbothered expression',
        'at the breakfast table with various plates of food spread out, she has just accidentally spilled a glass of water — looking at the camera with a cool, wry expression, one hand reaching for a napkin',
        'eating a bowl of granola yogurt at the breakfast table, resting her chin elegantly on one hand, looking at the camera with an enigmatic half-smile. Coffee and fruit on the table',
        'standing at the buffet holding a plate, deciding what to take — she notices the camera and gives a knowing, composed look. Morning light from the restaurant windows',
      ],
      wardrobe: 'wearing casual but put-together morning clothes — a simple knit top and comfortable pants, or a casual dress. Hair neatly styled (not messy). Light natural makeup already done',
      location: `A hotel breakfast buffet restaurant in ${cityName || 'the shooting location'}. ${cityContext} A comfortable 3-star or 4-star hotel — clean, welcoming, approachable (NOT a luxury 5-star hotel). Morning light through large windows, other hotel guests visible in background. Buffet counter with food trays, fresh bread, fruits, cereals.`,
      film: leicaMorning, quality: qualityMorning,
      expression: 'Cool, composed — a quiet morning elegance. NOT cheerful, NOT bubbly.',
    },
    // Shot 2: HOTEL LOBBY — CANDID STAFF SHOT
    {
      actions: [
        'standing in the hotel lobby, a crew member has just called her name and snapped a photo — she looks directly at the camera with a composed, cool expression. Lobby furniture and reception area visible behind her',
        'sitting on a lobby sofa with her bag beside her, looking directly at the camera with a calm, detached expression — a crew member took this casually while waiting for everyone to gather',
        'standing near the hotel entrance with morning light streaming in, bag over her shoulder, looking at the camera with a confident, ready-to-go expression',
        'leaning against a lobby pillar or wall, phone in one hand, looking directly at the camera with a cool half-smile — a casual snap by a passing crew member',
        'walking through the lobby toward the exit, she turns to look at the camera with a faint mysterious smile — other guests and staff visible in the background, luggage cart nearby',
      ],
      wardrobe: `${garmentDesc} — dressed and ready for the day. Bag over shoulder or in hand`,
      location: `The lobby of a 3-star or 4-star hotel in ${cityName || 'the shooting location'}. ${cityContext} NOT a luxury grand hotel — a clean, comfortable, approachable hotel with a welcoming atmosphere. Simple but tidy lobby with reception desk, seating area, maybe a small coffee station. The hotel should feel like a real working crew would actually stay here. Bright morning light from entrance.`,
      film: leicaMorning, quality: qualityBright,
      expression: 'Looking directly at camera. Composed, cool, quietly confident — a casual photo but she never drops the enigmatic aura.',
    },
    // Shot 3: HOTEL ROOM — BED SCENE (STILL LIFE)
    {
      actions: [
        'sitting on the edge of the unmade hotel bed, phone in hand, looking at the camera with a cool, direct gaze — the bed behind her is scattered with personal items: sunglasses, room key, lip balm, a magazine, phone charger, a water bottle. Morning light streaming through sheer curtains',
        'lying on her stomach on the hotel bed, chin propped on both hands, looking at the camera with a subtly mischievous expression — the bed surface around her is scattered with sunglasses, a scarf, earbuds, snacks, and a coffee cup on the nightstand',
        'standing beside the bed reaching for her sunglasses on the pillow, looking at the camera with a knowing look — the unmade bed is covered with the beautiful chaos of getting ready: clothes laid out, accessories, charger cables, makeup bag',
        'sitting cross-legged in the middle of the unmade bed, surrounded by scattered items — sunglasses, hat, phone, magazine, room key. She looks at the camera with a detached, quiet expression. Morning light through curtains',
        'perched on the edge of the bed, one leg tucked under her, scrolling her phone — the bed behind her shows scattered personal items: sunglasses on the pillow, a scarf, snacks, earbuds. She glances up at the camera with an enigmatic expression',
      ],
      wardrobe: 'wearing comfortable travel clothes — a simple t-shirt and casual pants, or a light dress. Makeup done, hair styled. Barefoot or in hotel slippers (NO outdoor shoes on the bed)',
      location: `A hotel room in ${cityName || 'the shooting location'}. ${cityContext} A comfortable 3-star or 4-star hotel room — not luxurious but clean and pleasant. Unmade bed with white sheets, scattered personal items creating an editorial still-life. Soft morning light through curtains. Open suitcase visible, hanging clothes on a chair. IMPORTANT: Do NOT place shoes on the bed — shoes should be on the floor by the door or beside the bed.`,
      film: leicaMorning, quality: qualityInterior,
      expression: 'Cool, unhurried morning energy — an enigmatic presence even in private moments.',
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
        'in the back seat, a brief contained laugh at something a crew member beside her (partially visible) said, the city\'s downtown area rolling past outside the window',
        'leaning forward in the taxi to look at something through the windshield — a landmark or busy intersection of the city visible ahead, morning traffic around them',
        'in the back seat looking directly at the camera with a cool half-smile, one arm resting on the window — the city streets visible through the glass behind her',
      ],
      wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Sunglasses on or pushed up, bag on the seat beside her`,
      location: `Inside a taxi or car driving through the busy downtown area near ${cityName || 'the shooting location'}. ${cityContext} Local street signs, shops, architecture, and morning commuters visible through windows. The route passes through a recognizable commercial or entertainment district.`,
      film: leicaMorning, quality: 'QUALITY: Fine film grain, mixed lighting — soft morning daylight through car windows, occasional shadow from buildings. Documentary feel, intimate car interior framing. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images.',
      expression: 'Quiet anticipation, observing a city she\'s working in. The calm before the creative storm.',
    },
    // Shot 6: CAFE — COFFEE & LUNCH
    {
      actions: [
        'sitting at a cafe terrace table with a latte, looking directly at the camera with an enigmatic half-smile — pastries and a magazine on the table',
        'seated by the cafe window with a sandwich or salad plate, looking up at the camera with a cool, composed expression — natural light on her face',
        'at a cafe table with one elbow on the table, chin resting on her hand, looking directly at the camera with a knowing, detached expression — empty coffee cups and crumbs on the table',
        'holding up a coffee cup in an elegant toast toward the camera, a faint mysterious smile — a crew member\'s arm partially visible across the table',
        'sitting at an outdoor cafe table, fork in hand over a plate of local food, looking at the camera with a cool, appraising expression — bright daylight, street visible behind her',
      ],
      wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Sunglasses on top of head or on the table. A light jacket or bag draped over the chair`,
      location: `A local cafe near ${cityName || 'the shooting location'}. ${cityContext} Authentic local cafe — not a chain. Local pastries or food in the display, local language on the menu board, neighborhood regulars in the background. Bright daylight, outdoor terrace or large windows. Plants, wooden furniture, warm atmosphere.`,
      film: leicaMorning, quality: qualityBright,
      expression: 'Looking directly at camera. Composed, cool, quietly confident — an enigmatic presence even in a casual cafe moment.',
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
  totalShots?: number,
): string {
  const seed = (shotIndex || 0) * 7 + Math.floor(Date.now() / 60000);

  // If the user typed a specific venue/place (more than just a city name), use it directly
  // Simple heuristic: if input contains 2+ words or non-ASCII (Japanese etc), treat as specific venue
  const isSpecificVenue = cityName && (cityName.trim().split(/\s+/).length >= 2 || /[^\x00-\x7F]/.test(cityName));

  // Japan mode: if "日本" is in the prompt, switch to "hanging out with a close female friend" setting
  const isJapan = cityName.includes('日本');

  const cityContext = cityName
    ? `MANDATORY LOCATION: The venue MUST be ${isSpecificVenue ? cityName.replace('日本', '').trim() : `in or very near ${cityName.replace('日本', '').trim()}`}. It must look and feel authentically local — local cuisine, local language on signs/menus, local architectural style, local people in the background.${isJapan ? ' This is in JAPAN.' : ` Do NOT set this in Japan or any Asian city unless ${cityName} is explicitly in that region.`} The location must be geographically accurate.
VENUE NAME RULE: The venue/restaurant/bar MUST have a realistic, believable proper name on its signage. STRICTLY FORBIDDEN on signage: the user's input text, location names (e.g. "吉祥寺"), area names, cuisine genres (e.g. "カフェ", "スペインバル", "イタリアン"), or any combination of these. Instead, invent a unique fictional shop name that feels CONTEMPORARY and MODERN — the kind of trendy, stylish name a young owner in 2025 would choose for a new opening. Think Instagram-worthy branding, not old-fashioned or traditional naming. Be creative and never reuse the same name twice.
CONTEMPORARY ATMOSPHERE: The venue interior and any visible streetscape must look PRESENT-DAY (2025-2026). Modern interior design, contemporary furniture, clean aesthetics. Avoid dated or retro decor unless it is a deliberate, curated design choice (e.g. a modern neo-retro concept). The overall feel should be current and stylish.`
    : 'The venue should feel authentic and local to the shooting location.';

  const leicaMorning = 'Shot on Leica M6 with Summicron 35mm f/2, Kodak Portra 400 film. Handheld, natural light, slightly warm color cast.';
  const leicaNight = 'Shot on Leica M6 with Summicron 35mm f/2, Kodak Portra 800 film pushed to 1600. Handheld, available light only, warm color cast from ambient lighting.';
  const qualityMorning = 'QUALITY: Fine film grain (Portra 400), soft warm morning light, natural color palette. Casual framing — feels like a friend snapped this. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images.';
  const qualityNight = 'QUALITY: Heavy film grain (Portra 800 pushed), warm amber/golden color cast from candles and ambient light, shallow depth of field, slightly soft focus. Intimate framing. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images.';
  const qualityNeon = 'QUALITY: Heavy film grain, mixed color temperature — warm practicals vs cool neon/LED. Cinematic night-time feel. Slightly underexposed with bright highlights from lights. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images.';

  const companionDesc = isJapan
    ? 'The model is hanging out with ONLY her close female friend (a stylish Japanese woman of similar age, with a DIFFERENT hairstyle from the model). They are the ONLY two people in their group. The friend is sitting across from her or next to her. The vibe is two close friends on a day out.'
    : 'Other people (crew members — a mix of Japanese and international staff) may be partially visible — arms, backs, hands holding glasses or phones.';

  const photographerDesc = isJapan
    ? 'shot on a phone or small camera by her friend'
    : 'shot on a phone or small camera by a crew member';

  const baseDirective = isJapan
    ? `MOST IMPORTANT RULE — READ THIS FIRST: ZERO men in the image — no male hands, arms, or bodies anywhere in the frame. No waiters, no bartenders, no other diners at adjacent tables visible in the foreground. No third person ever — maximum 2 women (the model + optionally her friend). Only distant blurred strangers in the far background are acceptable. Follow the SOLO SHOT or SELFIE instructions in the SCENE section to determine whether the friend appears.

This is a CANDID snapshot ${photographerDesc}. The model is a real person hanging out with her close female friend. Framing is imperfect — off-center, slightly tilted, casual.
The overall feeling is private, warm, real — like a photo posted on someone's close friends Instagram story.`
    : `CRITICAL INSTRUCTION: This is NOT a fashion photograph. This is a CANDID snapshot ${photographerDesc}. The model is a real person in a real social moment. Framing is imperfect — off-center, slightly tilted, casual.
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
          'at the breakfast buffet, picking up a fruit bowl with a cool, composed expression — caught by the camera mid-reach. Plates of pastries and bread behind her on the buffet line',
          'seated at the table with a continental breakfast spread — croissants, jam, butter, orange juice, coffee. She looks at the camera mid-bite with a calm, unbothered expression',
          'at the breakfast table with various plates spread out, she has just accidentally spilled a glass of water — looking at the camera with a cool, wry expression, one hand reaching for a napkin',
          'eating a bowl of granola yogurt, resting her chin elegantly on one hand, looking at the camera with an enigmatic half-smile. Coffee cup and fresh fruit on the table beside her',
          'standing at the buffet holding a plate, deciding what to take — she notices the camera and gives a knowing, composed look. Morning light from restaurant windows illuminating her face',
          'pouring coffee from a carafe at the breakfast table, concentrating on not spilling, then looking up at the camera with a cool, quiet expression. Toast and eggs on her plate',
          'a brief, contained exchange with a crew member (partially visible) over breakfast, one hand holding a coffee cup elegantly. Plates of food between them',
          'sitting at the breakfast table, holding a piece of toast up to the camera with a subtly mischievous expression — cool, composed morning energy',
        ],
        wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Hair neatly styled. Natural makeup`,
        location: isSpecificVenue
          ? `At ${cityName}. ${cityContext} Morning light, other guests in the background. Breakfast food, fresh bread, fruits, cereals, coffee visible.`
          : `A ${venue} in ${cityName || 'the shooting location'}. ${cityContext} A comfortable, approachable place (NOT a luxury 5-star hotel). Morning light through windows, other guests in the background. Fresh bread, fruits, cereals, coffee visible.`,
        film: leicaMorning,
        quality: qualityMorning,
        expression: 'Cool, composed — a quiet morning elegance. NOT cheerful, NOT bubbly.',
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
          'sitting at a terrace table in bright daylight, fork in hand over a plate of local food, looking directly at the camera with a cool, knowing expression — a crew member across the table partially visible',
          'taking a photo of her beautifully plated lunch with her phone — concentrating on getting the angle right, then looking up at the camera with a faint mysterious smile',
          'mid-bite of a sandwich or local dish, cheeks slightly full, caught by the camera — she covers her mouth with one hand, eyes cool and amused',
          'leaning back in her chair, legs crossed, holding a glass of sparkling water or lemonade, looking directly at the camera with a detached, quiet satisfaction',
          'pointing at something on the menu, turning to the camera with a knowing look — a cool, understated curiosity. A crew member\'s hand visible holding another menu',
          'sharing a plate of appetizers with crew members, reaching across the table for the last piece — looking at the camera with a subtly mischievous expression',
          'sitting at the table with empty plates pushed aside, chin resting on one hand, looking directly at the camera with a cool, enigmatic expression — bright midday light on her face',
          'walking out of the restaurant into bright sunshine, sunglasses going on, takeaway coffee in hand — she looks back at the camera with a composed, confident expression',
        ],
        wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Sunglasses on top of head or on the table`,
        location: isSpecificVenue
          ? `At ${cityName}. ${cityContext} Bright daylight, outdoor seating or large windows. Local cuisine visible. Relaxed midday atmosphere.`
          : `A ${venue} near ${cityName || 'the shooting location'}. ${cityContext} Bright daylight, outdoor seating or large windows. Local cuisine, handwritten menus or chalkboards in the local language. Relaxed midday atmosphere.`,
        film: leicaMorning,
        quality: 'QUALITY: Fine film grain (Portra 400), bright natural daylight, vibrant but natural colors. Casual framing with outdoor light. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images.',
        expression: 'Looking at camera. Cool composure, quiet confidence — she never fully lets her guard down, even at lunch.',
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
          'mid-bite of food, chopsticks or fork halfway to her mouth, looking at the camera with a cool, unamused expression — as if daring the photographer. Warm candlelight on her face',
          'resting her chin on one hand, elbow on the table, listening to a story with an enigmatic half-smile — dinner plates and wine glasses between her and the partially visible crew member across the table',
          'raising a glass in a toast toward the camera — SHOT WITH ON-CAMERA FLASH (small hotshoe flash unit mounted on the Leica): harsh direct flash illuminates her face and the glass brightly against the dark restaurant background. Flash reflects in the wine/drink. Her expression is composed with a cool half-smile, caught in the stark white flash light. The background falls into darkness beyond the flash range',
          'leaning back in her chair, one hand on the table, a cool enigmatic smirk — composed and unhurried. Beautiful food on the table',
          'taking a group selfie with 2-3 crew members — SHOT WITH ON-CAMERA FLASH (small hotshoe flash unit mounted on the Leica): the flash washes their faces in bright white light, red-eye possible, background goes dark. She maintains a composed, cool expression with a slight mysterious smile while others grin. Slightly overexposed skin from the direct flash',
          'holding up a piece of food toward the camera on her fork or chopsticks with elegant fingers — a knowing, cool expression. Sharing plates and bottles on the table',
          'standing up making a confident toast, one hand holding a glass up — commanding the table effortlessly. Warm restaurant lighting',
          'sitting sideways in her chair, legs crossed, one arm draped over the back, drink dangling from her fingers — looking at the camera with quiet authority. The energy of someone who has earned this meal',
        ],
        wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Jacket removed and draped over chair, slightly more relaxed than during the shoot`,
        location: isSpecificVenue
          ? `At ${cityName}. ${cityContext} Warm interior lighting — candles, pendant lights, warm wall sconces. Beautiful food and drinks on the table. Lively but intimate dinner atmosphere.`
          : `A ${venue} near ${cityName || 'the shooting location'}. ${cityContext} Warm interior lighting — candles, pendant lights, warm wall sconces. Beautiful food and drinks on the table. Lively but intimate dinner atmosphere. Authentic local restaurant — not a tourist trap.`,
        film: leicaNight,
        quality: qualityNight,
        expression: 'Enigmatic, softly lit — a mysterious presence at the table. Cool confidence, never fully letting her guard down.',
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
          'on the dance floor, caught mid-movement — SHOT WITH ON-CAMERA FLASH (small hotshoe flash unit mounted on the Leica): harsh direct flash freezes her mid-dance, hair flying, body in motion. The flash blows out her skin and outfit brightly against the pitch-dark club background. Other dancers are ghostly silhouettes. A cool, fierce expression captured in the stark flash light',
          'standing near the DJ booth or speakers, eyes closed, head tilted, completely lost in the music — a crew member next to her (partially visible) also dancing. Strobe lights and smoke',
          'at a standing table near the dance floor, holding a drink, leaning toward a crew member to say something over the music — she looks at the camera mid-sentence with a knowing smile. Pulsing colored lights',
          'sitting in a booth or on a couch in the VIP or chill-out area, legs tucked under her, drink in hand — looking at the camera with cool, detached eyes. Bass-heavy ambient light, other people around',
          'walking through the club crowd — SHOT WITH ON-CAMERA FLASH (small hotshoe flash unit mounted on the Leica): the flash catches her turning back to the camera with a cool, enigmatic expression, face brightly lit against the dark crowd behind her. Eyes slightly squinted from the flash. Other clubgoers reduced to dark shapes. The harsh flash creates a raw, documentary nightlife photo feel',
          'taking a selfie with a crew member in the club bathroom mirror — flash reflecting in the mirror, makeup slightly worn from dancing, composed cool expressions with slight mysterious smiles. Real party energy',
          'leaning against the bar, one elbow propped, cocktail in hand — the bartender mixing drinks behind her, colored bottles backlit. She looks at the camera with magnetic, confident nightlife energy',
          'outside the club entrance, cooling off — hair slightly damp, drink in hand, coolly amused with crew members in the night air. Neon sign of the club visible, smokers and other clubgoers around',
        ],
        wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Slightly lived-in from dancing — sleeves pushed up, top button undone, hair slightly tousled`,
        location: isSpecificVenue
          ? `At ${cityName}. ${cityContext} Dark interior with dramatic colored lighting — LED strips, lasers, strobes, neon. Smoke/haze machine atmosphere. DJ booth visible. Other clubgoers dancing or socializing.`
          : `A ${clubType} in ${cityName || 'the shooting location'}. ${cityContext} Dark interior with dramatic colored lighting — LED strips, lasers, strobes, neon. Smoke/haze machine atmosphere. DJ booth visible. Other clubgoers dancing or socializing. The venue should feel authentic to the local nightlife scene.`,
        film: leicaNight,
        quality: qualityNeon,
        expression: 'Cool detachment amid the chaos — she observes more than participates. Magnetic, enigmatic presence on the dance floor.',
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
          'sitting at the bar counter, one elbow on the bar, cocktail or beer in hand — turned toward the camera with a cool half-smile. Bottles and warm lighting behind the bartender',
          'mid-sip of her drink, eyes looking over the rim directly at the camera with a subtly mischievous glint — foam or condensation on the glass',
          'cheers-ing glasses with a crew member, the glasses meeting in the center of frame — SHOT WITH ON-CAMERA FLASH (small hotshoe flash unit mounted on the Leica): harsh direct flash lights up their faces and the clinking glasses brightly. The warm bar background goes dark beyond the flash range. She has a composed, knowing look while the crew member grins. Slightly overexposed skin, flash reflecting in the glass surfaces. Raw party snapshot feel',
          'a cool, quiet laugh, drink held elegantly to the side — amused but composed. Bar regulars and warm pendant lights in the background',
          'sitting in a corner booth, legs tucked under her, cradling a warm drink — looking directly at the camera with an enigmatic, quiet expression. The bar buzzes softly around her',
          'standing at a high table, leaning on it with both arms, drink between her hands — SHOT WITH ON-CAMERA FLASH (small hotshoe flash unit mounted on the Leica): the flash harshly illuminates her face and upper body against the dim bar behind her. She looks at the camera with cool, quiet authority, caught in the bright white flash. A crew member beside her mid-gesture is partially lit. The flash creates deep shadows and a candid, unpolished nightlife photo look',
          'at the bar, examining a cocktail held up to the warm light, admiring the color — she turns to the camera with a cool, appraising expression',
          'playing darts, pool, or a bar game with crew members — caught mid-throw or mid-shot, a focused, competitive expression. Drinks on a nearby table, bar atmosphere around them',
        ],
        wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Casual, jacket off, sleeves rolled up. Completely comfortable and at ease`,
        location: isSpecificVenue
          ? `At ${cityName}. ${cityContext} Warm amber/golden lighting from pendant lights, bar back-lighting, candles. Worn surfaces, character. Lively but intimate atmosphere.`
          : `A ${barType} in ${cityName || 'the shooting location'}. ${cityContext} Warm amber/golden lighting from pendant lights, bar back-lighting, candles. Worn surfaces, character. A real bar where locals drink — not a hotel lobby bar. Lively but intimate atmosphere.`,
        film: leicaNight,
        quality: qualityNight,
        expression: 'Quiet confidence — she owns the space without trying. Cool, enigmatic, never fully unguarded.',
        reminder: 'This is a PUB/BAR candid snapshot — warm amber lighting, drinks, intimate social atmosphere. NOT a fashion photo.',
      };
    })(),

    // ============ SNAP — STREET SNAPSHOT AT ANY LOCATION ============
    'snap': (() => {
      const locationName = cityName || 'the location';
      return {
        actions: [
          `walking through ${locationName}, mid-stride, one hand holding her bag strap — she glances at the camera with a cool, effortless expression. A crew member walking beside her is partially visible. People and the environment of ${locationName} surround her`,
          `standing still for a moment at ${locationName}, scrolling her phone with one thumb — she looks up at the camera with a cool half-smile. The specific architecture and atmosphere of ${locationName} visible behind her`,
          `sitting on a bench, ledge, or seating area at ${locationName}, legs crossed, takeaway coffee in hand — looking directly at the camera with a calm, detached expression. The surroundings of ${locationName} frame the shot`,
          `leaning against a wall, column, or railing at ${locationName}, arms crossed or one hand in her pocket — looking at the camera with quiet confidence. The distinct environment of ${locationName} provides context`,
          `holding a takeaway coffee or drink, walking through ${locationName} — she turns back toward the camera with a faint mysterious smile. Motion blur on the background, sharp focus on her face`,
          `crouching down or bending slightly to look at something interesting at ${locationName} — she looks up at the camera with a cool, curious expression. The unique details of ${locationName} visible around her`,
          `standing at a window or glass wall at ${locationName}, looking out at the view — she turns to the camera, backlit by the light from outside. Silhouette-edge lighting, the interior of ${locationName} softly visible`,
          `caught in a coolly amused exchange with a crew member (partially visible) at ${locationName} — a composed, unscripted moment. Both are carrying bags or coffee. The character of ${locationName} is clear in the background`,
          `waiting — sitting or standing casually at ${locationName}, people-watching with a detached, zoned-out expression — then notices the camera and gives a knowing look. The energy and flow of ${locationName} visible around her`,
          `taking a selfie or photo of something at ${locationName} with her phone — the camera catches her from the side or slightly behind, showing both her and what she is photographing. The distinctive features of ${locationName} are prominent`,
        ],
        wardrobe: `${garmentDesc} — IMPORTANT: The garments, shoes, and all accessories must be EXACTLY as shown in the reference images. Styled and ready, but body language is completely casual and off-duty`,
        location: `At ${locationName}. Pick a SPECIFIC area within ${locationName} that would make a visually interesting candid snapshot — choose from the various spaces, corridors, waiting areas, entrances, restaurants, shops, platforms, concourses, outdoor areas, or any distinctive spot within ${locationName}. The chosen area must be recognizable as part of ${locationName} — show architecture, distinctive design elements, or environmental cues that make the location identifiable. Other people going about their day should be visible in the background. IMPORTANT — CONTEMPORARY FEEL: The street and surroundings must look like PRESENT-DAY (2025-2026). Show modern storefronts with clean, contemporary signage and branding — NOT old-fashioned or dated-looking shops. Look for recently renovated buildings, trendy cafes, modern retail, glass facades, and current urban design. Avoid depicting faded or retro-style signage, aged awnings, or run-down buildings unless they are genuinely characteristic of the area. The overall atmosphere should feel fresh, vibrant, and current. STREET SIGNAGE RULE: Shop signs and storefront names visible in the background must be realistic fictional business names — NEVER use the user's input text, location name ("${locationName}"), or any words from the prompt as shop signage. Invent plausible, modern shop names instead.`,
        film: cityName ? leicaMorning : leicaNight,
        quality: cityName ? qualityMorning : qualityNight,
        expression: 'Cool, composed, enigmatic — NOT a model pose, but never fully unguarded. The quiet confidence of someone who knows she is being watched.',
        reminder: `This is a CANDID STREET SNAPSHOT at ${locationName} — the model is a real person passing through, not posing for a fashion shoot. The location should be clearly identifiable. NOT a fashion photo.`,
      };
    })(),
  };

  const scene = scenes[sceneId];
  if (!scene) return '';

  // Japan mode: use completely separate actions — no crew references at all
  let actions = scene.actions;
  if (isJapan) {
    const loc = cityName.replace('日本', '').trim() || 'the location';
    const shotCount = totalShots || 6;
    // SOLO SHOT RULE: The model is ALONE in the frame. Her friend is the photographer but is
    // completely invisible — no hands, arms, phone, or any body part of the friend in the image.
    // The image shows ONLY the model. No third person ever.
    const soloRule = `SOLO SHOT — STRICT RULE: The model is the ONLY person in this photo. Her friend took this photo but the friend is completely behind the camera and INVISIBLE — no hands, arms, phone, shoulder, hair, or any body part of the friend may appear anywhere in the frame. No other people near her. Only distant blurred strangers in the far background are acceptable. This image contains EXACTLY 1 person: the model`;
    const japanActions: Record<string, { solo: string[]; withFriend: string[] }> = {
      'breakfast': {
        solo: [
          `is sitting at a cafe table, bringing a forkful of pancake toward her mouth, looking at the camera with a cool, knowing expression. Breakfast plate and coffee on the table. ${soloRule}`,
          `holds a coffee cup with both hands, looking at the camera with a faint mysterious smile over the rim. Breakfast plate on the table. ${soloRule}`,
          `rests her chin elegantly on one hand, looking at the camera with an enigmatic half-smile, a half-eaten pastry on the plate in front of her. Morning light on her face. ${soloRule}`,
          `is sipping orange juice through a straw, eyes looking at the camera with a cool, subtly mischievous expression. Breakfast spread on the table. ${soloRule}`,
          `leans forward on the table, chin resting on one hand, giving the camera a composed, enigmatic expression. Coffee and toast visible on the table. ${soloRule}`,
        ],
        withFriend: [
          `a SELFIE shot from the model's front-facing phone camera with a wide-angle lens. CLOSE-UP of both the model and her friend (a stylish Japanese woman with a different hairstyle), heads close together, both looking directly at the camera with composed, cool expressions and slight mysterious smiles. Coffee cups barely visible at the bottom. The phone is NOT visible in the image — this is the view FROM the phone camera. Wide-angle selfie perspective, slightly from above. EXACTLY 2 women in the image, no one else`,
        ],
      },
      'lunch': {
        solo: [
          `sits at a small outdoor table, fork in hand over a plate of food, looking at the camera with a cool, knowing expression. Bright daylight. ${soloRule}`,
          `is mid-bite, covering her mouth with one hand, eyes cool and amused at the camera. ${soloRule}`,
          `holds up a piece of food on her fork toward the camera with elegant fingers, a knowing look. Bright daylight. ${soloRule}`,
          `sips a drink through a straw, eyes peeking over the glass at the camera with a subtly mischievous look. Lunch plate visible. ${soloRule}`,
          `rests her chin on one hand next to her plate of food, an enigmatic half-smile at the camera. Bright midday light. ${soloRule}`,
        ],
        withFriend: [
          `a SELFIE shot from the model's front-facing phone camera with a wide-angle lens. CLOSE-UP of both the model and her friend, heads close together over the lunch table, both looking directly at the camera with composed, cool expressions. Food barely visible at bottom. The phone is NOT visible in the image — this is the view FROM the phone camera. Wide-angle selfie perspective. EXACTLY 2 women in the image, no one else`,
        ],
      },
      'dinner': {
        solo: [
          `raises her wine glass toward the camera with a cool half-smile. Candlelight illuminates her face. Food and candles on the table. ${soloRule}`,
          `rests her chin on one hand, looking at the camera with an enigmatic expression. Candles and food on the table. ${soloRule}`,
          `holds up a piece of food on her fork with elegant fingers, a knowing look. Warm lighting. ${soloRule}`,
          `takes a sip of wine, eyes looking at the camera over the glass with a mysterious Mona Lisa smile. Warm candlelight. ${soloRule}`,
          `a cool, enigmatic smirk with her head tilted slightly, one hand near her face — composed and mysterious. Warm restaurant glow. ${soloRule}`,
        ],
        withFriend: [
          `a SELFIE shot from the model's front-facing phone camera with a wide-angle lens. CLOSE-UP of both the model and her friend, faces lit by warm candlelight, both looking directly at the camera with composed, enigmatic expressions. Wine glasses barely visible. The phone is NOT visible in the image — this is the view FROM the phone camera. Wide-angle selfie perspective. EXACTLY 2 women in the image, no one else`,
        ],
      },
      'nightclub': {
        solo: [
          `is on the dance floor, hair flying mid-movement, looking at the camera with a fierce, cool expression. Phone flash illuminates her face against the dark club. ${soloRule}`,
          `leans against the bar, cocktail in hand, looking at the camera with magnetic confidence. Colored bottles behind her. ${soloRule}`,
          `poses with a drink, giving a coolly amused expression to the camera. Phone flash creates harsh light against the dark club. ${soloRule}`,
          `stands outside the club, cooling off, looking at the camera with a cool, detached expression. Neon sign behind her. ${soloRule}`,
        ],
        withFriend: [
          `a SELFIE shot from the model's front-facing phone camera with a wide-angle lens and flash. CLOSE-UP of both the model and her friend, flash illuminating both faces against the dark club. Both looking directly at the camera with cool, knowing expressions, hair messy from dancing. The phone is NOT visible in the image — this is the view FROM the phone camera. Wide-angle selfie perspective. EXACTLY 2 women in the image, no one else`,
        ],
      },
      'pub-bar': {
        solo: [
          `sits at the bar, cocktail in hand, looking at the camera with a cool half-smile. Warm amber lighting, bottles behind her. ${soloRule}`,
          `holds a cocktail up to the light, admiring the color, then turns to the camera with a cool, appraising expression. ${soloRule}`,
          `holds her drink elegantly, looking at the camera with an enigmatic expression. Warm bar atmosphere. ${soloRule}`,
          `takes a sip of her drink, eyes looking over the rim at the camera with a subtly mischievous glint. ${soloRule}`,
        ],
        withFriend: [
          `a SELFIE shot from the model's front-facing phone camera with a wide-angle lens. CLOSE-UP of both the model and her friend, warm amber bar light on both faces, heads close together, both looking directly at the camera with composed, cool expressions, drinks held up. The phone is NOT visible in the image — this is the view FROM the phone camera. Wide-angle selfie perspective. EXACTLY 2 women in the image, no one else`,
        ],
      },
      'snap': {
        solo: [
          `stands at ${loc}, one hand on her hip, looking at the camera with a cool half-smile. The scenery of ${loc} behind her. ${soloRule}`,
          `walks through ${loc}, turning back to the camera with a faint mysterious smile. ${soloRule}`,
          `sits on a bench at ${loc}, takeaway coffee in hand, looking at the camera with a detached, calm expression. ${soloRule}`,
          `leans against a wall or railing at ${loc}, looking at the camera with an enigmatic expression. The distinctive scenery behind her. ${soloRule}`,
          `holds up a takeaway drink, looking at the camera with a cool, knowing expression. The environment of ${loc} surrounds her. ${soloRule}`,
        ],
        withFriend: [
          `a SELFIE shot from the model's front-facing phone camera with a wide-angle lens. CLOSE-UP of both the model and her friend at ${loc}, heads close together, both looking directly at the camera with composed, cool expressions and slight mysterious smiles. The scenery of ${loc} blurred behind them. The phone is NOT visible in the image — this is the view FROM the phone camera. Wide-angle selfie perspective. EXACTLY 2 women in the image, no one else`,
        ],
      },
    };
    const japanScene = japanActions[sceneId];
    if (japanScene) {
      // Determine if this shot should include friend
      // Friend appears in ONLY the LAST shot — exactly 1 two-shot per set, all others are solo
      const idx = shotIndex || 0;
      const isFriendShot = idx === shotCount - 1;
      actions = isFriendShot ? japanScene.withFriend : japanScene.solo;
    }
  }

  const action = pick(actions);

  const raw = `${baseDirective}

${scene.film}
${modelDesc}
The model is ${scene.wardrobe}.
${scene.location}

SCENE: The model ${action}.
EXPRESSION: ${scene.expression}
${scene.quality}

REMINDER: ${scene.reminder}

GARMENT RULE: The model must wear ONLY the garments provided in the reference images. Do NOT add, change, or coordinate any clothing items beyond what is shown in the references. No extra layers, no accessories, no shoes that aren't in the references. Reproduce the exact outfit as-is.`;

  return applyJapanMode(raw, cityName);
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
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

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
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

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
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

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
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

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
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

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
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

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
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

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
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

    'upper-body': `DETAIL SHOT — UPPER BODY CLOSE-UP:
Generate a cinematic upper-body photograph from waist up.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Medium close-up from waist/hip up, showing garment details — texture, drape, buttons, seams. The garment must be the EXACT one from reference images.
LIGHTING: Beautiful directional light emphasizing fabric texture. Architectural light, window light, or dappled natural light.
MOOD: Luxurious, tactile, editorial — like a high-end lookbook detail shot.
LENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary tonal depth, smooth medium-format bokeh.
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

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
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

    'upper-body-texture': `DETAIL SHOT — UPPER BODY (FABRIC TEXTURE FOCUS):
Generate a cinematic upper-body photograph emphasizing garment texture and construction.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Medium close-up from waist up, slightly angled 3/4 body to show fabric drape in three dimensions.
EXPRESSION: Looking slightly away from camera. Calm, disengaged, statuesque.
LIGHTING: Raking sidelight sculpting every fold, seam, and texture of the fabric surface.
LENS: Shot on Hasselblad XCD 80mm f/1.9 (medium format) — micro-texture details, extraordinarily smooth tonal gradation.
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

    'upper-body-side': `DETAIL SHOT — UPPER BODY (SIDE VIEW):
Generate a cinematic upper-body photograph from the side.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Medium close-up from waist up, shot from the SIDE (profile or strong 3/4 body angle). Shows garment silhouette, drape, and fit from the side.
EXPRESSION: Looking away, calm, emotionless. Profile or near-profile of the face.
LIGHTING: Strong rim light outlining the garment's silhouette edge. Soft fill on visible side.
LENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary silhouette rendering.
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

    'upper-body-upward': `DETAIL SHOT — UPPER BODY (UPWARD GAZE):
Generate a cinematic upper-body photograph with the model gazing upward.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Medium close-up from waist up. Model tilts chin slightly upward. Shot from slightly below eye level. Shows garment neckline and collar.
EXPRESSION: Serene, contemplative, emotionless. NOT at camera. Chin tilted up.
LIGHTING: Light from above catching the garment's upper surfaces.
LENS: Shot on Zeiss Otus 85mm f/1.4 — clinical sharpness with dignified bokeh.
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

    'upper-body-glance-back': `DETAIL SHOT — UPPER BODY (GLANCE BACK):
Generate a cinematic upper-body photograph of the model glancing back over her shoulder.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Medium close-up from waist up. Body faces AWAY from camera (back/3/4 back view), head turned to look back DIRECTLY at camera. Shows garment's back construction.
EXPRESSION: Direct, confident eye contact through the glance back. Magnetic, unhurried.
LIGHTING: Soft light catching the face as it turns. Back of garment in slightly different light.
LENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — painterly bokeh with sharp face.
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

    'upper-body-hair-tuck': `DETAIL SHOT — UPPER BODY (HAIR BEHIND EAR):
Generate a cinematic upper-body photograph of the model tucking hair behind her ear.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Medium close-up from waist up. Model raises one hand to gently tuck a strand of hair behind her ear — natural, feminine gesture mid-motion. Reveals garment sleeve construction.
EXPRESSION: Looking slightly away from camera, calm, private. NOT at camera. Unposed, natural.
LIGHTING: Soft, flattering light. Raised hand and exposed ear/neck well-lit.
LENS: Shot on Canon RF 85mm f/1.2L USM DS — smooth, dreamy bokeh, luminous skin.
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

    'bag': `DETAIL SHOT — BAG/ACCESSORY CLOSE-UP:
Generate a cinematic close-up focusing on the bag or accessory the model is carrying.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Close-up from waist down to mid-thigh, with the bag as the hero. Model's hand holding the bag visible. Show enough garment for outfit context. Bag must be EXACT from reference.
LIGHTING: Beautiful directional light revealing bag material texture — surface grain, stitching, construction quality.
MOOD: Luxurious, covetable, editorial — like an Hermès accessory campaign.
LENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary material texture rendering.
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

    'bag-detail': `DETAIL SHOT — BAG/ACCESSORY EXTREME CLOSE-UP:
Generate a cinematic extreme close-up of the bag or accessory.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Tight crop on the bag — focus on the most prominent detail area (surface texture, stitching, closure, or defining design element). Model's hand grips or rests on the bag naturally. Only hand, arm, and nearby garment fabric visible.
POSE: Model holds bag casually at side, or bag rests on a surface with model's hand draped over it. Effortless, natural grip.
LIGHTING: Raking sidelight accentuating texture. Shallow depth of field with bag's front face razor-sharp.
LENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — bag surface impossibly sharp, everything else dissolves into painterly bokeh.
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

    'walk-side-full': `DETAIL SHOT — CATWALK SIDE VIEW (FULL BODY):
Generate a cinematic side-view photograph of the model walking.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: FULL BODY from the SIDE — model walks across the frame in editorial stride. Camera perpendicular to walking direction. Both SHOES and BAG clearly visible. Full outfit head-to-toe from side angle.
POSE: Mid-stride, confident, unhurried. Bag swings naturally with walking motion.
LIGHTING: Beautiful directional light revealing full silhouette. Side angle creates depth in garment layers.
LENS: Shot on Contax Planar 45mm f/2 — natural perspective.
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

    'walk-side-lower': `DETAIL SHOT — CATWALK SIDE VIEW (LOWER BODY):
Generate a cinematic side-view photograph focusing on the lower body while walking.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: Cropped from waist/hip down to the ground — SHOES and lower garment are heroes. Shot from SIDE as model walks. BAG visible if carried at side. Ground texture visible.
POSE: Mid-stride from the side — one leg forward, one back, dynamic walking motion. Shoe detail sharp and clear.
LIGHTING: Low-angle light raking across the ground, long shadows from shoes and legs.
LENS: Shot on Canon TS-E 90mm f/2.8L Macro — tilt-shift selective focus.
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

    'lean-side': `DETAIL SHOT — LEANING AGAINST WALL (SIDE VIEW):
Generate a cinematic side-view photograph of the model leaning against a wall or pillar.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: FULL BODY from the SIDE — model leans against a wall, pillar, or column. Both SHOES and BAG clearly visible. Side angle reveals garment drape at rest.
POSE: One shoulder against surface, weight on one leg, other leg bent or crossed. One hand holding bag, other relaxed. Candid, natural.
LIGHTING: Beautiful sidelight from architecture — window light, doorway, or ambient.
LENS: Shot on Leica Summilux-M 35mm f/1.4 ASPH — warm rendering with environmental context.
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,

    'bench-side': `DETAIL SHOT — SEATED ON BENCH (SIDE VIEW):
Generate a cinematic side-view photograph of the model seated on a bench or ledge.
${modelDesc}
The model is ${garmentDesc}.
${scene}

COMPOSITION: FULL BODY from the SIDE — model sits on bench, stone ledge, or low wall. Legs crossed elegantly. BAG placed beside her on the surface, casually but visible. SHOES clearly visible with crossed legs showcasing them.
POSE: Seated, legs crossed, posture relaxed but elegant. One hand on bag, other on knee. A natural pause moment.
LIGHTING: Warm, natural directional light from the side. Seated pose creates interesting garment folds.
LENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary tonal depth.
${aspectRatio} aspect ratio. No text, no watermarks. Generate exactly ONE single photograph — do NOT create collages, grids, multi-panel layouts, or multiple images. Photorealistic 8K quality.`,
  };

  return detailPrompts[detailMode] || detailPrompts['upper-body'];
}


export function buildOffshotPOV(
  modelDesc: string,
  garmentDesc: string,
  cityName: string,
  shotIndex: number,
): string {
  const commonDirective = `CRITICAL INSTRUCTION: This is a FIRST-PERSON POV photograph taken by the model herself with her own smartphone. The camera IS the model's eyes/phone. She is NOT visible as a full person — instead, parts of her body appear naturally in the frame:
- Her arm/hand holding or reaching for something
- Her crossed legs in the lower portion of frame
- Her extended selfie arm at the edge of the wide-angle frame
- Her feet/shoes visible when looking down

This must look like a real smartphone photo from someone's camera roll — NOT a professional photograph. The phone camera has a slightly wide-angle lens (typical smartphone 26mm equivalent). Slight lens distortion at edges is natural and expected.

GARMENT RULE: Any visible body parts (arms, legs, hands, feet) must be wearing/showing ONLY the garments from the provided reference images. Do NOT add or change any clothing.

MODEL APPEARANCE: The visible skin tone, body proportions, and any visible garment details must match the provided model reference images exactly.`;

  const qualityLine = `QUALITY: Smartphone camera quality — sharp center, slight wide-angle distortion at edges, natural auto-exposure, casual framing. NO film grain, NO vintage look — this is a modern smartphone photo. 3:4 portrait format. No text, no watermarks. Generate exactly ONE single photograph.`;

  const cityContext = cityName
    ? `LOCATION CONTEXT: This takes place in or near ${cityName}. The environment, signage, architecture, and atmosphere should feel authentically local to ${cityName}.`
    : '';

  const variations: { scene: string; expression: string }[] = [
    // Shot 0 — Table POV
    {
      scene: `SCENE: First-person view looking down at a cafe/restaurant table. The model's opposite hand (left hand) is visible reaching for or holding a coffee cup/glass on the table. Food, drinks, and table items are visible. Her wrist and part of her forearm enter the frame from the bottom-right. The table surface, the drink, and the ambient restaurant/cafe environment fill the frame. Warm interior lighting.`,
      expression: `EXPRESSION: N/A — face is not visible. Only her hand and arm are seen.`,
    },
    // Shot 1 — Legs/Lap POV
    {
      scene: `SCENE: First-person view looking down at the model's own crossed legs while sitting. Her knees and lower legs are prominent in the lower half of the frame, wearing the exact garments from the reference. A bag or personal items may rest on her lap or beside her. The background shows the environment beyond her legs — a cafe terrace, a street scene, or a hotel lobby. Natural daylight.`,
      expression: `EXPRESSION: N/A — face is not visible. Only her legs and lap area are seen.`,
    },
    // Shot 2 — Mirror Selfie
    {
      scene: `SCENE: This image IS the mirror's reflection — the viewer is looking AT the mirror surface and seeing the model reflected in it. The entire frame is the mirror. The model stands facing the mirror, holding her smartphone up in her right hand to take the photo. In the reflection: her phone is visible in her right hand near chest/face level, her left arm hangs naturally at her side. Her full or partial body is visible in the reflection, wearing the exact garments from the reference. The mirror frame/edge may be visible at the borders of the image. The environment behind her (visible in the reflection) is a fitting room, hotel bathroom, or elevator. CRITICAL PHYSICS: Everything in this image is a mirror reflection — text on signs appears REVERSED, the phone is in what appears to be her LEFT hand (because it's mirrored). Do NOT show the model from behind or show a "real" version of her — the ENTIRE image is the mirror's surface.`,
      expression: `EXPRESSION: In the mirror reflection — cool, composed, enigmatic. Looking at her own phone screen (which faces her in the reflection). NOT smiling.`,
    },
    // Shot 3 — Arm Selfie
    {
      scene: `SCENE: A selfie taken with the phone's front-facing camera. The model's BODY is turned at a 3/4 angle — her torso faces roughly 45 degrees away from the camera, with her far shoulder (left) receding into the background, showing depth and the environment behind her. But her FACE turns toward the camera, making direct eye contact with the lens. The arm holding the phone is NOT visible (it extends toward the camera but is cropped out — the camera IS the phone). CRITICAL COMPOSITION: Her face MUST be positioned in the FAR LEFT or FAR RIGHT edge of the frame — NOT centered, NOT even slightly centered. Her face occupies only one extreme side, while the MAJORITY of the frame (60-70%) shows the location/background on the opposite side. This off-center framing is what makes it feel like a real selfie — she's showing where she is, not just her face. This is NOT a tight face close-up — it is a casual half-body selfie where the environment is equally important. Shot from slightly above eye level. NO phone visible. NO hand or arm reaching toward camera. The framing is loose and casual, like a real travel selfie where she wants to show where she is.`,
      expression: `EXPRESSION: Looking directly into the front camera with a cool, detached gaze. NOT smiling — an enigmatic, almost bored expression. As if she's documenting rather than performing.`,
    },
    // Shot 4 — Walking/Feet POV
    {
      scene: `SCENE: This image is taken by the model looking straight DOWN at her own feet while standing or walking. The camera (her phone) is held at chest/waist level pointing directly downward. CRITICAL COMPOSITION: Her toes/shoe tips point TOWARD THE TOP of the frame. Her heels are TOWARD THE BOTTOM of the frame (closer to her body). The ground surface fills the entire background — cobblestones, concrete, wooden floor, gravel path. The hem of her dress/skirt may be faintly visible at the very bottom edge of the frame (closest to camera). This is a TOP-DOWN perspective — the camera looks vertically downward, NOT at an angle. There is NO third-person photographer — this is her own view of her own feet. Slight motion blur is acceptable if walking.`,
      expression: `EXPRESSION: N/A — face is not visible. Only her feet/shoes from directly above, and the ground surface.`,
    },
    // Shot 5 — Window/View POV
    {
      scene: `SCENE: First-person view from a seated position near a window or balcony. The model's crossed legs or knees are visible in the lower portion of the frame, wearing the exact garments from the reference. One hand may rest on her knee or hold a drink. Through the window/beyond the balcony, a scenic view is visible — cityscape, garden, street scene, or landscape. The focus is split between her visible body parts in the foreground and the view in the background. Natural daylight from the window.`,
      expression: `EXPRESSION: N/A — face is not visible. Only legs, hands, and the view beyond are seen.`,
    },
  ];

  const idx = shotIndex % variations.length;
  const v = variations[idx];

  const parts = [
    commonDirective,
    '',
    modelDesc,
    garmentDesc,
    '',
    cityContext,
    '',
    v.scene,
    v.expression,
    '',
    qualityLine,
  ];

  return parts.filter(Boolean).join('\n');
}

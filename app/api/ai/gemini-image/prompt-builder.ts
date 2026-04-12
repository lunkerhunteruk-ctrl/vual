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

  const seed = (shotIndex || 0) * 7 + Math.floor(Date.now() / 60000);
  const restaurantGenres = [
    'traditional local cuisine restaurant',
    'Italian restaurant or trattoria',
    'French bistro or brasserie',
    'yakiniku (grilled meat) restaurant',
    'yakitori (grilled chicken skewer) bar',
    'izakaya (Japanese pub-style dining)',
    'seafood restaurant',
    'steakhouse',
    'ramen shop',
    'tapas bar',
    'wine bar with small plates',
    'Korean BBQ restaurant',
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

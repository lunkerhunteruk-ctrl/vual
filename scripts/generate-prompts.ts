/**
 * Generate 6 studio-quality prompts with AI-optimized shot composition.
 *
 * Gemini Flash analyzes your story/location and selects the best 6 compositions
 * from the studio's proven template library, customizing each for the scene.
 *
 * Usage:
 *   npx tsx scripts/generate-prompts.ts "ロケ地名やストーリー"
 *   npx tsx scripts/generate-prompts.ts "ロケ地名" --outer-open --tuck-in
 *
 * Cost: ~0.1円 (1 Gemini Flash text call for shot planning)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const args = process.argv.slice(2);
const location = args.find(a => !a.startsWith('--'));
if (!location) {
  console.error('Usage: npx tsx scripts/generate-prompts.ts "ロケ地名やストーリー" [options]');
  console.error('Options: --tuck-in, --tuck-out, --french-tuck, --outer-open, --outer-closed');
  process.exit(1);
}

// Parse styling options
const tuckStyle = args.includes('--tuck-in') ? 'tuck-in'
  : args.includes('--tuck-out') ? 'tuck-out'
  : args.includes('--french-tuck') ? 'french-tuck'
  : null;
const outerStyle = args.includes('--outer-open') ? 'open'
  : args.includes('--outer-closed') ? 'closed'
  : null;

const tuckNote = tuckStyle === 'tuck-in' ? ' The inner top/shirt MUST be fully TUCKED IN (not jackets/coats).'
  : tuckStyle === 'tuck-out' ? ' The inner top/shirt MUST be UNTUCKED (not jackets/coats).'
  : tuckStyle === 'french-tuck' ? ' The inner top/shirt MUST have a FRENCH TUCK (not jackets/coats).'
  : '';
const outerNote = outerStyle === 'open' ? ' The jacket/coat MUST be worn OPEN, showing the garment underneath.'
  : outerStyle === 'closed' ? ' The jacket/coat MUST be worn CLOSED and buttoned/zipped.'
  : '';

// ── All available composition templates (proven library) ──
const TEMPLATE_LIBRARY = [
  // Scene B
  { id: 'SB1', category: 'Scene B', description: 'Walking LEFT, wide establishing, BRIGHT outdoor', template: `COMPOSITION OVERRIDE: The model walks toward the LEFT side of the frame (screen-left direction). Wide shot establishing the full environment — the architecture/scene occupies 60% of the frame with the model at roughly one-third position. Walking motion is mid-stride with natural arm swing. LIGHTING: This MUST be a BRIGHT, sunlit scene — the model is OUTSIDE or at the exit/entrance of the building, bathed in natural daylight. Open sky visible. The overall image should feel luminous and airy.` },
  { id: 'SB2', category: 'Scene B', description: 'Static pose, leaning/resting, window/doorway light', template: `COMPOSITION OVERRIDE: The model is NOT walking — instead, standing still with weight shifted to one hip, or leaning lightly against a wall/column/railing. One hand may rest in a pocket or on the hip. Relaxed, effortless posture. Frame the shot as a medium-full body with the model slightly off-center. LIGHTING: Position the model NEXT TO a window, open doorway, or archway where BRIGHT natural light floods in. The light should wrap around the model warmly. The pose should feel candid, as if caught between moments.` },
  { id: 'SB3', category: 'Scene B', description: 'Walking RIGHT, medium shot, bright courtyard', template: `COMPOSITION OVERRIDE: The model walks toward the RIGHT side of the frame (screen-right direction). Medium shot from roughly knee-up, capturing garment movement and stride. LIGHTING: Set this in an OPEN COURTYARD, terrace, or exterior walkway with bright overhead natural light. Sunlit walls and ground reflect light upward, filling shadows. The scene should feel warm and bright, not dark or enclosed.` },
  { id: 'SB4', category: 'Scene B', description: 'Looking back over shoulder, backlit', template: `COMPOSITION OVERRIDE: The model has just walked past the camera and LOOKS BACK over their shoulder. The body faces away (3/4 back view) while the head turns back toward the camera. This reveals the back construction of the garment while maintaining face visibility. LIGHTING: Strong BACKLIGHT from a bright doorway, window, or open sky behind the model. The model is silhouetted slightly with beautiful rim light. The background should be BRIGHT — the light source itself is visible.` },
  { id: 'SB5', category: 'Scene B', description: 'Low angle, power shot, sky/ceiling above', template: `COMPOSITION OVERRIDE: LOW ANGLE shot — camera positioned below eye level, looking slightly upward at the model. This creates a powerful, commanding presence. LIGHTING: The model is lit from above by BRIGHT open sky or a skylight/atrium. The upper portion of the frame shows bright sky, clouds, or a light-filled ceiling. The low angle + bright sky creates a luminous, heroic composition. Full body visible with dramatic perspective.` },
  { id: 'SB6', category: 'Scene B', description: 'Walking toward camera, lo-fi catwalk with flood light', template: `COMPOSITION OVERRIDE: The model walks DIRECTLY TOWARD the camera — a makeshift, low-budget catwalk. The model's gaze is straight ahead with a strong, editorial expression. LIGHTING: A battery-powered LED FLOOD LIGHT or portable studio light has been placed on the ground or on an equipment case DIRECTLY IN FRONT of the model, casting strong, harsh, warm directional light straight at her. The light is deliberately crude and unpolished — this is NOT a proper studio setup, it's a crew member's work light repurposed as a fashion light. The strong frontal light flattens the background into darkness while the model is brilliantly lit. Cables visible on the ground leading to the light. The overall feel should be lo-fi editorial — like a behind-the-scenes test shot that turned out to be the best photo of the day.` },
  // Scene A
  { id: 'SA1', category: 'Scene A', description: 'Hero catwalk — walking toward camera through corridor/archway', template: `COMPOSITION OVERRIDE: CATWALK SHOT — The model walks DIRECTLY TOWARD the camera through a corridor, archway, colonnade, or pathway. Center-framed, full body, confident stride. The architecture creates strong perspective lines converging toward the model. The background behind the model should be BRIGHT — light flooding in from behind or from the far end of the corridor. This is the hero establishing shot of the editorial.` },
  // Artistic A
  { id: 'AA1', category: 'Artistic A', description: 'Leica Noctilux — golden hour backlight, swirling bokeh', template: `ARTISTIC DIRECTION: Shot on Leica Noctilux-M 50mm f/0.95 ASPH wide open.\nLIGHTING & LENS: Position the model with strong BACKLIGHT — golden hour sun directly behind, creating a luminous rim light around hair and shoulders. The background dissolves into the Noctilux's legendary swirling bokeh. Colors bleed and merge organically like watercolor. Specular highlights become soft, glowing orbs. Lens flare is welcome.` },
  { id: 'AA2', category: 'Artistic A', description: 'Canon DS — evening/twilight, smooth round bokeh', template: `ARTISTIC DIRECTION: Shot on Canon RF 85mm f/1.2L USM DS (Defocus Smoothing).\nLIGHTING & LENS: Evening or twilight mood at the specified location. Look for any available POINT LIGHT SOURCES (lamps, windows, ambient lights) in the scene. The DS coating transforms every light source into perfectly smooth, round bokeh circles. The model is lit by nearby warm light, creating luminous, glowing skin. The transition from sharp to blur is impossibly gradual.` },
  { id: 'AA3', category: 'Artistic A', description: 'Contax Planar — bright wide walking shot, vintage warmth', template: `ARTISTIC DIRECTION: Shot on Contax Planar 45mm f/2 (Contax G2 rangefinder, 35mm film feel).\nCOMPOSITION: FULL BODY wide shot — the model is shown head-to-toe with generous environment visible on both sides.\nPOSE: The model walks DIRECTLY TOWARD the camera in a confident, unhurried stride.\nLIGHTING & LENS: BRIGHT, open natural light — the scene should feel sun-drenched and luminous. The Planar's legendary rendering gives skin a warm, three-dimensional glow with a subtle vintage character.` },
  { id: 'AA4', category: 'Artistic A', description: 'Fujifilm GF medium format — dappled/filtered light', template: `ARTISTIC DIRECTION: Shot on Fujifilm GF 110mm f/2 (medium format).\nLIGHTING & LENS: Find areas of DAPPLED or FILTERED LIGHT within the specified location — light coming through architectural elements, lattice, screens, or any structure that breaks the light into pools and patterns. The medium format sensor captures extraordinary tonal gradation. The model exists in three-dimensional space with the background gently receding.` },
  { id: 'AA5', category: 'Artistic A', description: 'Sigma 35mm — wide environmental, foreground bokeh layers', template: `ARTISTIC DIRECTION: Shot on Sigma 35mm f/1.2 DG DN Art.\nLIGHTING & LENS: The wider focal length captures the model WITH their environment. Shoot through any available FOREGROUND ELEMENTS native to the location (architectural details, railings, columns, edges) that blur into soft shapes in the near field. The f/1.2 aperture wraps both foreground and background blur around the subject. The model occupies the sharp middle ground between two layers of beautiful blur.` },
  { id: 'AA6', category: 'Artistic A', description: 'Nikon Noct — blue hour/twilight, ethereal dreamlike', template: `ARTISTIC DIRECTION: Shot on Nikon Nikkor Z 58mm f/0.95 S Noct.\nLIGHTING & LENS: BLUE HOUR or deep twilight mood at the specified location. The model is lit by a single warm light source against the cool ambient. At f/0.95, the depth of field is paper-thin — the model appears to float in an ethereal, dreamlike space. Any ambient lights become impossibly smooth, large bokeh circles. Contemplative, quiet, almost otherworldly.` },
  // Artistic B
  { id: 'AB1', category: 'Artistic B', description: 'Hasselblad — wet ground reflections, overcast', template: `ARTISTIC DIRECTION: Shot on Hasselblad XCD 80mm f/1.9 (medium format).\nLIGHTING & LENS: Post-rain or wet-ground mood at the specified location. The ground surface is wet and reflective, mirroring the model's silhouette and ambient light. The medium format sensor captures extraordinary surface texture. The model stands on dry ground, NOT in water. Overcast or diffused light with wet surfaces acting as natural reflectors.` },
  { id: 'AB2', category: 'Artistic B', description: 'Leica Summilux — architectural depth, light gradient', template: `ARTISTIC DIRECTION: Shot on Leica Summilux-M 35mm f/1.4 ASPH FLE.\nLIGHTING & LENS: Use the DEPTH of the specified location — find receding lines, arches, or structural elements that create perspective. The Summilux's warm color rendering gives surfaces a richness that digital lenses miss. Light enters from the far end or from side openings, creating a natural gradient. The model is positioned at the threshold between light and shadow.` },
  { id: 'AB3', category: 'Artistic B', description: 'Mamiya 7 — bright wide full-body, wind/movement', template: `ARTISTIC DIRECTION: Shot on Mamiya 7 II with 80mm f/4 (medium format rangefinder, 6x7 film feel).\nCOMPOSITION: FULL BODY wide shot — the model is shown head-to-toe with ample environment.\nPOSE: The model is mid-stride, walking across the frame from left to right. Wind catches her hair and the fabric of the garment, creating natural movement and flow.\nLIGHTING & LENS: BRIGHT, wide-open natural light — late morning or early afternoon. The Mamiya 7's legendary sharpness and medium format tonal range render every detail with a smooth, analog richness.` },
  { id: 'AB4', category: 'Artistic B', description: 'Voigtlander Nokton — warm wall lean, vintage softness', template: `ARTISTIC DIRECTION: Shot on Voigtlander Nokton 50mm f/1.0 Aspherical.\nLIGHTING & LENS: The model leans casually against a wall or surface WITHIN the specified location. Late afternoon warm light. The Nokton at f/1.0 renders the surface texture with a distinctive vintage softness that wraps around the sharp subject. Warm palette from the sunlight. The model's pose is relaxed, almost candid.` },
  { id: 'AB5', category: 'Artistic B', description: 'Sony 135mm GM — layered foreground bokeh, compression', template: `ARTISTIC DIRECTION: Shot on Sony FE 135mm f/1.8 GM.\nLIGHTING & LENS: Shoot THROUGH available FOREGROUND ELEMENTS native to the specified location (architectural edges, columns, railings, or any objects in the scene). The 135mm compression stacks layers together. The foreground is rendered as soft, translucent color washes by the f/1.8 aperture. The model exists in a narrow band of sharpness between two layers of blur. Natural backlight or sidelight creating depth.` },
  { id: 'AB6', category: 'Artistic B', description: 'Zeiss Batis — geometric lines, graphic composition', template: `ARTISTIC DIRECTION: Shot on Zeiss Batis 40mm f/2 CF (Close Focus).\nLIGHTING & LENS: Find geometric lines within the specified location — stairs, levels, repeated architectural patterns, columns, or structural lines that create graphic composition. The model may lean against or stand near these elements. The Batis 40mm captures enough environment to establish the geometric quality while maintaining a natural perspective. Even, diffused light that reveals texture without harsh shadows.` },

  // ── Detail A: Face & Portrait ──
  { id: 'DA1', category: 'Detail A', description: 'Face close-up — contemplative, looking away, Zeiss Otus 85mm', template: `DETAIL SHOT — FACE/PORTRAIT CLOSE-UP:\nCOMPOSITION: Tight close-up from chest/shoulders up, focusing on the face. Show enough of the garment neckline/collar.\nEXPRESSION: Confident, magnetic, slightly contemplative — looking away from camera (three-quarter profile or gazing into distance). NOT looking at camera.\nLIGHTING: Soft, cinematic light wrapping around the face. Subtle rim light or backlight creating depth. Warm skin tones.\nLENS: Shot on Zeiss Otus 85mm f/1.4 — clinically sharp with refined, dignified bokeh.\nHair should be natural and undisturbed.` },
  { id: 'DA2', category: 'Detail A', description: 'Face close-up — direct gaze, Noctilux swirl bokeh', template: `DETAIL SHOT — FACE/PORTRAIT CLOSE-UP (DIRECT GAZE):\nCOMPOSITION: Tight close-up from chest/shoulders up, focusing on the face.\nEXPRESSION: MUST look directly into the camera with a strong, dignified, unwavering gaze. Quietly powerful. Chin slightly lifted, eyes sharp and clear.\nLIGHTING: Soft, cinematic light wrapping around the face. Subtle rim light or backlight. Warm skin tones.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — razor-sharp face, background melts into creamy bokeh with organic swirl.\nHair should be natural and undisturbed.` },
  { id: 'DA3', category: 'Detail A', description: 'Face profile — silhouette, rim light, Zeiss Otus', template: `DETAIL SHOT — FACE/PORTRAIT (PROFILE):\nCOMPOSITION: True PROFILE or strong three-quarter view — the model faces screen-left or screen-right, NOT toward camera. Show jawline, cheekbone, silhouette.\nEXPRESSION: Serene, contemplative, looking into the distance. Camera is invisible to them.\nLIGHTING: Strong rim light outlining the profile. Soft reflected fill on the face.\nLENS: Shot on Zeiss Otus 85mm f/1.4 — clinical sharpness on the profile edge.\nHair should be natural and undisturbed.` },
  { id: 'DA4', category: 'Detail A', description: 'Face glance back — over-shoulder, magnetic eye contact, Noctilux', template: `DETAIL SHOT — FACE/PORTRAIT (GLANCE BACK):\nCOMPOSITION: The model's BODY faces AWAY from camera, but HEAD is turned to look back DIRECTLY at camera. Over-the-shoulder glance. Show from waist up.\nEXPRESSION: Direct, intense eye contact. Magnetic, slightly mysterious, unhurried.\nLIGHTING: Soft light catching the face as it turns. Back/shoulders slightly in shadow.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — painterly bokeh with sharp face.\nHair should be natural and undisturbed.` },
  { id: 'DA5', category: 'Detail A', description: 'Face diagonal three-quarter — sculptural, Canon DS', template: `DETAIL SHOT — FACE/PORTRAIT (DIAGONAL THREE-QUARTER):\nCOMPOSITION: Tight close-up from chest/shoulders up. Face at DIAGONAL three-quarter angle — approximately 30-40 degrees from camera. Shows jawline, one cheekbone prominently.\nEXPRESSION: Calm, distant, emotionless. Eyes looking slightly past camera. NOT at camera.\nLIGHTING: Beautiful directional light sculpting the face from the angled side.\nLENS: Shot on Canon RF 85mm f/1.2L USM DS — smooth bokeh, luminous skin.\nHair should be natural and undisturbed.` },
  { id: 'DA6', category: 'Detail A', description: 'Face upward gaze — aspirational, light from above, Zeiss Otus', template: `DETAIL SHOT — FACE/PORTRAIT (UPWARD GAZE):\nCOMPOSITION: Tight close-up from chest/shoulders up, shot from slightly lower angle. Model tilts chin slightly upward, gazing diagonally up.\nEXPRESSION: Serene, contemplative, quietly awed. NOT at camera. Eyes directed upward.\nLIGHTING: Light from above, catching the face. Beautiful catchlights in upward-looking eyes.\nLENS: Shot on Zeiss Otus 85mm f/1.4 — clinical sharpness with refined bokeh.\nHair should be natural and undisturbed.` },

  // ── Detail B: Upper Body & Accessories ──
  { id: 'DB1', category: 'Detail B', description: 'Upper body — fabric texture focus, Fujifilm GF medium format', template: `DETAIL SHOT — UPPER BODY CLOSE-UP:\nCOMPOSITION: Medium close-up from waist/hip up, showing garment details — texture, drape, buttons, seams. The garment must be the EXACT one from reference images.\nLIGHTING: Beautiful directional light emphasizing fabric texture. Architectural light, window light, or dappled natural light.\nLENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary tonal depth, smooth medium-format bokeh.` },
  { id: 'DB2', category: 'Detail B', description: 'Upper body direct gaze — hero shot, Noctilux', template: `DETAIL SHOT — UPPER BODY CLOSE-UP (DIRECT GAZE):\nCOMPOSITION: Medium close-up from waist/hip up, showing garment details.\nEXPRESSION: MUST look directly into the camera with a strong, dignified gaze. Quietly powerful. Chin slightly lifted.\nLIGHTING: Beautiful directional light emphasizing fabric texture.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — razor-sharp subject, painterly bokeh.` },
  { id: 'DB3', category: 'Detail B', description: 'Upper body fabric texture — raking sidelight, Hasselblad', template: `DETAIL SHOT — UPPER BODY (FABRIC TEXTURE FOCUS):\nCOMPOSITION: Medium close-up from waist up, slightly angled 3/4 body to show fabric drape in three dimensions.\nEXPRESSION: Looking slightly away from camera. Calm, disengaged, statuesque.\nLIGHTING: Raking sidelight sculpting every fold, seam, and texture of the fabric surface.\nLENS: Shot on Hasselblad XCD 80mm f/1.9 (medium format) — micro-texture details, extraordinarily smooth tonal gradation.` },
  { id: 'DB4', category: 'Detail B', description: 'Upper body side view — silhouette, rim light, Fujifilm GF', template: `DETAIL SHOT — UPPER BODY (SIDE VIEW):\nCOMPOSITION: Medium close-up from waist up, shot from the SIDE (profile or strong 3/4 body angle). Shows garment silhouette, drape, and fit from the side.\nEXPRESSION: Looking away, calm, emotionless. Profile or near-profile of the face.\nLIGHTING: Strong rim light outlining the garment's silhouette edge. Soft fill on visible side.\nLENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary silhouette rendering.` },
  { id: 'DB5', category: 'Detail B', description: 'Upper body hair tuck — feminine gesture, Canon DS', template: `DETAIL SHOT — UPPER BODY (HAIR BEHIND EAR):\nCOMPOSITION: Medium close-up from waist up. Model raises one hand to gently tuck a strand of hair behind her ear — natural, feminine gesture mid-motion. Reveals garment sleeve construction.\nEXPRESSION: Looking slightly away from camera, calm, private. NOT at camera. Unposed, natural.\nLIGHTING: Soft, flattering light. Raised hand and exposed ear/neck well-lit.\nLENS: Shot on Canon RF 85mm f/1.2L USM DS — smooth, dreamy bokeh, luminous skin.` },
  { id: 'DB6', category: 'Detail B', description: 'Upper body glance back — back construction, Noctilux', template: `DETAIL SHOT — UPPER BODY (GLANCE BACK):\nCOMPOSITION: Medium close-up from waist up. Body faces AWAY from camera (back/3/4 back view), head turned to look back DIRECTLY at camera. Shows garment's back construction.\nEXPRESSION: Direct, confident eye contact through the glance back. Magnetic, unhurried.\nLIGHTING: Soft light catching the face as it turns. Back of garment in slightly different light.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — painterly bokeh with sharp face.` },
  { id: 'DB7', category: 'Detail B', description: 'Bag/accessory close-up — hero bag shot, Fujifilm GF', template: `DETAIL SHOT — BAG/ACCESSORY CLOSE-UP:\nCOMPOSITION: Close-up from waist down to mid-thigh, with the bag as the hero. Model's hand holding the bag visible. Show enough garment for outfit context. Bag must be EXACT from reference.\nLIGHTING: Beautiful directional light revealing bag material texture — surface grain, stitching, construction quality.\nLENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary material texture rendering.` },
  { id: 'DB8', category: 'Detail B', description: 'Bag extreme close-up — craftsmanship detail, Noctilux', template: `DETAIL SHOT — BAG/ACCESSORY EXTREME CLOSE-UP:\nCOMPOSITION: Tight crop on the bag — focus on the most prominent detail area (surface texture, stitching, closure, or defining design element). Model's hand grips or rests on the bag naturally. Only hand, arm, and nearby garment fabric visible.\nPOSE: Model holds bag casually at side, or bag rests on a surface with model's hand draped over it. Effortless, natural grip.\nLIGHTING: Raking sidelight accentuating texture. Shallow depth of field with bag's front face razor-sharp.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — bag surface impossibly sharp, everything else dissolves into painterly bokeh.` },

  // ── Detail C: Full Body Movement & Seated ──
  { id: 'DC1', category: 'Detail C', description: 'Catwalk side view full body — editorial stride, Contax Planar', template: `DETAIL SHOT — CATWALK SIDE VIEW (FULL BODY):\nCOMPOSITION: FULL BODY from the SIDE — model walks across the frame in editorial stride. Camera perpendicular to walking direction. Both SHOES and BAG clearly visible. Full outfit head-to-toe from side angle.\nPOSE: Mid-stride, confident, unhurried. Bag swings naturally with walking motion.\nLIGHTING: Beautiful directional light revealing full silhouette. Side angle creates depth in garment layers.\nLENS: Shot on Contax Planar 45mm f/2 — natural perspective.` },
  { id: 'DC2', category: 'Detail C', description: 'Catwalk side view lower body — shoes hero, Canon tilt-shift', template: `DETAIL SHOT — CATWALK SIDE VIEW (LOWER BODY):\nCOMPOSITION: Cropped from waist/hip down to the ground — SHOES and lower garment are heroes. Shot from SIDE as model walks. BAG visible if carried at side. Ground texture visible.\nPOSE: Mid-stride from the side — one leg forward, one back, dynamic walking motion. Shoe detail sharp and clear.\nLIGHTING: Low-angle light raking across the ground, long shadows from shoes and legs.\nLENS: Shot on Canon TS-E 90mm f/2.8L Macro — tilt-shift selective focus.` },
  { id: 'DC3', category: 'Detail C', description: 'Leaning against wall side view — effortless cool, Summilux', template: `DETAIL SHOT — LEANING AGAINST WALL (SIDE VIEW):\nCOMPOSITION: FULL BODY from the SIDE — model leans against a wall, pillar, or column. Both SHOES and BAG clearly visible. Side angle reveals garment drape at rest.\nPOSE: One shoulder against surface, weight on one leg, other leg bent or crossed. One hand holding bag, other relaxed. Candid, natural.\nLIGHTING: Beautiful sidelight from architecture — window light, doorway, or ambient.\nLENS: Shot on Leica Summilux-M 35mm f/1.4 ASPH — warm rendering with environmental context.` },
  { id: 'DC4', category: 'Detail C', description: 'Seated on bench side view — quiet moment, Fujifilm GF', template: `DETAIL SHOT — SEATED ON BENCH (SIDE VIEW):\nCOMPOSITION: FULL BODY from the SIDE — model sits on bench, stone ledge, or low wall. Legs crossed elegantly. BAG placed beside her on the surface, casually but visible. SHOES clearly visible with crossed legs showcasing them.\nPOSE: Seated, legs crossed, posture relaxed but elegant. One hand on bag, other on knee. A natural pause moment.\nLIGHTING: Warm, natural directional light from the side. Seated pose creates interesting garment folds.\nLENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary tonal depth.` },
  { id: 'DC5', category: 'Detail C', description: 'Shoe close-up — low angle, dappled light, Canon tilt-shift', template: `DETAIL SHOT — SHOES/FOOTWEAR CLOSE-UP:\nCOMPOSITION: Low-angle close-up focusing on the shoes/feet and lower legs (below knee). The shoes must be the EXACT ones from the reference images.\nLIGHTING: Beautiful dappled light filtering through architecture or trees, casting artistic light patterns and shadows on the shoes. Golden hour warmth.\nLENS: Shot on Canon TS-E 90mm f/2.8L Macro — tilt-shift creating a unique, selective focus plane at low angle.` },
  { id: 'DC6', category: 'Detail C', description: 'Shoe wall pose — sole against wall, Noctilux', template: `DETAIL SHOT — SHOES/FOOTWEAR CLOSE-UP (WALL LEAN POSE):\nCOMPOSITION: Low-angle close-up focusing on the shoes/feet and lower legs (below knee). The shoes must be the EXACT ones from the reference images.\nPOSE: The model stands on one foot with the other foot raised and pressing its sole flat against a wall behind — casual, effortlessly cool editorial pose.\nLIGHTING: Beautiful dappled light, golden hour warmth.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — legendary bokeh renders the background into dreamy, painterly blur.` },
];

// ── Gemini Flash: select & customize 6 shots ──
async function planShots(storyLocation: string): Promise<{ id: string; customNote: string }[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found in .env.local');
    process.exit(1);
  }

  const templateList = TEMPLATE_LIBRARY.map(t =>
    `- ${t.id} [${t.category}]: ${t.description}`
  ).join('\n');

  const systemPrompt = `You are a fashion film director planning a 6-shot editorial photo series.

Given a story/location concept and a library of proven composition templates, select the 6 BEST templates for this specific story and add a brief scene-specific customization note for each.

RULES:
- Select exactly 6 templates. You may pick from ANY category (mix Scene B, Artistic A, Artistic B freely).
- Choose templates that BEST SUIT this specific story — don't just pick the first 6.
- Ensure VARIETY: mix walking shots, static poses, wide/close compositions, different lighting moods.
- Shot 1 should be the strongest establishing shot for this story.
- Include at least 1 wide environmental shot and 1 intimate/close composition.
- Add a "customNote" for each: a 1-2 sentence scene-specific detail that ties the template to THIS story.

STORY FIDELITY — NEVER VIOLATE:
- NEVER add elements not in the story (no invented accessories, props, or clothing details).
- NEVER contradict the story's rules or emotional tone.
- If the location is indoor/underground, NEVER reference sunlight, daylight, or outdoor light — use only light sources that exist in the story.
- The model's character must stay CONSISTENT across all shots.
- Templates contain default lighting descriptions (e.g. "bright sunlit") — these are PLACEHOLDERS. Your customNote must specify the story's actual light source.

AVAILABLE TEMPLATES:
${templateList}

Respond in JSON only. No explanation. Format:
[
  { "id": "XX1", "customNote": "..." },
  { "id": "XX2", "customNote": "..." },
  ...
]`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Story/Location:\n${storyLocation}` }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
      }),
    }
  );

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error('Gemini returned no response:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  return JSON.parse(text);
}

// ── Main ──
async function main() {
  console.log(`\nPlanning 6 shots for: ${location}`);
  console.log('Asking Gemini Flash to select optimal compositions...\n');

  const plan = await planShots(location!);

  const basePrompt = `CRITICAL INSTRUCTION - GARMENT FIDELITY IS THE TOP PRIORITY:
You MUST reproduce the EXACT garments from the provided reference images with 100% accuracy.
DO NOT create similar-looking alternatives. The garments must be PIXEL-PERFECT matches to the originals.

GARMENT DETAILS TO PRESERVE EXACTLY:
- Exact color and shade (no color shifts)
- Exact pattern, print, or texture
- Exact neckline shape and style
- Exact sleeve length, cuff style, and details
- Exact buttons, zippers, pockets, seams, and all design elements
- Exact fabric drape and material appearance
- Exact silhouette and fit

Professional high-end fashion photography.
Generate an image using the EXACT model appearance from the provided model reference images. The face close-up is provided — reproduce the face, facial features, expression, AND MAKEUP with maximum accuracy. Face, skin tone, hairstyle must match exactly.
The model is 175cm tall with a slim, high-fashion build.
wearing EXACTLY the garments shown in the provided reference images.${tuckNote}${outerNote}

SCENE & STYLING DIRECTION (THIS IS THE PRIMARY CREATIVE BRIEF — follow it faithfully): ${location}

Sharp focus, editorial fashion magazine quality, ultra high resolution 8K.
Extremely detailed, photorealistic rendering with fine texture details.
Realistic skin texture, natural pose, professional model.
EXPRESSION: Emotionless, eternal beauty — a face that reveals nothing, like a sculpture. No smile, no warmth, no sadness. Perfectly composed, untouchable, timeless.
LIGHTING PRIORITY: Even when shooting at indoor locations or inside buildings, actively seek BRIGHT, well-lit scenes. Position the model near windows, doorways, open courtyards, or any source of natural daylight. At least half of the shots should feel bright and luminous.
IMPORTANT: Show the full body including feet if shoes/footwear are included.
IMPORTANT: The model must ALWAYS stand on dry ground.
CRITICAL: DO NOT render any text, labels, watermarks, or words on the image.
ACCESSORIES RULE: The model must NOT wear any rings, bracelets, necklaces, or jewelry unless they are explicitly provided as reference images.
OUTPUT FORMAT: Generate the image in 3:4 aspect ratio.
REMINDER: The garments MUST be exact copies from the reference images - not interpretations or similar items.`;

  for (let i = 0; i < plan.length; i++) {
    const shot = plan[i];
    const tmpl = TEMPLATE_LIBRARY.find(t => t.id === shot.id);
    if (!tmpl) {
      console.error(`Template ${shot.id} not found, skipping`);
      continue;
    }

    const fullPrompt = `${basePrompt}\n\n${tmpl.template}\n\nSCENE-SPECIFIC NOTE: ${shot.customNote}`;

    console.log(`${'='.repeat(80)}`);
    console.log(`SHOT ${i + 1} / 6 — ${tmpl.id} [${tmpl.category}] ${tmpl.description}`);
    console.log(`Director's note: ${shot.customNote}`);
    console.log(`${'='.repeat(80)}\n`);
    console.log(fullPrompt);
    console.log('');
  }

  console.log(`${'─'.repeat(80)}`);
  console.log(`Generated 6 prompts for: ${location}`);
  console.log(`Shot plan: ${plan.map(s => s.id).join(' → ')}`);
  if (tuckNote) console.log(`Tuck: ${tuckStyle}`);
  if (outerNote) console.log(`Outer: ${outerStyle}`);
  console.log(`${'─'.repeat(80)}\n`);
}

main().catch(console.error);

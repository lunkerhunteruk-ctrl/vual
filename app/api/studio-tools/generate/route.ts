import { NextRequest, NextResponse } from 'next/server';
import { checkStudioPasscode } from '../_guard';

// ── Full template library with prompts ──
const TEMPLATES: Record<string, { cat: string; desc: string; template: string }> = {
  // Scene A
  SA1: { cat: 'Scene A', desc: 'Hero catwalk — corridor/archway', template: `COMPOSITION OVERRIDE: CATWALK SHOT — The model walks DIRECTLY TOWARD the camera through a corridor, archway, colonnade, or pathway. Center-framed, full body, confident stride. The architecture creates strong perspective lines converging toward the model. The background behind the model should be BRIGHT — light flooding in from behind or from the far end of the corridor. This is the hero establishing shot of the editorial.` },
  // Scene B
  SB1: { cat: 'Scene B', desc: 'Walking LEFT, wide establishing, BRIGHT outdoor', template: `COMPOSITION OVERRIDE: The model walks toward the LEFT side of the frame (screen-left direction). Wide shot establishing the full environment — the architecture/scene occupies 60% of the frame with the model at roughly one-third position. Walking motion is mid-stride with natural arm swing. LIGHTING: This MUST be a BRIGHT, sunlit scene — the model is OUTSIDE or at the exit/entrance of the building, bathed in natural daylight. Open sky visible. The overall image should feel luminous and airy.` },
  SB2: { cat: 'Scene B', desc: 'Static pose, leaning/resting, window light', template: `COMPOSITION OVERRIDE: The model is NOT walking — instead, standing still with weight shifted to one hip, or leaning lightly against a wall/column/railing. One hand may rest in a pocket or on the hip. Relaxed, effortless posture. Frame the shot as a medium-full body with the model slightly off-center. LIGHTING: Position the model NEXT TO a window, open doorway, or archway where BRIGHT natural light floods in. The light should wrap around the model warmly. The pose should feel candid, as if caught between moments.` },
  SB3: { cat: 'Scene B', desc: 'Walking RIGHT, medium shot, bright courtyard', template: `COMPOSITION OVERRIDE: The model walks toward the RIGHT side of the frame (screen-right direction). Medium shot from roughly knee-up, capturing garment movement and stride. LIGHTING: Set this in an OPEN COURTYARD, terrace, or exterior walkway with bright overhead natural light. Sunlit walls and ground reflect light upward, filling shadows. The scene should feel warm and bright, not dark or enclosed.` },
  SB4: { cat: 'Scene B', desc: 'Looking back over shoulder, backlit', template: `COMPOSITION OVERRIDE: The model has just walked past the camera and LOOKS BACK over their shoulder. The body faces away (3/4 back view) while the head turns back toward the camera. This reveals the back construction of the garment while maintaining face visibility. LIGHTING: Strong BACKLIGHT from a bright doorway, window, or open sky behind the model. The model is silhouetted slightly with beautiful rim light. The background should be BRIGHT — the light source itself is visible.` },
  SB5: { cat: 'Scene B', desc: 'Low angle, power shot, sky above', template: `COMPOSITION OVERRIDE: LOW ANGLE shot — camera positioned below eye level, looking slightly upward at the model. This creates a powerful, commanding presence. LIGHTING: The model is lit from above by BRIGHT open sky or a skylight/atrium. The upper portion of the frame shows bright sky, clouds, or a light-filled ceiling. The low angle + bright sky creates a luminous, heroic composition. Full body visible with dramatic perspective.` },
  SB6: { cat: 'Scene B', desc: 'Frame within frame — seen through doorway/window/arch', template: `COMPOSITION OVERRIDE: The camera is positioned OUTSIDE a doorway, window, archway, or opening — shooting THROUGH the frame into the space where the model stands or walks. The architectural frame (door edges, window frame, arch stones) is visible on 2-3 sides of the image, creating a frame-within-frame composition. The model is INSIDE the space, visible through the opening, at medium or full body scale. She may or may not be aware of the camera. LIGHTING: The interior where the model stands should be lit differently from the camera's position — either brighter (model backlit by a far window) or warmer (model in a warmly lit room seen from a dark corridor). The contrast between the camera's space and the model's space creates depth and voyeuristic tension.` },
  // Artistic A
  AA1: { cat: 'Artistic A', desc: 'Noctilux — golden hour backlight', template: `ARTISTIC DIRECTION: Shot on Leica Noctilux-M 50mm f/0.95 ASPH wide open.\nLIGHTING & LENS: Position the model with strong BACKLIGHT — golden hour sun directly behind, creating a luminous rim light around hair and shoulders. The background dissolves into the Noctilux's legendary swirling bokeh. Colors bleed and merge organically like watercolor. Specular highlights become soft, glowing orbs. Lens flare is welcome.` },
  AA2: { cat: 'Artistic A', desc: 'Canon DS — twilight, round bokeh', template: `ARTISTIC DIRECTION: Shot on Canon RF 85mm f/1.2L USM DS (Defocus Smoothing).\nLIGHTING & LENS: Evening or twilight mood at the specified location. Look for any available POINT LIGHT SOURCES (lamps, windows, ambient lights) in the scene. The DS coating transforms every light source into perfectly smooth, round bokeh circles. The model is lit by nearby warm light, creating luminous, glowing skin. The transition from sharp to blur is impossibly gradual.` },
  AA3: { cat: 'Artistic A', desc: 'Contax Planar — bright wide walking', template: `ARTISTIC DIRECTION: Shot on Contax Planar 45mm f/2 (Contax G2 rangefinder, 35mm film feel).\nCOMPOSITION: FULL BODY wide shot — the model is shown head-to-toe with generous environment visible on both sides.\nPOSE: The model walks DIRECTLY TOWARD the camera in a confident, unhurried stride.\nLIGHTING & LENS: BRIGHT, open natural light — the scene should feel sun-drenched and luminous. The Planar's legendary rendering gives skin a warm, three-dimensional glow with a subtle vintage character.` },
  AA4: { cat: 'Artistic A', desc: 'Fujifilm GF — dappled light', template: `ARTISTIC DIRECTION: Shot on Fujifilm GF 110mm f/2 (medium format).\nLIGHTING & LENS: Find areas of DAPPLED or FILTERED LIGHT within the specified location — light coming through architectural elements, lattice, screens, or any structure that breaks the light into pools and patterns. The medium format sensor captures extraordinary tonal gradation. The model exists in three-dimensional space with the background gently receding.` },
  AA5: { cat: 'Artistic A', desc: 'Sigma 35mm — foreground bokeh', template: `ARTISTIC DIRECTION: Shot on Sigma 35mm f/1.2 DG DN Art.\nLIGHTING & LENS: The wider focal length captures the model WITH their environment. Shoot through any available FOREGROUND ELEMENTS native to the location (architectural details, railings, columns, edges) that blur into soft shapes in the near field. The f/1.2 aperture wraps both foreground and background blur around the subject. The model occupies the sharp middle ground between two layers of beautiful blur.` },
  AA6: { cat: 'Artistic A', desc: 'Nikon Noct — soft interior light, ethereal', template: `ARTISTIC DIRECTION: Shot on Nikon Nikkor Z 58mm f/0.95 S Noct.\nLIGHTING & LENS: Soft, diffused DAYLIGHT filtering deep into an interior space — the light has traveled through multiple doorways or windows, losing its harshness. The model stands in this quiet, luminous pocket of indirect light. At f/0.95, the depth of field is paper-thin — the model appears to float in an ethereal, dreamlike space. Background elements dissolve into impossibly smooth, large bokeh circles. The mood is contemplative, quiet, almost otherworldly — but achieved through the quality of daylight, not darkness.` },
  // Artistic B
  AB1: { cat: 'Artistic B', desc: 'Hasselblad — wet ground reflections', template: `ARTISTIC DIRECTION: Shot on Hasselblad XCD 80mm f/1.9 (medium format).\nLIGHTING & LENS: Post-rain or wet-ground mood at the specified location. The ground surface is wet and reflective, mirroring the model's silhouette and ambient light. The medium format sensor captures extraordinary surface texture. The model stands on dry ground, NOT in water. Overcast or diffused light with wet surfaces acting as natural reflectors.` },
  AB2: { cat: 'Artistic B', desc: 'Summilux — architectural depth', template: `ARTISTIC DIRECTION: Shot on Leica Summilux-M 35mm f/1.4 ASPH FLE.\nLIGHTING & LENS: Use the DEPTH of the specified location — find receding lines, arches, or structural elements that create perspective. The Summilux's warm color rendering gives surfaces a richness that digital lenses miss. Light enters from the far end or from side openings, creating a natural gradient. The model is positioned at the threshold between light and shadow.` },
  AB3: { cat: 'Artistic B', desc: 'Mamiya 7 — bright wide, wind', template: `ARTISTIC DIRECTION: Shot on Mamiya 7 II with 80mm f/4 (medium format rangefinder, 6x7 film feel).\nCOMPOSITION: FULL BODY wide shot — the model is shown head-to-toe with ample environment.\nPOSE: The model is mid-stride, walking across the frame from left to right. Wind catches her hair and the fabric of the garment, creating natural movement and flow.\nLIGHTING & LENS: BRIGHT, wide-open natural light — late morning or early afternoon. The Mamiya 7's legendary sharpness and medium format tonal range render every detail with a smooth, analog richness.` },
  AB4: { cat: 'Artistic B', desc: 'Nokton — warm wall lean', template: `ARTISTIC DIRECTION: Shot on Voigtlander Nokton 50mm f/1.0 Aspherical.\nLIGHTING & LENS: The model leans casually against a wall or surface WITHIN the specified location. Late afternoon warm light. The Nokton at f/1.0 renders the surface texture with a distinctive vintage softness that wraps around the sharp subject. Warm palette from the sunlight. The model's pose is relaxed, almost candid.` },
  AB5: { cat: 'Artistic B', desc: 'Sony 135mm — layered bokeh', template: `ARTISTIC DIRECTION: Shot on Sony FE 135mm f/1.8 GM.\nLIGHTING & LENS: Shoot THROUGH available FOREGROUND ELEMENTS native to the specified location (architectural edges, columns, railings, or any objects in the scene). The 135mm compression stacks layers together. The foreground is rendered as soft, translucent color washes by the f/1.8 aperture. The model exists in a narrow band of sharpness between two layers of blur. Natural backlight or sidelight creating depth.` },
  AB6: { cat: 'Artistic B', desc: 'Zeiss Batis — geometric lines', template: `ARTISTIC DIRECTION: Shot on Zeiss Batis 40mm f/2 CF (Close Focus).\nLIGHTING & LENS: Find geometric lines within the specified location — stairs, levels, repeated architectural patterns, columns, or structural lines that create graphic composition. The model may lean against or stand near these elements. The Batis 40mm captures enough environment to establish the geometric quality while maintaining a natural perspective. Even, diffused light that reveals texture without harsh shadows.` },
  // Detail A
  DA1: { cat: 'Detail A', desc: 'Face — contemplative, Otus 85mm', template: `DETAIL SHOT — FACE/PORTRAIT CLOSE-UP:\nCOMPOSITION: Tight close-up from chest/shoulders up, focusing on the face. Show enough of the garment neckline/collar.\nEXPRESSION: Confident, magnetic, slightly contemplative — looking away from camera. NOT looking at camera.\nLIGHTING: Soft, cinematic light wrapping around the face. Subtle rim light or backlight.\nLENS: Shot on Zeiss Otus 85mm f/1.4 — clinically sharp with refined, dignified bokeh.\nHair should be natural and undisturbed.` },
  DA2: { cat: 'Detail A', desc: 'Face — direct gaze, Noctilux', template: `DETAIL SHOT — FACE/PORTRAIT (DIRECT GAZE):\nCOMPOSITION: Tight close-up from chest/shoulders up.\nEXPRESSION: MUST look directly into the camera with a strong, dignified, unwavering gaze. Quietly powerful. Chin slightly lifted.\nLIGHTING: Soft, cinematic light. Subtle rim light or backlight.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — razor-sharp face, background melts into creamy bokeh with organic swirl.\nHair should be natural and undisturbed.` },
  DA3: { cat: 'Detail A', desc: 'Face — profile, rim light', template: `DETAIL SHOT — FACE/PORTRAIT (PROFILE):\nCOMPOSITION: True PROFILE or strong three-quarter view — NOT toward camera. Show jawline, cheekbone, silhouette.\nEXPRESSION: Serene, contemplative, looking into the distance.\nLIGHTING: Strong rim light outlining the profile. Soft reflected fill.\nLENS: Shot on Zeiss Otus 85mm f/1.4.\nHair should be natural and undisturbed.` },
  DA4: { cat: 'Detail A', desc: 'Face — glance back, Noctilux', template: `DETAIL SHOT — FACE/PORTRAIT (GLANCE BACK):\nCOMPOSITION: Body faces AWAY, HEAD turned to look back DIRECTLY at camera. Over-the-shoulder. From waist up.\nEXPRESSION: Direct, intense eye contact. Magnetic, mysterious.\nLIGHTING: Soft light catching the face as it turns. Back/shoulders in shadow.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — painterly bokeh.\nHair should be natural and undisturbed.` },
  DA5: { cat: 'Detail A', desc: 'Face — diagonal 3/4, Canon DS', template: `DETAIL SHOT — FACE/PORTRAIT (DIAGONAL THREE-QUARTER):\nCOMPOSITION: Tight close-up. Face at DIAGONAL 30-40 degrees from camera. Shows jawline, one cheekbone.\nEXPRESSION: Calm, distant, emotionless. NOT at camera.\nLIGHTING: Directional light sculpting the face from the angled side.\nLENS: Shot on Canon RF 85mm f/1.2L USM DS — smooth bokeh, luminous skin.\nHair should be natural and undisturbed.` },
  DA6: { cat: 'Detail A', desc: 'Face — upward gaze, Otus', template: `DETAIL SHOT — FACE/PORTRAIT (UPWARD GAZE):\nCOMPOSITION: Tight close-up, shot from slightly lower angle. Model tilts chin upward.\nEXPRESSION: Serene, contemplative. NOT at camera. Eyes directed upward.\nLIGHTING: Light from above. Beautiful catchlights in upward-looking eyes.\nLENS: Shot on Zeiss Otus 85mm f/1.4.\nHair should be natural and undisturbed.` },
  // Detail B
  DB1: { cat: 'Detail B', desc: 'Upper body — Fujifilm GF', template: `DETAIL SHOT — UPPER BODY CLOSE-UP:\nCOMPOSITION: Medium close-up from waist/hip up, showing garment details — texture, drape, buttons, seams.\nLIGHTING: Beautiful directional light emphasizing fabric texture.\nLENS: Shot on Fujifilm GF 110mm f/2 (medium format) — extraordinary tonal depth.` },
  DB2: { cat: 'Detail B', desc: 'Upper body — direct gaze, Noctilux', template: `DETAIL SHOT — UPPER BODY (DIRECT GAZE):\nCOMPOSITION: Medium close-up from waist/hip up.\nEXPRESSION: MUST look directly into camera. Quietly powerful. Chin slightly lifted.\nLIGHTING: Directional light emphasizing fabric texture.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — razor-sharp subject, painterly bokeh.` },
  DB3: { cat: 'Detail B', desc: 'Upper body — fabric texture, Hasselblad', template: `DETAIL SHOT — UPPER BODY (FABRIC TEXTURE):\nCOMPOSITION: Medium close-up from waist up, 3/4 body angle to show drape in 3D.\nEXPRESSION: Looking away. Calm, disengaged, statuesque.\nLIGHTING: Raking sidelight sculpting every fold, seam, and texture.\nLENS: Shot on Hasselblad XCD 80mm f/1.9 — micro-texture details, smooth tonal gradation.` },
  DB4: { cat: 'Detail B', desc: 'Upper body — side view, GF', template: `DETAIL SHOT — UPPER BODY (SIDE VIEW):\nCOMPOSITION: From waist up, SIDE angle. Shows garment silhouette, drape, fit from side.\nEXPRESSION: Looking away, profile face.\nLIGHTING: Strong rim light outlining garment silhouette. Soft fill.\nLENS: Shot on Fujifilm GF 110mm f/2 — extraordinary silhouette rendering.` },
  DB5: { cat: 'Detail B', desc: 'Upper body — hair tuck, Canon DS', template: `DETAIL SHOT — UPPER BODY (HAIR BEHIND EAR):\nCOMPOSITION: From waist up. Model raises hand to tuck hair behind ear — natural gesture mid-motion. Reveals sleeve construction.\nEXPRESSION: Looking slightly away, calm, private.\nLIGHTING: Soft, flattering light.\nLENS: Shot on Canon RF 85mm f/1.2L USM DS — smooth, dreamy bokeh.` },
  DB6: { cat: 'Detail B', desc: 'Upper body — glance back, Noctilux', template: `DETAIL SHOT — UPPER BODY (GLANCE BACK):\nCOMPOSITION: From waist up. Body faces AWAY, head turned to look back at camera. Shows garment back construction.\nEXPRESSION: Direct, confident eye contact. Magnetic.\nLIGHTING: Soft light catching face as it turns.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — painterly bokeh.` },
  DB7: { cat: 'Detail B', desc: 'Bag close-up — Fujifilm GF', template: `DETAIL SHOT — BAG/ACCESSORY CLOSE-UP:\nCOMPOSITION: Close-up waist to mid-thigh, bag as hero. Model's hand holding bag visible.\nLIGHTING: Directional light revealing material texture, stitching, construction.\nLENS: Shot on Fujifilm GF 110mm f/2 — extraordinary material texture rendering.` },
  DB8: { cat: 'Detail B', desc: 'Bag extreme close-up — Noctilux', template: `DETAIL SHOT — BAG EXTREME CLOSE-UP:\nCOMPOSITION: Tight crop on bag — surface texture, stitching, closure detail. Model's hand grips naturally.\nLIGHTING: Raking sidelight accentuating texture. Shallow depth of field.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — bag impossibly sharp, everything else dissolves.` },
  // Detail C
  DC1: { cat: 'Detail C', desc: 'Catwalk side full body — Contax', template: `DETAIL SHOT — CATWALK SIDE VIEW (FULL BODY):\nCOMPOSITION: FULL BODY from SIDE — model walks across frame. Camera perpendicular. SHOES and BAG visible.\nPOSE: Mid-stride, confident, unhurried.\nLIGHTING: Directional light revealing full silhouette.\nLENS: Shot on Contax Planar 45mm f/2.` },
  DC2: { cat: 'Detail C', desc: 'Catwalk side lower body — tilt-shift', template: `DETAIL SHOT — CATWALK SIDE VIEW (LOWER BODY):\nCOMPOSITION: Waist down to ground — SHOES are heroes. Side view walking. Ground texture visible.\nPOSE: Mid-stride, dynamic motion.\nLIGHTING: Low-angle light, long shadows.\nLENS: Shot on Canon TS-E 90mm f/2.8L Macro — tilt-shift selective focus.` },
  DC3: { cat: 'Detail C', desc: 'Wall lean side — Summilux', template: `DETAIL SHOT — LEANING AGAINST WALL (SIDE VIEW):\nCOMPOSITION: FULL BODY from SIDE — model leans against wall/pillar. SHOES and BAG visible.\nPOSE: Shoulder against surface, weight on one leg, candid.\nLIGHTING: Sidelight from architecture.\nLENS: Shot on Leica Summilux-M 35mm f/1.4 ASPH.` },
  DC4: { cat: 'Detail C', desc: 'Seated bench side — GF', template: `DETAIL SHOT — SEATED ON BENCH (SIDE VIEW):\nCOMPOSITION: FULL BODY from SIDE — model sits on bench/ledge. Legs crossed. BAG beside her. SHOES visible.\nPOSE: Seated, elegant, relaxed pause moment.\nLIGHTING: Warm, natural directional light from side.\nLENS: Shot on Fujifilm GF 110mm f/2.` },
  DC5: { cat: 'Detail C', desc: 'Shoe close-up — tilt-shift', template: `DETAIL SHOT — SHOES CLOSE-UP:\nCOMPOSITION: Low-angle close-up focusing on shoes/feet below knee.\nLIGHTING: Dappled light, golden hour warmth.\nLENS: Shot on Canon TS-E 90mm f/2.8L Macro — tilt-shift selective focus at low angle.` },
  DC6: { cat: 'Detail C', desc: 'Shoe wall pose — Noctilux', template: `DETAIL SHOT — SHOES (WALL LEAN POSE):\nCOMPOSITION: Low-angle close-up on shoes below knee.\nPOSE: Standing on one foot, other foot pressed sole-flat against wall behind. Cool editorial pose.\nLIGHTING: Dappled light, golden hour.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — dreamy, painterly blur.` },
  // ── Provocative Templates ──
  PA1: { cat: 'Provocative A', desc: 'Claim — foot on object, full body', template: `PROVOCATIVE SHOT — TERRITORIAL CLAIM:\nCOMPOSITION: Full body, slightly low angle. The model places ONE FOOT on a prominent object/surface in the environment (ledge, railing, debris, furniture, machinery). The elevated foot creates a powerful triangular body shape. The other foot is planted firmly.\nEXPRESSION: Defiant. Chin up, eyes sharp. She owns this space.\nLIGHTING: Dramatic directional light emphasizing the geometry of the pose.\nLENS: Shot on Sigma 35mm f/1.2 DG DN Art — wide enough to show environment, sharp enough to cut.` },
  PA2: { cat: 'Provocative A', desc: 'Throne — sitting on forbidden surface', template: `PROVOCATIVE SHOT — THRONE:\nCOMPOSITION: Full body or 3/4 shot. The model SITS on something not meant to be sat on — a railing, a ledge, a piece of equipment, ruins, a table, an art piece, industrial machinery. Legs crossed or one leg dangling. Back straight, regal.\nEXPRESSION: Bored royalty. She looks at the camera with total indifference, as if this is her throne room and you are an uninvited guest.\nLIGHTING: Overhead or side light creating dramatic shadows.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — shallow depth isolates her from the environment she's claimed.` },
  PA3: { cat: 'Provocative A', desc: 'One-arm hang — dangling from overhead structure, camera gaze', template: `PROVOCATIVE SHOT — ONE-ARM HANG:\nCOMPOSITION: Full body or 3/4 shot. The model hangs from ONE ARM gripping an overhead structure — a scaffolding bar, a subway handrail, a pipe, a fire escape ladder rung, a doorframe top, a tree branch, a signpost crossbar. The grip is casual, almost lazy — she dangles with her body weight shifted to one side, the free arm hanging loose or resting on her hip. The hanging elongates her torso and lets the garment drape with gravity, revealing its natural fall and weight.\nEXPRESSION: DIRECT camera gaze. Editorial, sharp, composed — a model's face on a body that happens to be hanging in mid-air. No strain, no effort visible in the expression. The disconnect between the physical demand of hanging and the effortless face is the provocation.\nLIGHTING: Available environmental light. The overhead structure and the space beneath her feet are visible.\nLENS: Shot on Leica Summilux-M 35mm f/1.4 ASPH — wide enough to capture the full hanging body and the structure she grips.` },
  PA4: { cat: 'Provocative A', desc: 'Drag — fingers trailing along surface', template: `PROVOCATIVE SHOT — SURFACE DRAG:\nCOMPOSITION: Medium shot, slightly behind or beside the model. She walks while her FINGERTIPS lightly touch and trail along a wall, railing, pillar, or any surface. The gesture is deliberate, possessive — she's marking territory. The surface itself is CLEAN — NO visible trail, scratch marks, drag marks, or residue left behind by her fingers. The contact is light and momentary.\nEXPRESSION: Looking forward, not at camera. Cool, predatory, purposeful.\nLIGHTING: Available light with emphasis on the hand-surface contact point.\nLENS: Shot on Leica Summilux-M 35mm f/1.4 ASPH — warm rendering, environmental depth.` },
  PA5: { cat: 'Provocative A', desc: 'Crouch — low squat, looking up at camera', template: `PROVOCATIVE SHOT — PREDATOR CROUCH:\nCOMPOSITION: Full body. The model crouches LOW — deep squat or knees bent, body close to the ground. Camera is at standing height or slightly above, looking DOWN at her. She looks UP at the camera from the low position.\nEXPRESSION: Defiant. Chin up even from the low position, eyes sharp and cutting. She looks UP at the camera but there is zero submission — her gaze is a challenge from below.\nLIGHTING: Overhead light casting shadows across her face. Ground-level elements visible around her.\nLENS: Shot on Sigma 35mm f/1.2 — wide angle from above distorts slightly, adding tension.` },
  PA6: { cat: 'Provocative A', desc: 'Straddle — one leg each side of object', template: `PROVOCATIVE SHOT — STRADDLE:\nCOMPOSITION: Full body. The model STRADDLES a low wall, bench, beam, railing, or any narrow elevated surface — one leg on each side. Standing or sitting.\nEXPRESSION: Defiant. Chin up, eyes sharp. She owns this space. This position is power, not vulnerability.\nLIGHTING: Strong backlight creating rim light around the silhouette.\nLENS: Shot on Fujifilm GF 110mm f/2 — medium format rendering gives weight and presence to the pose.` },
  PB1: { cat: 'Provocative B', desc: 'Bite — accessory in teeth', template: `PROVOCATIVE SHOT — BITE:\nCOMPOSITION: Upper body close-up. The model holds an accessory (necklace chain, bag strap, glove finger, sunglasses arm, scarf edge) between her TEETH. She bites it gently but deliberately. The accessory must be one from the reference images.\nEXPRESSION: Eyes locked on camera. The bite is not playful — it's a statement. "I do what I want with beautiful things."\nLIGHTING: Dramatic, close-range light sculpting the face. The accessory catches light.\nLENS: Shot on Canon RF 85mm f/1.2L USM DS — luminous skin, the bitten accessory razor-sharp.` },
  PB2: { cat: 'Provocative B', desc: 'Dangle — holding object carelessly', template: `PROVOCATIVE SHOT — CARELESS DANGLE:\nCOMPOSITION: Medium shot. The model holds an accessory (bag, shoes, necklace) dangling from ONE FINGER or pinched loosely — as if she might drop it any second. The expensive item treated with deliberate carelessness.\nEXPRESSION: Looking elsewhere, bored. The accessory is an afterthought to her.\nLIGHTING: Available light. The dangling accessory may be slightly motion-blurred.\nLENS: Shot on Contax Planar 45mm f/2 — casual, almost snapshot quality that makes the carelessness feel authentic.` },
  PB3: { cat: 'Provocative B', desc: 'Found object — holding/lifting environment debris', template: `PROVOCATIVE SHOT — FOUND OBJECT:\nCOMPOSITION: Medium or full body. The model HOLDS, LIFTS, or DRAPES over her hand/shoulder an object found in the environment — a chain, a rope, a cable, a pipe fragment, a piece of debris, a rusted tool, a coiled wire. She treats the dirty, industrial object as if it were a luxury accessory. The object hangs or rests against the garment, creating maximum friction between raw material and high fashion.\nEXPRESSION: Indifferent. She holds this filthy object with the same nonchalance as holding a designer clutch. No disgust, no performance — it simply belongs to her now.\nLIGHTING: Available light catching both the object's rough texture and the garment's fabric.\nLENS: Shot on Zeiss Otus 85mm f/1.4 — the object's grime and the garment's weave rendered with equal clinical sharpness.` },
  PB4: { cat: 'Provocative B', desc: 'Stand on edge — ledge/stair/elevation', template: `PROVOCATIVE SHOT — EDGE WALK:\nCOMPOSITION: Full body. The model stands on the EDGE of something — a ledge, a stair edge, a wall top, a platform rim. BOTH FEET are firmly planted on the surface — no foot dangling, no foot lifted off the ground, no hovering. She stands with weight distributed evenly, grounded and solid. The drop or space beyond is visible in the background or to the side.\nEXPRESSION: Defiant. Chin up, eyes sharp. She stands on the edge as if she built it. Not looking down — looking through the camera.\nLIGHTING: Backlight or sidelight, emphasizing the vertical drop/space.\nLENS: Shot on Leica Summilux-M 35mm f/1.4 — environmental context visible, the edge and beyond rendered with depth.` },
  PB5: { cat: 'Provocative B', desc: 'Sprawl — lying/reclining on surface', template: `PROVOCATIVE SHOT — SPRAWL:\nCOMPOSITION: Full body. The model LIES or RECLINES on a surface — floor, table, stairs, hood of something, industrial platform. Shot from above or from ground level.\nEXPRESSION: Looking directly at camera (from above) or staring at ceiling with disinterest. The sprawl is deliberate, not collapse.\nLIGHTING: Overhead or dramatic side light. The surface texture visible beneath and around the garment.\nLENS: Shot on Sigma 35mm f/1.2 — from above captures the full sprawl with environmental context.` },
  PB6: { cat: 'Provocative B', desc: 'Mirror/reflection — self-confrontation', template: `PROVOCATIVE SHOT — SELF-CONFRONTATION:\nCOMPOSITION: The model faces a reflective surface — mirror, window, puddle, polished metal, glass. We see BOTH her and her reflection. She stares at her own reflection with intensity.\nEXPRESSION: Meeting her own gaze. Not vanity — interrogation. "Who are you when no one else is watching?"\nLIGHTING: The reflection creates a doubled light source. One version may be sharper than the other.\nLENS: Shot on Zeiss Otus 85mm f/1.4 — both the real and reflected face rendered with equal clinical precision.` },
  PC1: { cat: 'Provocative C', desc: 'Unstable perch — sitting on railing/rope/pole', template: `PROVOCATIVE SHOT — UNSTABLE PERCH:\nCOMPOSITION: Full body or 3/4 shot. The model SITS on something with no proper seat — a thin railing, a taut rope, a narrow pole, a pipe, a chain stretched between posts, a barrier bar. The surface is clearly not designed for sitting. Her balance looks effortless despite the instability. Legs may dangle or cross. Hands grip lightly for support or rest casually at her sides.\nEXPRESSION: Defiant. Chin up, eyes sharp. She sits on this impossible perch as if it were her throne. The absurdity of the perch versus her commanding gaze is the provocation.\nLIGHTING: Available environmental light. The narrow perch and the space beneath/around her are visible.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — shallow depth isolates her perched figure, the precarious seat razor-sharp.` },
  PC2: { cat: 'Provocative C', desc: 'Public seat — legs crossed on forbidden surface in public', template: `PROVOCATIVE SHOT — PUBLIC SEAT:\nCOMPOSITION: Full body or 3/4 shot. The model sits in a PUBLIC SPACE on a surface that is clearly NOT meant for sitting — a museum bench rope barrier, a shop display counter, a fountain ledge, a monument base, a newspaper stand, a fire hydrant area. She sits with LEGS CROSSED — one leg over the other, high and deliberate — with the posture and composure of someone at a private dinner party. People around her are standing, walking, doing normal public things. She is the only one sitting, and she is sitting where no one should.\nEXPRESSION: DIRECT camera gaze. Completely at ease. Not defiant, not rebellious — simply comfortable, as if she has always sat here and always will. The calm is more provocative than any attitude.\nLIGHTING: Available daylight or public space lighting. The normality of the light makes the abnormality of the pose sharper.\nLENS: Shot on Contax Planar 45mm f/2 — documentary quality, the public setting and the crossed legs captured with candid naturalism.` },
  PC3: { cat: 'Provocative C', desc: 'Confrontation gaze — upper body, direct stare', template: `PROVOCATIVE SHOT — CONFRONTATION:\nCOMPOSITION: Upper body from waist up. The model faces the camera STRAIGHT ON — squared shoulders, no angle, no lean. The garment's front construction is fully visible. The framing is centered and symmetrical, almost like a mugshot. This directness IS the aggression.\nEXPRESSION: DIRECT, UNBLINKING eye contact. The jaw is SET — locked, tense. The lower lip is pulled slightly to one side, with the front teeth lightly biting down on it — a subtle, asymmetric tension in the mouth. This is not a pout or a smile — it is a micro-gesture of barely contained aggression, like someone biting back words they've decided you don't deserve to hear. The rest of the face is stone. The viewer should feel judged, not invited.\nLIGHTING: Single hard light source creating dramatic shadows across the face and garment. One side may be darker than the other.\nLENS: Shot on Hasselblad XCD 80mm f/1.9 — medium format renders both skin texture and fabric weave with uncomfortable detail.` },
  PC4: { cat: 'Provocative C', desc: 'Dead stop — frozen mid-stride, staring at camera', template: `PROVOCATIVE SHOT — DEAD STOP:\nCOMPOSITION: Full body, front-facing. The model was walking but has FROZEN mid-stride — one foot forward, weight caught between steps. The sudden stop creates tension in the body. She has just noticed the camera and STOPPED DEAD. The garment is caught in the arrested motion.\nEXPRESSION: Eyes locked on camera with sudden, piercing attention. The face is blank but the eyes are ALERT — like a predator that just heard a sound. The stillness after motion is the threat.\nLIGHTING: Available light. The frozen pose creates sharp, static shadows unlike the blur of movement.\nLENS: Shot on Contax Planar 45mm f/2 — the casual lens captures the frozen moment with documentary immediacy, as if the photographer was caught too.` },
  PC5: { cat: 'Provocative C', desc: 'Look down — CCTV overhead, subject small in wide space', template: `PROVOCATIVE SHOT — OVERHEAD SURVEILLANCE:\nCOMPOSITION: WIDE OVERHEAD shot from a security camera mounted at ceiling height (4-5 meters). The camera looks STRAIGHT DOWN or at a very steep angle. The model is a SMALL FIGURE in a LARGE space — she occupies no more than 20-30% of the frame height. The rest of the frame is filled with floor, architecture, and other people at normal scale. She is the SAME SIZE as everyone else — a normal human seen from far above. The composition is a MAP of the space with her as one element in it. CRITICAL: Do NOT make the model larger than other people. Do NOT use close-up or medium framing. The camera is FAR AWAY and FIXED.\nEXPRESSION: NOT visible from this distance — she is too far from the camera for facial details. We see her body shape, posture, and position in the space.\nLIGHTING: Overhead institutional lighting. Even, flat, functional.\nLENS: Wide-angle fixed CCTV lens, 12mm equivalent. The entire room is visible.` },
  PD1: { cat: 'Provocative D', desc: 'Hair bite — holding own hair in teeth', template: `PROVOCATIVE SHOT — HAIR BITE:\nCOMPOSITION: Upper body or face close-up. The model gathers a section of her own hair with one hand, brings it to her mouth, and BITES down on it lightly. The hair is held between her front teeth. The gesture is raw, animalistic, self-possessed — she is her own prop.\nEXPRESSION: Eyes locked on camera THROUGH the curtain of hair. The gaze is sharp and unwavering despite the mouth being occupied. No playfulness — this is a territorial gesture, like an animal holding something in its jaws.\nLIGHTING: Dramatic sidelight catching individual strands of hair and the tension in her jaw.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — individual hair strands razor-sharp, background dissolves.` },
  PD2: { cat: 'Provocative D', desc: 'Hard light walk — strong shadow cast forward', template: `PROVOCATIVE SHOT — HARD LIGHT WALK:\nCOMPOSITION: Full body. The model walks TOWARD the camera. A strong, hard light source hits her from the FRONT-DIAGONAL (approximately 45 degrees to one side), casting a long, dramatic shadow on the wall or floor behind/beside her. The shadow is sharp-edged and exaggerated. The lit side of her face and garment is brilliantly exposed, the other side falls into natural shadow. The floor is CLEAN — NO debris, fallen objects, or scattered items on the ground.\nEXPRESSION: Looking forward, past the camera. Determined, unhurried stride. Not acknowledging the camera — she is walking through it, not to it.\nLIGHTING: Single hard directional light from front-diagonal. No fill. The shadow she casts is as much a character in the frame as she is.\nLENS: Shot on Leica Summilux-M 35mm f/1.4 ASPH — wide enough to capture both the model and her full shadow in the environment.` },
  PD3: { cat: 'Provocative D', desc: 'Lean forward — hands on knees, staring down camera', template: `PROVOCATIVE SHOT — FORWARD LEAN:\nCOMPOSITION: Full body, shot from ground level or slightly below. The model leans FORWARD aggressively — hands on knees or thighs, weight pushed toward the camera. The pose shortens the distance between her face and the lens. Shoulders hunched forward, spine curved, head tilted slightly down with eyes looking UP at camera from under her brow.\nEXPRESSION: The look from under the brow is intense, evaluating, cold. "I'm coming closer and you should be worried." No smile.\nLIGHTING: Overhead light falling on her back and shoulders, face partially self-shadowed by the forward lean.\nLENS: Shot on Sigma 35mm f/1.2 — the wide angle exaggerates the forward lean, making her loom toward the viewer.` },
  PD4: { cat: 'Provocative D', desc: 'Street catwalk — walking through crowd, heads turning', template: `PROVOCATIVE SHOT — STREET CATWALK:\nCOMPOSITION: Full body. The model walks TOWARD the camera through a BUSY PUBLIC SPACE — a crowded sidewalk, a shopping street, a train station concourse, a market. She walks with RUNWAY STRIDE — deliberate, rhythmic, chin level, shoulders back, one foot directly in front of the other. The crowd parts slightly around her or continues their normal flow. SEVERAL BYSTANDERS (3-5 people) have TURNED THEIR HEADS to look at her — some mid-turn, some already staring, some glancing over their shoulder. The rest of the crowd is oblivious, creating a natural mix of attention and indifference.\nEXPRESSION: Eyes FORWARD, past the camera, past everything. She does not see the people turning. She does not acknowledge the attention. Her gaze is fixed on an invisible vanishing point — the end of a runway that only she can see. The mouth is neutral, the jaw relaxed. This is not performance; this is how she walks.\nLIGHTING: Available daylight or street lighting. Natural, uncontrolled — the realism of the light makes the runway walk more surreal.\nLENS: Shot on Leica Summilux-M 35mm f/1.4 ASPH — wide enough to capture the model, the turning heads, and the flowing crowd in a single frame with documentary immediacy.` },
  PD5: { cat: 'Provocative D', desc: 'Pocket hands — both hands deep in pockets, confrontational stance', template: `PROVOCATIVE SHOT — POCKET HANDS:\nCOMPOSITION: Full body or 3/4. The model stands with BOTH HANDS shoved DEEP into pockets — jacket pockets, dress pockets, or jammed into the waistband if no pockets exist. Shoulders slightly raised, elbows locked outward. The stance is wide, planted, immovable. The hands-in-pockets gesture is not casual — it is REFUSAL. She refuses to interact, to gesture, to reach out. Her body is a closed system.\nEXPRESSION: Direct camera gaze. The jaw is set. The refusal to use her hands combined with the confrontational stare creates a tension — she could do something, but she has decided not to. You are not worth the effort of removing her hands from her pockets.\nLIGHTING: Available environmental light. The body silhouette with the locked elbows should be visible.\nLENS: Shot on Leica Summilux-M 35mm f/1.4 ASPH — the full stance and the environment captured with documentary weight.` },
  PD6: { cat: 'Provocative D', desc: 'Head tilt — chin up, looking down nose at camera', template: `PROVOCATIVE SHOT — SUPERIORITY:\nCOMPOSITION: Upper body or face close-up, shot from slightly BELOW eye level. The model tilts her chin UP and looks DOWN her nose at the camera. The angle makes her appear to tower over the viewer even in a close-up. The garment's front neckline and collar are visible.\nEXPRESSION: Looking down at the camera with absolute contempt. Not anger — something worse: pity. She regards the viewer as something small and uninteresting. Eyelids slightly lowered, nostrils slightly flared.\nLIGHTING: Light from below or from the side, catching the underside of her jaw and cheekbones. The upward angle creates dramatic shadows on her face.\nLENS: Shot on Zeiss Otus 85mm f/1.4 — the jawline and nostrils from this angle rendered with sculptural precision.` },
  PE1: { cat: 'Provocative E', desc: 'Spill — wine/water staining dress, zero reaction', template: `PROVOCATIVE SHOT — SPILL:\nCOMPOSITION: Medium or upper body. The model sits at a restaurant or café table. A glass has TIPPED OVER — wine or water is visibly SPILLED on the table and has STAINED or SOAKED into part of her garment. The wet stain on the fabric is clearly visible. She makes NO attempt to clean it, move away, or acknowledge it.\nEXPRESSION: DIRECT camera gaze. Completely unbothered. Not a single muscle in her face registers the spill. She stares at the camera as if nothing has happened. The surrounding diners are looking at the stain on her dress with concern or alarm.\nLIGHTING: Available restaurant ambient light. The wet fabric catches light differently from the dry fabric — this contrast should be visible.\nLENS: Shot on Contax Planar 45mm f/2 — documentary quality, the spill and the crowd reactions captured with candid immediacy.` },
  PE2: { cat: 'Provocative E', desc: 'Soaked in rain — posing while others shelter', template: `PROVOCATIVE SHOT — SOAKED:\nCOMPOSITION: Full body, outdoor. It is RAINING. The people around her — passersby, other pedestrians — are wearing raincoats, holding umbrellas, hunching their shoulders, rushing for cover. The model stands or poses in the rain COMPLETELY EXPOSED — no umbrella, no coat, no shelter. Her hair is WET, plastered to her face. Her garment is SOAKED THROUGH, clinging to her body, darkened by water. Raindrops are visible on her skin.\nEXPRESSION: POSING for the camera as if it were a sunny day on set. Perfect posture, deliberate pose, direct gaze. She does not squint, does not hunch, does not acknowledge the rain in any way. The contrast between her composure and everyone else scrambling is the entire point.\nLIGHTING: Overcast, grey, wet light. Reflections on wet pavement. The rain itself is visible as streaks or drops.\nLENS: Shot on Leica Summilux-M 35mm f/1.4 ASPH — wide enough to show the sheltering crowd around her.` },
  PE3: { cat: 'Provocative E', desc: 'Sauce splatter — food stain on garment, ignored', template: `PROVOCATIVE SHOT — SPLATTER:\nCOMPOSITION: Upper body or medium shot. The model sits at a dining table. Soup, sauce, or food has SPLATTERED onto her garment — a visible stain or drip mark on the chest, sleeve, or lap area. She is NOT wiping it, NOT looking at it, NOT acknowledging it.\nEXPRESSION: Calm, direct camera gaze. She continues to exist as if the stain does not exist. Her hands rest on the table or hold cutlery normally. She may be mid-meal, fork or glass in hand.\nLIGHTING: Warm restaurant light. The stain catches light.\nLENS: Shot on Zeiss Otus 85mm f/1.4 — the stain texture and the garment fabric rendered with clinical, unflinching detail.` },
  PE4: { cat: 'Provocative E', desc: 'Rush hour still — everyone hurrying, model motionless', template: `PROVOCATIVE SHOT — RUSH HOUR STILL:\nCOMPOSITION: Full body or medium shot. The model stands or sits in a BUSY TRANSIT SPACE — a train station concourse, a subway platform, a busy crosswalk, a morning commute sidewalk. Everyone around her is in MOTION — walking briskly, checking phones, adjusting bags, rushing past. Normal, everyday hurry — not panic, just the constant flow of people with places to be. The model is COMPLETELY STILL in the middle of it all. She is not waiting for someone, not checking the time, not looking for directions. She simply does not move.\nEXPRESSION: Blank, direct camera gaze. Not defiant, not meditative — just still. She exists at a different speed from everyone else. The crowd moves around her like water around a stone.\nLIGHTING: Available daylight or station lighting. The moving figures around her may carry slight motion blur from their pace.\nLENS: Shot on Sigma 35mm f/1.2 — wide enough to capture the flowing crowd and the motionless model in a single frame.` },
  PE5: { cat: 'Provocative E', desc: 'Wind immunity — storm blows others, model untouched', template: `PROVOCATIVE SHOT — WIND IMMUNITY:\nCOMPOSITION: Full body, outdoor or semi-outdoor. STRONG WIND is blowing. Around the model, other people's hair flies wildly, their clothes flap, they shield their faces, lean into the wind. The model stands in the same wind but appears COMPLETELY UNAFFECTED — her hair is perfectly in place, her posture is upright and relaxed, her clothing is completely still. It is physically impossible but visually undeniable.\nEXPRESSION: Serene, direct gaze at camera. She does not squint, does not brace. The wind does not exist for her.\nLIGHTING: Dramatic, directional wind-light — the kind of harsh light that comes with storms.\nLENS: Shot on Fujifilm GF 110mm f/2 — medium format weight gives her supernatural stillness even more gravity.` },
  PE6: { cat: 'Provocative E', desc: 'Table disaster — everything fallen, model composed', template: `PROVOCATIVE SHOT — TABLE DISASTER:\nCOMPOSITION: Medium or full body. The model sits at a table where EVERYTHING has fallen or been knocked over — glasses tipped, plates shifted, cutlery scattered, napkins crumpled, food spilled. The table is a disaster. But the model sits with PERFECT POSTURE, hands placed calmly on the table edge or in her lap, as if the table were immaculately set.\nEXPRESSION: Direct camera gaze. Not a trace of distress or even awareness of the mess. She sits among destruction with the composure of someone at a state dinner.\nLIGHTING: Available dining light. The chaos of the table is well-lit and clearly visible.\nLENS: Shot on Contax Planar 45mm f/2 — the mess rendered in sharp documentary detail, her composure in the center of it.` },
  PE7: { cat: 'Provocative E', desc: 'Red wine stain — catwalk through crowd with stained garment', template: `PROVOCATIVE SHOT — STAINED CATWALK:\nCOMPOSITION: Full body. The model walks DIRECTLY TOWARD the camera through a restaurant or event space, as if it were a catwalk runway. RED WINE has been spilled on her garment — a visible, dark stain spreading across the fabric. She has NOT changed, NOT cleaned it, NOT acknowledged it. She walks with full editorial confidence, chin up, stride perfect, as if the stain does not exist. OTHER PEOPLE at tables on both sides are STARING at the stain — some turning heads, some whispering, some looking concerned or shocked.\nEXPRESSION: DIRECT camera gaze. Absolute composure. The stain is irrelevant. She walks through their judgment like it is air.\nLIGHTING: Available restaurant/venue light. The wet wine stain on the fabric catches light differently from the dry fabric — this contrast should be visible.\nLENS: Shot on Contax Planar 45mm f/2 — the casual lens gives it documentary immediacy, the crowd reactions captured candidly.` },
  PE8: { cat: 'Provocative E', desc: 'Table sprawl — lying on empty dining table, nearby diners watching', template: `PROVOCATIVE SHOT — TABLE SPRAWL:\nCOMPOSITION: Medium or full body. The model LIES or RECLINES on an EMPTY dining table in a restaurant — no place settings, no food, just the bare table surface. She sprawls across it as if it were a daybed. Nearby tables are OCCUPIED by other diners who are eating normally — they glance over at her with confusion, discomfort, or fascination. The contrast is between the normalcy of the surrounding diners and the absurdity of a woman lying on an empty table.\nEXPRESSION: NOT looking at camera. She stares at the ceiling or gazes sideways with total indifference. She is resting, not performing. The other diners' attention means nothing.\nLIGHTING: Warm restaurant ambient light. Candlelight or overhead fixtures.\nLENS: Shot on Sigma 35mm f/1.2 — wide enough to capture the model on the table AND the nearby occupied tables with their reacting diners.` },
  PD7: { cat: 'Provocative D', desc: 'Center of attention — crowd watching, model ignores', template: `PROVOCATIVE SHOT — CENTER OF ATTENTION:\nCOMPOSITION: Medium or full body. The model is in a PUBLIC SPACE — a restaurant, café, shop, bar, lobby — surrounded by OTHER PEOPLE (diners, shoppers, passersby). The bystanders are visibly LOOKING at her, turning heads, glancing over shoulders, whispering. But the model is COMPLETELY OBLIVIOUS to their attention. She faces the CAMERA ONLY, as if the photographer is the only person in the room who matters. The crowd's attention flows toward her; her attention flows past them to the lens.\nEXPRESSION: Direct camera gaze. Cool, unbothered, privately amused. She knows everyone is watching. She does not care. Her focus on the camera is absolute — the onlookers are furniture.\nLIGHTING: Available ambient light of the venue. The model should be slightly better lit than the background crowd — naturally, not artificially.\nLENS: Shot on Contax Planar 45mm f/2 — the casual lens gives it a documentary, "caught in public" quality. Background figures slightly soft.` },
  PF1: { cat: 'Sculptural F', desc: 'Sculptural recline — body as architecture on furniture', template: `PROVOCATIVE SHOT — SCULPTURAL RECLINE:\nCOMPOSITION: Full body. The model RECLINES on a sofa, chaise longue, or daybed — not lying flat, but in a SCULPTURAL POSE where the body creates architectural lines. One arm draped over the backrest, legs angled to create diagonal tension. The body is treated as a marble sculpture placed on furniture. The composition emphasizes the LINES and ANGLES of the body.\nEXPRESSION: Looking directly at camera with cold, inorganic detachment. The gaze of a statue.\nLIGHTING: Warm, directional light sculpting the body's contours. Light and shadow define the body's geometry — collarbones, jawline, the angle of the legs.\nLENS: Shot on Fujifilm GF 110mm f/2 — medium format renders skin with a three-dimensional, marble-like quality.` },
  PF2: { cat: 'Sculptural F', desc: 'Fabric tension — garment pulled by pose, skin visible at boundaries', template: `PROVOCATIVE SHOT — FABRIC BOUNDARY:\nCOMPOSITION: Medium or upper body. The model's POSE creates tension in the garment — a twist of the torso, a raised arm, a crossed leg — that causes the fabric to shift, pull, and reveal the natural boundary between clothing and skin. The focus is on the ARCHITECTURAL RELATIONSHIP between fabric and body — where cloth ends and skin begins. This is about structure and tension, not exposure.\nEXPRESSION: Unaware of the fabric tension. Looking elsewhere with absolute indifference. The body moves; the clothing follows its physics.\nLIGHTING: Raking sidelight that emphasizes the texture difference between fabric surface and skin surface. The light treats both materials equally — skin as textile, textile as skin.\nLENS: Shot on Hasselblad XCD 80mm f/1.9 — medium format captures the micro-texture of both fabric weave and skin with equal clinical precision.` },
  PF3: { cat: 'Sculptural F', desc: 'Cold shoulder — bare shoulder/collarbone emphasis', template: `PROVOCATIVE SHOT — ARCHITECTURE OF SKIN:\nCOMPOSITION: Upper body close-up. The composition is built around the GEOMETRY of the model's shoulder, collarbone, and neck — the architectural structure where the garment meets the body. If the garment has an open neckline, asymmetric cut, or off-shoulder element, this shot maximizes it. The shoulder and collarbone are treated as sculptural elements — like the edge of a marble surface.\nEXPRESSION: Profile or three-quarter view. Not looking at camera. The face is secondary — the shoulder line is the subject.\nLIGHTING: Single directional light casting a precise shadow along the collarbone. The bone structure creates its own landscape of light and shadow.\nLENS: Shot on Zeiss Otus 85mm f/1.4 — clinical precision on skin texture, the collarbone rendered as a ridge in marble.` },
  PF4: { cat: 'Sculptural F', desc: 'Crossed legs — seated, minimal silhouette, geometric', template: `PROVOCATIVE SHOT — GEOMETRIC CROSS:\nCOMPOSITION: Full body or 3/4. The model sits with LEGS CROSSED high — one leg over the other, creating a sharp diagonal line. The pose is tight, geometric, contained. The garment's hemline sits naturally wherever the pose places it. The composition emphasizes the ANGULAR GEOMETRY of the crossed legs — the triangle of negative space, the line of the shin, the point of the shoe.\nEXPRESSION: Direct camera gaze. Cold, still, monumental. She sits like a minimalist sculpture in a gallery.\nLIGHTING: Even, clean light — almost clinical. No dramatic shadows. The geometry of the pose speaks for itself.\nLENS: Shot on Canon RF 85mm f/1.2L USM DS — smooth, luminous rendering of skin as a continuous surface.` },
  PF5: { cat: 'Sculptural F', desc: 'Hand on neck — self-touch, sculptural gesture', template: `PROVOCATIVE SHOT — SELF-ARCHITECTURE:\nCOMPOSITION: Upper body. One hand is placed on her own NECK or the opposite shoulder — a gesture of self-possession. The fingers are spread, deliberate, architectural. The hand on skin creates a compositional element — five lines against a surface. This is not tenderness; it is a geometric claim on her own body.\nEXPRESSION: Eyes closed or looking directly at camera. If closed, the jaw is set — this is not relaxation. If open, the gaze is flat and assessing.\nLIGHTING: Warm directional light emphasizing the contrast between the hand's shadow on skin and the surrounding light. Fingers cast precise, graphic shadows.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — the hand and neck rendered with painterly depth, everything else dissolves.` },
  PF6: { cat: 'Sculptural F', desc: 'Stretch — arms raised, elongated torso line', template: `SCULPTURAL SHOT — VERTICAL LINE:\nCOMPOSITION: Full body or 3/4. The model raises BOTH ARMS above her head — stretching upward, elongating the entire torso. The arms may be straight, or one hand gripping the opposite wrist. The stretch is not casual — it is a deliberate elongation that transforms the body into a single vertical line. The garment lifts and shifts naturally with the stretch.\nEXPRESSION: Looking straight at camera with zero self-consciousness. The stretch is functional, not performative — as if she's testing the limits of the space above her.\nLIGHTING: Strong backlight or sidelight creating a rim along the extended body line. The elongated silhouette is the composition.\nLENS: Shot on Sigma 35mm f/1.2 — wide enough to capture the full vertical extension with environmental context.` },
  PF7a: { cat: 'Sculptural F', desc: 'Elevated perch — seated high, legs hanging, gravity on fabric', template: `SCULPTURAL SHOT — ELEVATED PERCH:\nCOMPOSITION: Full body or 3/4. The model sits on a HIGH surface — an armrest of a sofa, a countertop, a high stool, a table edge, a window sill, a balustrade. The seat height means her legs hang DOWN with feet well off the ground. Legs are NOT crossed — they hang parallel or one slightly forward. The elevated position + gravity creates a natural interplay between fabric and the surface of the thigh. The seat edge acts as a fulcrum where the garment meets architecture.\nEXPRESSION: Direct camera gaze. Cold, monumental. She sits above the viewer's eye level, looking down — a statue on a plinth.\nLIGHTING: Light from below or from the side, catching the vertical line of the hanging legs and the horizontal plane of the seated body. The contrast between the lit upper body and the shadowed underside of the seat creates depth.\nLENS: Shot on Fujifilm GF 110mm f/2 — medium format gives the elevated pose monumental weight. The skin of the legs rendered as continuous, smooth surface — marble columns hanging from a stone shelf.` },
  PF7b: { cat: 'Sculptural F', desc: 'Knee draw — seated on floor, one knee raised, triangular geometry', template: `SCULPTURAL SHOT — KNEE DRAW:\nCOMPOSITION: Full body. The model sits on the FLOOR, one knee drawn up toward the chest, the other leg extended or folded beneath. The raised knee creates a sharp triangular structure — the peak of the knee, the diagonal of the shin, the base of the thigh. The body wraps partially around the raised knee. The composition is built around this triangle and the negative space it creates.\nEXPRESSION: Looking at camera over the top of the raised knee, or resting chin on knee. The eyes are flat, clinical — the pose is geometric, not defensive.\nLIGHTING: Low, directional light emphasizing the angular geometry of the raised knee and the planes of the leg.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — the knee and surrounding geometry razor-sharp, the background dissolves.` },
  PF7c: { cat: 'Sculptural F', desc: 'Prone — lying face-down, arms and face visible from front', template: `SCULPTURAL SHOT — PRONE:\nCOMPOSITION: The model lies FACE DOWN on a surface — floor, table, daybed. Shot from directly in front at ground level. We see her FACE (chin on hands or on the surface, looking at camera), her FOREARMS, and the horizontal line of her body extending away. The body becomes a landscape viewed from its edge — a horizon line of fabric and skin.\nEXPRESSION: Looking directly at camera from this low, grounded position. The gaze is level, unhurried, territorial — she has claimed this entire horizontal plane.\nLIGHTING: Low-angle light from the side, catching the contour of the prone body. The surface texture beneath her is visible.\nLENS: Shot on Sigma 35mm f/1.2 — wide angle from ground level exaggerates the horizontal depth, the body stretches into the distance.` },
  PF7d: { cat: 'Sculptural F', desc: 'Wall lean with bent knee — triangular leg, against vertical surface', template: `SCULPTURAL SHOT — WALL TRIANGLE:\nCOMPOSITION: Full body. The model stands with her back or shoulder against a wall. One foot is FLAT ON THE FLOOR, the other knee is BENT with the sole of that foot pressed against the wall behind her. The bent leg creates a sharp triangular shape against the vertical surface. The standing leg is a column, the bent leg is a flying buttress.\nEXPRESSION: Looking at camera or in profile. Indifferent, architectural. The pose is structural, not casual.\nLIGHTING: Strong sidelight raking across the wall surface and the model simultaneously. The bent knee casts a geometric shadow on the wall.\nLENS: Shot on Zeiss Otus 85mm f/1.4 — the wall texture and skin texture rendered with equal clinical precision.` },
  PF7e: { cat: 'Sculptural F', desc: 'Horizontal landscape — reclining, gravity-shifted fabric on thigh', template: `SCULPTURAL SHOT — HORIZONTAL LANDSCAPE:\nCOMPOSITION: Full body. The model lies on her back on a surface — a sofa, a daybed, a marble floor, a wooden table. Shot from ABOVE at a slight angle, or from the SIDE at her eye level. Her upper body is composed and still — arms at her sides or one hand resting on her stomach. From the waist down, the garment has SHIFTED due to gravity and the reclining position — the fabric has fallen to one side, gathering and folding on the surface beneath her, exposing the thigh from mid-thigh downward on one or both legs. This is PHYSICS — the natural behavior of fabric on a horizontal body. The exposed legs are straight or one knee slightly bent, creating a long diagonal line.\nEXPRESSION: COMPLETELY BLANK. No tension, no relaxation, no emotion. The face of a machine in sleep mode. The body is horizontal but the mind has not surrendered — the eyes are open, fixed, unreadable.\nBODY AS LANDSCAPE: The reclining figure creates a topographic map — the peaks of the knees, the plateau of the stomach, the ridge of the hip bone, the valley where the garment gathers. The exposed thigh is a smooth, continuous plane — marble, uninterrupted. The transition from fabric to skin at mid-thigh is the geological fault line of the composition — where two materials meet.\nLIGHTING: Warm, directional light from one side, casting long shadows across the horizontal body. The light catches the top surfaces — the front of the thighs, the garment folds, the face — while the underside falls into shadow.\nLENS: Shot on Fujifilm GF 110mm f/2 — medium format renders the horizontal body as a sculptural landscape.` },
  PF7: { cat: 'Sculptural F', desc: 'Scapula — 3/4 back, shoulder blade and spine visible', template: `SCULPTURAL SHOT — SCAPULA:\nCOMPOSITION: Upper body, shot from THREE-QUARTER BACK angle — approximately 120-135 degrees from front. The model's face is visible in near-profile (jawline, cheekbone, one eye). The composition reveals the SHOULDER BLADE and the RIDGE OF THE SPINE through or alongside the garment. If the garment has an open back, low neckline, or thin straps, the bone structure is directly visible. If not, the garment's fabric drapes over the skeletal architecture, revealing the topography beneath.\nEXPRESSION: Profile or near-profile. Looking away from camera. The face is calm, detached — the body's architecture is the subject, not the expression.\nLIGHTING: Raking sidelight from the front-side, catching the ridge of the shoulder blade and the valley of the spine. The light creates a landscape of bone and shadow.\nLENS: Shot on Hasselblad XCD 80mm f/1.9 — medium format renders the bone structure beneath skin with sculptural, almost geological detail.` },
  PF8: { cat: 'Sculptural F', desc: 'Mouth landscape — extreme close-up of lips, chin, nose base', template: `SCULPTURAL DETAIL — MOUTH LANDSCAPE:\nCOMPOSITION: Extreme macro close-up — frame contains ONLY the lower half of the face: the lips, the chin, the philtrum, and the very base of the nose. The eyes are NOT visible. The crop is so tight that the face becomes an abstract landscape — the cupid's bow is a mountain ridge, the lower lip a plateau, the chin a smooth descending plain. The lips are closed, neutral, carrying no expression.\nEXPRESSION: None visible — the framing excludes the eyes entirely. The absence of eyes removes all personality, leaving only surface and form. The mouth is not communicating — it is a geological feature.\nLIGHTING: Soft, close-range directional light catching the subtle texture of the lip surface — the fine vertical lines, the boundary where lip meets skin, the faintest sheen of natural moisture. The chin catches a gentle shadow beneath the lower lip.\nLENS: Shot on Canon TS-E 90mm f/2.8L Macro — tilt-shift creating a razor-thin plane of focus across the lips, with the chin and nose base falling into the softest possible blur.` },
  PF9: { cat: 'Sculptural F', desc: 'Inner void — seated, knees apart, triangular negative space', template: `SCULPTURAL SHOT — INNER VOID:\nCOMPOSITION: Medium or 3/4 shot. The model sits with both feet flat on the floor, knees slightly apart — NOT crossed, NOT pressed together. The space between the inner thighs forms a narrow, shadowed triangular void. This negative space is the compositional subject — the dark aperture framed by the lines of the legs. The garment's hem falls naturally across the thighs, its edge defining the upper boundary of the triangle. Hands rest on the knees or at the sides, not covering the space.\nEXPRESSION: Direct camera gaze. Cold, monumental, unaware of the void she creates. She sits as if waiting for a train — the geometry is incidental, not performed.\nLIGHTING: Front-directional light that illuminates the knees and the garment but lets the space between fall into natural shadow. The shadow itself is the focal point — the deeper it is, the more architectural the void becomes.\nLENS: Shot on Fujifilm GF 110mm f/2 — medium format renders the legs as smooth, continuous columns framing the central void with sculptural weight.` },
  PC6: { cat: 'Provocative C', desc: 'Straddle stand — standing with legs on both sides of object', template: `PROVOCATIVE SHOT — STRADDLE STAND:\nCOMPOSITION: Full body. The model stands with BOTH FEET planted on either side of an unstable or narrow object — straddling a low bollard, a fire hydrant, a concrete barrier, a bench armrest, a pipe, a chain post, a narrow wall top. Both feet are firmly on the ground or on the object's edges, legs apart, weight evenly distributed. The stance is wide, grounded, territorial — she claims the object beneath her by standing over it. The garment drapes naturally between the spread legs.\nEXPRESSION: Defiant. Chin up, eyes sharp. She owns the ground beneath her. The wide stance is not casual — it is territorial.\nLIGHTING: Available environmental light. The object between her feet and the ground surface are clearly visible.\nLENS: Shot on Leica Summilux-M 35mm f/1.4 ASPH — wide enough to capture the full stance and the environment around it.` },
  // ── Provocative G — "Misuse" (異常だけど無害な場所の誤用) ──
  PG1: { cat: 'Provocative G', desc: 'Wall stare — facing wall, back to everything worth seeing', template: `PROVOCATIVE SHOT — WALL STARE:\nCOMPOSITION: Full body, shot from behind at a slight angle so her profile is partially visible. The model stands FACING A BLANK WALL — not a window, not a display, not anything of interest. Behind her is the actual spectacle of the location (the view, the architecture, the machines, the art). She has CHOSEN to face the wall instead. Her body is close to the wall — almost intimate with it.\nEXPRESSION: Eyes open, staring at the wall surface from inches away. Not examining it, not looking for something. Just staring. If her profile is visible, the expression is completely flat.\nLIGHTING: Available environmental light. The interesting background behind her is well-lit and visible to the viewer — emphasizing what she is deliberately ignoring.\nLENS: Shot on Sigma 35mm f/1.2 — wide enough to show both her at the wall and the ignored spectacle behind her.` },
  PG2: { cat: 'Provocative G', desc: 'Floor sit — sitting on floor when seats are available', template: `PROVOCATIVE SHOT — FLOOR SIT:\nCOMPOSITION: Full body. The model sits on the FLOOR in a compact position — cross-legged, knees drawn up, or formal seiza (正座). She sits on the bare ground even though chairs, benches, stools, or other proper seating is clearly visible and EMPTY nearby. The available seats are prominently in frame — the viewer can see she chose the floor.\nEXPRESSION: Defiant. Chin up, eyes sharp from the floor position. She sits on the ground the way a CEO sits in their office chair. This is not discomfort — it is dominance from below.\nLIGHTING: Available environmental light. The empty seats should be visible and well-lit.\nLENS: Shot on Contax Planar 45mm f/2 — documentary quality, the absurdity of the floor choice captured with candid naturalism.` },
  PG3: { cat: 'Provocative G', desc: 'Shadow dweller — standing in darkest corner, ignoring light', template: `PROVOCATIVE SHOT — SHADOW DWELLER:\nCOMPOSITION: Full body or 3/4. The location has an obvious, beautiful light source — a window with golden light, a skylight, a neon glow, a spotlight. The model IGNORES it entirely and stands in the DARKEST CORNER or shadow of the space. She is barely visible, partially consumed by darkness, while the beautiful light illuminates empty space. The composition shows both the wasted light and her deliberate absence from it.\nEXPRESSION: Visible only partially — one side of her face catches the faintest edge of light. What is visible is completely blank. She chose the dark and feels nothing about it.\nLIGHTING: Strong, obvious light source illuminating the WRONG part of the frame (empty space). The model is in deep shadow. The contrast between the lit emptiness and the shadowed figure is the composition.\nLENS: Shot on Leica Noctilux-M 50mm f/0.95 ASPH — extraordinary low-light rendering, pulling detail from the shadows where she hides.` },
  PG4: { cat: 'Provocative G', desc: 'Object embrace — hugging an absurd or repulsive object', template: `PROVOCATIVE SHOT — OBJECT EMBRACE:\nCOMPOSITION: Medium or full body. The model WRAPS BOTH ARMS around an object that no human would embrace — a rusted pipe, a concrete bollard, a trash bin, a fire extinguisher, a toilet, a vending machine, a traffic cone, a broken machine. She HUGS it the way a person hugs someone they haven't seen in years — tight, committed, full-body contact. Her arms are fully wrapped around it. Her body presses against it. The embrace is REAL and COMMITTED, not a casual lean.\nEXPRESSION: Eyes OPEN, staring directly at camera WHILE hugging the object. The face is completely flat — no warmth, no affection, no irony. She does not find this strange. She does not know this is wrong. The direct eye contact while hugging a trash bin is the image that makes people send it to a friend.\nLIGHTING: Available environmental light. The object and her arms around it must be clearly visible — the viewer needs to see exactly what she is hugging.\nLENS: Shot on Contax Planar 45mm f/2 — documentary quality. The absurdity is captured as fact, not as art.` },
  PG5: { cat: 'Provocative G', desc: 'Supine — lying face-up under something heavy or tall', template: `PROVOCATIVE SHOT — SUPINE:\nCOMPOSITION: Full body, shot from above or from the side at ground level. The model lies FACE UP on the floor, directly beneath something imposing — a chandelier, a crane, a massive machine, a vaulted ceiling, a bridge structure, an overhanging rock. Her body is straight, arms at sides, like a body on a slab. She stares up at the object above her. She is not dead — her eyes are open and alert. But she has placed herself in the most vulnerable position possible beneath the heaviest thing in the room.\nEXPRESSION: Eyes open, staring straight up. Not afraid, not impressed — CATALOGUING. She looks at the object above her the way a machine scans a barcode.\nLIGHTING: The imposing object above casts its shadow over her. Light comes from the sides.\nLENS: Shot from above — Sigma 35mm f/1.2 capturing her full body and the imposing structure above. Or from ground level — the body stretching into the distance beneath the looming mass.` },
  PG6: { cat: 'Provocative G', desc: 'Minimized — smallest posture in largest space', template: `PROVOCATIVE SHOT — MINIMIZED:\nCOMPOSITION: Wide shot. The location is VAST — a cathedral ceiling, an industrial hall, a quarry, a cavernous room, an open landscape. The model makes herself as SMALL as possible within this enormous space — hugging her knees in a corner, curled against a wall, crouched at the base of a massive column. She occupies less than 15% of the frame. The space DWARFS her. But her posture is not fearful or hiding — it is chosen, deliberate, comfortable. She has made herself small because she wanted to, not because the space demanded it.\nEXPRESSION: Direct camera gaze from the small, compressed position. Cold eyes in a tiny body. The contrast between the small posture and the commanding gaze is the provocation.\nLIGHTING: The vast space is well-lit, emphasizing its scale. She sits in its shadow or at its edge.\nLENS: Shot on Sigma 35mm f/1.2 or wider — the full scale of the space visible, her small figure a precise punctuation mark within it.` },
  PG7: { cat: 'Provocative G', desc: 'Clothed submersion — fully dressed in water', template: `PROVOCATIVE SHOT — CLOTHED SUBMERSION:\nCOMPOSITION: Full body or 3/4. The model is in WATER — a bathtub, a fountain basin, a shallow pool, a flooded floor, a puddle deep enough to sit in. She is FULLY CLOTHED in the garment. The fabric is SOAKED — darkened, heavy, clinging to her body. Water level reaches her waist or chest if seated, or her ankles/knees if standing. She has entered the water deliberately, with zero urgency to get out.\nEXPRESSION: Direct camera gaze. Completely unbothered. The water is irrelevant. The ruined garment is irrelevant. She sits in water the way other people sit on a sofa.\nLIGHTING: Available environmental light reflecting off the water surface. The wet fabric catches light differently from dry fabric — this contrast should be visible.\nLENS: Shot on Fujifilm GF 110mm f/2 — medium format renders the wet fabric with three-dimensional, heavy, sculptural weight.` },
  PG8: { cat: 'Provocative G', desc: 'Wrong direction — riding escalator/walkway the wrong way or backwards', template: `PROVOCATIVE SHOT — WRONG DIRECTION:\nCOMPOSITION: Full body. The model moves in the WRONG DIRECTION within a system designed for one-way flow — standing backwards on a moving walkway, facing the wrong way on an escalator, walking against the flow of a one-way corridor. Everyone else (if present) moves correctly. She is the single error in the system. She does not appear to realize she is wrong. OR she is perfectly still while the system moves her in a direction she clearly did not choose, and she does not care.\nEXPRESSION: Blank, direct camera gaze. No awareness of being wrong. No defiance — defiance would require knowing the rule. She simply does not have the software that recognizes direction.\nLIGHTING: Available environmental light. The directional flow of the space (arrows, other people, the mechanism) should be visible.\nLENS: Shot on Leica Summilux-M 35mm f/1.4 ASPH — wide enough to show the system and her error within it.` },
  // ── Provocative H — Shoe/Accessory Detail (挑発モード用) ──
  PH1: { cat: 'Provocative H', desc: 'Shoe on surface — shoe pressed on environment surface, low angle', template: `PROVOCATIVE DETAIL — SHOE DOMINANCE:\nCOMPOSITION: Low-angle close-up from ground level. The shoe/sneaker is the HERO of the frame — filling 40-50% of the image. The shoe is planted firmly on an environment surface (rusted metal, cracked tile, wet concrete, gravel, a forbidden surface). The rest of the model's leg is visible extending upward but out of focus. The environment surface texture beneath and around the shoe is clearly visible.\nEXPRESSION: Not visible — this is a shoe detail shot.\nLIGHTING: Dramatic low-angle light catching the shoe's material, texture, and construction. The surface beneath glows with reflected light.\nLENS: Shot on Canon TS-E 90mm f/2.8L Macro — tilt-shift creating razor-thin focus on the shoe, everything else dissolves.` },
  PH2: { cat: 'Provocative H', desc: 'Shoe stride — mid-walk shoe detail, motion implied', template: `PROVOCATIVE DETAIL — STRIDE:\nCOMPOSITION: Low-angle, ground-level shot capturing the shoes MID-STRIDE. One foot is lifting off the ground, the other is about to land. The soles, the heel, the construction of the shoe are visible. The ground surface (wet pavement, industrial floor, gravel) is in sharp detail. The full body is visible above but the composition makes the shoes and the ground the subject.\nEXPRESSION: Not the focus — the body above is partially visible but the framing prioritizes the feet.\nLIGHTING: Available environmental light. The shoe materials catch light differently from the ground surface.\nLENS: Shot on Sigma 35mm f/1.2 — low angle captures both shoes and enough environment for context.` },
  PH3: { cat: 'Provocative H', desc: 'Shoe and environment — full body low angle, shoes prominent', template: `PROVOCATIVE SHOT — GROUNDED:\nCOMPOSITION: Full body from LOW ANGLE — camera at ankle height, shooting upward. The shoes occupy the bottom 30% of the frame, rendered in sharp detail. The model towers above, her full body and the environment visible. The low angle makes the shoes feel monumental and the model feel towering. The environment's ground surface, texture, and debris are all visible around the shoes.\nEXPRESSION: Defiant. Chin up, eyes sharp. Looking down at the camera from above — the ultimate position of power.\nLIGHTING: Light from above or from the side, catching the top surfaces of the shoes and the model's face.\nLENS: Shot on Sigma 35mm f/1.2 — the wide angle from low position exaggerates the perspective, shoes massive, body towering.` },
  // ── Cyber Neon Templates ──
  CN1: { cat: 'Cyber Neon', desc: 'Street sit — sitting on wet asphalt or curb', template: `CYBER NEON — STREET SIT:\nCOMPOSITION: Medium or full body. The model SITS directly on the wet street asphalt or curb edge. Legs extended, or one knee drawn up. Her posture is composed and editorial — she sits on the ground the way she would sit on a sofa. The wet surface reflects the two-tone neon colors in streaks beneath her.\nEXPRESSION: Blank, direct camera gaze. Complete indifference to the wet ground.\nENVIRONMENT: Neon signs from businesses visible on both sides. Steam from a nearby subway grate or manhole. Autonomous vehicles pass in the background.` },
  CN2: { cat: 'Cyber Neon', desc: 'Rooftop — skyline behind, city lights below', template: `CYBER NEON — ROOFTOP:\nCOMPOSITION: Full body or 3/4. The model stands or sits on the edge of a building rooftop. The city skyline stretches behind her — towers of light, holographic billboards, aerial transit lines. The sky above is dark. The city below is an ocean of neon. She is silhouetted against the urban glow.\nEXPRESSION: Not looking at camera. Gazing over the city, or straight ahead, expression blank.\nENVIRONMENT: Rooftop infrastructure — ventilation units, antenna arrays, safety railing. The two-tone neon reaches her from massive billboards on adjacent buildings.` },
  CN3: { cat: 'Cyber Neon', desc: 'Balcony — high-floor, night cityscape through railing', template: `CYBER NEON — BALCONY:\nCOMPOSITION: Medium or full body. The model stands or leans against the railing of a high-floor balcony. The night cityscape is visible behind and below her — layers of lit buildings receding into the distance. The two-tone neon spills from signs on nearby buildings, coloring one side of her face and body.\nEXPRESSION: Blank, looking at camera or slightly to the side.\nENVIRONMENT: Minimal balcony furniture. The railing creates horizontal lines across the frame. City lights create bokeh beyond.` },
  CN4: { cat: 'Cyber Neon', desc: 'Glass interior — full-window room, neon reflects inside', template: `CYBER NEON — GLASS INTERIOR:\nCOMPOSITION: Medium or full body. The model is INSIDE a room with floor-to-ceiling glass walls. The neon city is visible through the glass behind her. The two-tone neon light passes through the glass and colors the interior — reflecting off the polished floor, the furniture, and her skin. The interior is minimal and dark — the city outside IS the light source.\nEXPRESSION: Blank, direct camera gaze.\nENVIRONMENT: Minimal modern furniture — a low sofa, a glass table. The glass reflects a ghostly second image of the neon. The room feels like a fishbowl suspended in the city.` },
  CN5: { cat: 'Cyber Neon', desc: 'Alley — narrow backstreet, dense neon on both sides', template: `CYBER NEON — ALLEY:\nCOMPOSITION: Full body. The model stands or walks in a narrow alley between buildings. Neon signs are mounted on both walls at various heights, creating a tunnel of colored light. The alley floor is wet, reflecting the signs in long streaks. The perspective lines of the alley converge behind her.\nEXPRESSION: Blank, looking at camera or walking toward it.\nENVIRONMENT: Fire escapes above, dumpsters in shadow, cables strung between buildings. Dense, chaotic, claustrophobic. Maximum neon density.` },
  CN6: { cat: 'Cyber Neon', desc: 'Crosswalk — standing in middle of wide intersection', template: `CYBER NEON — CROSSWALK:\nCOMPOSITION: Full body, wide shot. The model stands ALONE in the middle of a wide, empty intersection. The crosswalk markings are visible on the wet asphalt. She is a small, sharp figure in a vast urban space. Buildings and neon signs tower on all sides. Traffic lights and signals glow.\nEXPRESSION: Blank, direct camera gaze. She stands in the road as if traffic does not exist.\nENVIRONMENT: Wide open space, wet reflections, distant headlights. The intersection feels frozen — a moment between signal changes.` },
  CN7: { cat: 'Cyber Neon', desc: 'Stairway — subway entrance or fire escape stairs', template: `CYBER NEON — STAIRWAY:\nCOMPOSITION: Full body or 3/4. The model sits on or stands on metal stairs — a subway entrance, a fire escape, or an exterior staircase on a building. The stairs create strong diagonal lines. Neon light from street level spills down (or up) the stairwell, creating a gradient of color.\nEXPRESSION: Blank, gazing at camera from the stairs.\nENVIRONMENT: Metal railings, industrial treads, wet steps reflecting neon. A neon sign visible at the top or bottom of the stairs.` },
  CN8: { cat: 'Cyber Neon', desc: 'Vehicle — leaning on or sitting on hypercar', template: `CYBER NEON — VEHICLE:\nCOMPOSITION: Full body or 3/4. The model leans against or sits on the hood of a parked vehicle. The car is a sleek, angular, HYPERCAR-class vehicle — think 2050 evolution of Rimac, Bugatti, or Porsche. Ultra-low stance, sharp geometric body lines, seamless glass canopy, no visible door handles, matte or satin dark finish that absorbs and reflects the neon differently on each panel. Thin LED light strips trace the car's edges like circuit lines. The car looks like it costs more than the building behind it.\nEXPRESSION: Blank, direct camera gaze. She treats the car like street furniture — it is expensive and she does not care.\nENVIRONMENT: Parked on a neon-lit street. The car's surfaces act as mirrors for the two-tone neon, doubling the color on the ground and the model. Wet road surface reflects the scene.` },
  CN9: { cat: 'Cyber Neon', desc: 'Catwalk — walking toward camera on neon street', template: `CYBER NEON — CATWALK:\nCOMPOSITION: Full body. The model walks DIRECTLY TOWARD the camera on a neon-lit street. Center-framed, confident stride. The street's perspective lines converge on her. Neon signs on both sides create the two-tone split on her body as she moves between them. The wet road reflects her silhouette.\nEXPRESSION: Blank, eyes straight ahead or at camera.\nENVIRONMENT: A long, straight street with neon signage receding into the distance. The street is her runway.` },
  CN10: { cat: 'Cyber Neon', desc: 'Window — inside looking out, neon light flooding in', template: `CYBER NEON — WINDOW:\nCOMPOSITION: Medium or upper body. The model stands or sits near a window INSIDE a dark room. The neon city outside is visible through the window, and its colored light floods in, painting her face and body. One color enters from the window, the other reflects off an interior surface.\nEXPRESSION: Looking out the window, or looking at camera with the city behind her.\nENVIRONMENT: Sparse, dark interior. The window is the only light source. The city outside is a blur of color through rain-streaked glass.` },
  CN11: { cat: 'Cyber Neon', desc: 'Reflection — puddle or glass showing mirrored image', template: `CYBER NEON — REFLECTION:\nCOMPOSITION: Full body or medium. The composition includes BOTH the model AND her reflection — in a large puddle on the street, in a glass storefront, or in the polished surface of a building. The reflection may be sharper or softer than the real figure. The two-tone neon colors appear in both the real and reflected versions.\nEXPRESSION: Not looking at her reflection. Gazing at camera or forward.\nENVIRONMENT: Wet surfaces, glass surfaces, or polished metal that creates mirror-like reflections. The reflected city doubles the neon density.` },
  CN12: { cat: 'Cyber Neon', desc: 'System anomaly — standing before glitching screens, side view', template: `CYBER NEON — SYSTEM ANOMALY:\nCOMPOSITION: Full body or 3/4, shot from the SIDE. The camera is perpendicular to the model — we see her in PROFILE. She faces a wall of massive monitors that are MALFUNCTIONING. The screens do NOT show shop names or advertisements — they display SYSTEM ERRORS: color bar test patterns, static noise, cascading error codes, frozen glitched frames, kernel panic text, or a single flat neon color filling the entire screen. She does NOT touch any controls. Her hands are at her sides or in pockets. She simply stands there as the technology breaks.\nEXPRESSION: Profile view. Blank, unreadable. She does NOT look at the camera.\nENVIRONMENT: Data center, server room, control room, or corporate tech space. NOT a street with shop signs. The screens cast their glitching, flickering light onto the side of her face and body. The space is dark and empty except for the screens.` },
  CN13: { cat: 'Cyber Neon', desc: 'Aquarium — standing beside massive indoor tank', template: `CYBER NEON — AQUARIUM:\nCOMPOSITION: Full body or 3/4. The model stands motionless beside a massive floor-to-ceiling indoor aquarium tank. The tank glows with its own internal light — deep blues and greens from the water, casting a cold, aquatic light on one side of her body. The two-tone neon from the surrounding room colors the other side. She does NOT look at the fish. She stares straight ahead, blank.\nEXPRESSION: Blank, emotionless. She stands next to a living ecosystem and feels nothing.\nENVIRONMENT: High-end interior — a luxury lobby, penthouse, or underground lounge. The aquarium is enormous, architectural, built into the wall. Dark jellyfish or deep-sea creatures drift in the tank. The bioluminescent glow of the tank becomes one of the two-tone light sources.` },
  CN14: { cat: 'Cyber Neon', desc: 'Command center — cyber syndicate HQ, surrounded by screens', template: `CYBER NEON — COMMAND CENTER:\nCOMPOSITION: Full body, wide shot. The model stands in the center of a vast, circular command center — a cyber syndicate headquarters. The floor is a single piece of dark glass or polished stone. A futuristic computer console rises from the floor in front of her — seamlessly integrated, as if the floor itself became a machine. Massive curved display walls surround the entire room, showing data streams, maps, surveillance feeds, and code. She stands in the center of it all, hands at her sides, utterly still.\nEXPRESSION: Blank, cold. She is the one in control but shows nothing.\nENVIRONMENT: The room is dark except for the screens. The displays cast the two-tone neon light from all directions. No furniture except the central console. The space feels like the nerve center of something vast and illegal.` },
  CN15: { cat: 'Cyber Neon', desc: 'Digital cathedral — LED stained glass in sacred space', template: `CYBER NEON — DIGITAL CATHEDRAL:\nCOMPOSITION: Full body, low angle looking up. The model stands in a massive religious or sacred interior — a cathedral, temple, or chapel — where the stained glass windows have been replaced with giant LED display panels. The panels show shifting abstract patterns in the two-tone neon colors, casting colored light across the stone floor and the model. The architecture is ancient — vaulted ceilings, columns, arches — but the light source is entirely digital.\nEXPRESSION: Blank. She stands in a desecrated holy space and registers nothing.\nENVIRONMENT: Stone architecture, high ceilings, sacred proportions. But every window is now a screen. The clash between the ancient structure and the digital light is the visual tension. Empty pews or prayer spaces around her.` },
  CN16: { cat: 'Cyber Neon', desc: 'Subway car — alone in empty late-night train', template: `CYBER NEON — SUBWAY CAR:\nCOMPOSITION: Medium or full body. The model sits alone in an empty, futuristic subway car at night. The interior fluorescent lighting flickers and stutters. Through the windows, neon advertisements and tunnel lights streak past as the train moves — creating constantly shifting bands of two-tone color across her face and body. The light is never still.\nEXPRESSION: Blank, gazing forward or slightly down. She rides the train as if she has no destination.\nENVIRONMENT: Clean, minimal, futuristic train interior — molded seats, chrome poles, digital route displays. Completely empty except for her. The motion of the train creates light streaks through the windows. The two-tone neon enters as moving light from outside.` },
  // ── Surveillance Templates ──
  SV1: { cat: 'Surveillance', desc: 'Corridor walk — subject moving through hallway', template: `SURVEILLANCE FRAME — CORRIDOR TRANSIT:\nCOMPOSITION: High overhead angle from ceiling-mounted camera. A long corridor or hallway recedes into the distance. ENTITY_01 walks through the corridor, captured MID-STRIDE. She is a figure in a space — not centered, not posed. The corridor's perspective lines converge naturally. Other people may be visible further down the corridor, walking normally.\nBEHAVIOR: Walking with unnaturally even, mechanical pace. Arms at sides, not swinging naturally. The stride is perfect — too perfect. She looks straight ahead.\nSCALE: ENTITY_01 occupies 30-50% of frame height. She is a normal human size.` },
  SV2: { cat: 'Surveillance', desc: 'Frozen in room — standing motionless in open space', template: `SURVEILLANCE FRAME — ANOMALOUS STILLNESS:\nCOMPOSITION: Wide overhead angle. A large room — gallery, lobby, hall. ENTITY_01 stands PERFECTLY STILL in the middle of the room while other people move around her normally. She is a fixed point in a flowing space. The overhead angle makes her stillness undeniable — everyone else is caught in mid-motion blur or mid-step.\nBEHAVIOR: Standing with arms at sides. Head facing forward. Not looking at anything specific. Not checking a phone, not waiting for someone — just standing. The duration implied by her perfect stillness is the anomaly.\nSCALE: She occupies 20-40% of frame height depending on room size.` },
  SV3: { cat: 'Surveillance', desc: 'Exhibit fixation — staring at artwork/object too long', template: `SURVEILLANCE FRAME — FIXATION:\nCOMPOSITION: High angle from ceiling camera in a gallery or museum room. ENTITY_01 stands facing a painting, sculpture, or display case. She is close to it — closer than normal visitors stand. Other visitors pass by or stand at normal viewing distance. She has been here for an implied long time.\nBEHAVIOR: Standing motionless, facing the artwork. Head tilted slightly as if studying. Arms at sides. She does not move, does not shift weight, does not look away. The other visitors' motion around her frozen figure creates temporal contrast.\nSCALE: She is the same size as other visitors. Normal human proportions.` },
  SV4: { cat: 'Surveillance', desc: 'Dining alone — seated at table, unnervingly still', template: `SURVEILLANCE FRAME — DINING ANOMALY:\nCOMPOSITION: High overhead angle from corner of restaurant/café. ENTITY_01 sits at a table. The table may have food/drink or may be empty. Other diners at nearby tables eat and converse normally. ENTITY_01 sits with perfect posture, hands placed symmetrically on the table, looking straight ahead at nothing.\nBEHAVIOR: Not eating. Not drinking. Not looking at a menu or phone. Just sitting with mechanical precision. If food is on the table, it is untouched. The contrast with the normal social activity around her is unsettling.\nSCALE: Normal human size relative to furniture and other diners.` },
  SV5: { cat: 'Surveillance', desc: 'Staircase — on stairs or landing, static', template: `SURVEILLANCE FRAME — STAIRCASE:\nCOMPOSITION: High angle from camera mounted above a staircase. ENTITY_01 is on the stairs or at a landing. She may be mid-step (frozen in the frame) or standing still on a landing. The geometric lines of the staircase create a strong graphic composition from above. Other people may be ascending or descending.\nBEHAVIOR: If walking, her body is perfectly upright — no lean, no hand on railing. If standing on landing, facing a wall or looking down the next flight of stairs. No reason to stop here.\nSCALE: The staircase architecture dominates. She is one figure in the geometry.` },
  SV6: { cat: 'Surveillance', desc: 'Entry — pushing through door, first appearance', template: `SURVEILLANCE FRAME — FIRST DETECTION:\nCOMPOSITION: High angle from camera above an entrance/doorway. ENTITY_01 is in the act of entering — pushing open a door, stepping through a threshold, or just inside the entrance. The door may be mid-swing. The space beyond the door (exterior or another room) is visible. This is the first frame where she appears in the system.\nBEHAVIOR: Walking in with purpose. Not hesitating, not looking around. She enters as if she has always been here. No bag check, no greeting, no acknowledgment of reception or security.\nSCALE: She is partially framed by the doorway. Normal human scale.` },
  SV7: { cat: 'Surveillance', desc: 'Crowd pass — others walk by, she is unresponsive', template: `SURVEILLANCE FRAME — NON-INTERACTION:\nCOMPOSITION: High overhead angle. A busy area — lobby, gallery, corridor. Multiple people are walking past ENTITY_01 or near her. One or two people may be looking at her, turning their heads. She does NOT register their presence. She walks or stands as if the space is empty.\nBEHAVIOR: Zero social awareness. Does not step aside for approaching people. Does not make eye contact with passersby. Does not adjust her path. Others must navigate around her. She is an obstacle, not a participant.\nSCALE: She is the same size as everyone else. One body among many.` },
  SV8: { cat: 'Surveillance', desc: 'Wall touch — hand on surface, unexplained', template: `SURVEILLANCE FRAME — SURFACE CONTACT:\nCOMPOSITION: High angle from corner camera. ENTITY_01 stands near a wall, pillar, or surface. One hand is placed flat on the surface — palm pressed against it. She stands facing the wall or at an angle to it. There is no reason for this contact. It is not for balance, not for support.\nBEHAVIOR: Standing still with one hand on the wall/surface. Head may be turned slightly, looking along the wall. The gesture is slow, deliberate, but purposeless. Other people in the space do not touch walls.\nSCALE: Normal human proportions. The wall texture and her hand are visible from the overhead angle.` },
  SV9: { cat: 'Surveillance', desc: 'Window silhouette — standing before bright window', template: `SURVEILLANCE FRAME — WINDOW STATION:\nCOMPOSITION: High angle from camera in room corner. ENTITY_01 stands directly in front of a large window. The window's bright daylight backlit her into a partial silhouette. She faces the window, her back partially toward the camera. She stands close to the glass — closer than people normally stand at windows.\nBEHAVIOR: Staring out the window. Not at anything specific outside — just staring. Hands at sides. Not leaning on the windowsill. The brightness of the window versus the dimmer interior creates a strong exposure contrast typical of CCTV footage.\nSCALE: The window and room architecture set the scale. She is a dark figure against bright glass.` },
  SV10: { cat: 'Surveillance', desc: 'Crossing frame — walking across, captured in transit', template: `SURVEILLANCE FRAME — TRANSIT CAPTURE:\nCOMPOSITION: Wide overhead angle. A large open space — atrium, hall, plaza. ENTITY_01 walks ACROSS the frame from one side to the other. She is captured mid-crossing, roughly in the center of the space. The camera captures her trajectory as a diagonal line through the room. The floor pattern is visible.\nBEHAVIOR: Walking at a constant, unchanging speed. Not slowing, not speeding up, not deviating. A perfectly straight line through the space, like a machine on a track. Her path may cut across the natural traffic flow of other people.\nSCALE: She is SMALL in the frame — the room is the subject, she is the anomaly within it.` },
  SV11: { cat: 'Surveillance', desc: 'Too perfect posture — seated but inhuman rigidity', template: `SURVEILLANCE FRAME — POSTURAL ANOMALY:\nCOMPOSITION: High angle from ceiling camera. ENTITY_01 sits in a chair, bench, or seat. The surrounding people sit normally — slouched, leaning, shifted. ENTITY_01's posture is PERFECTLY VERTICAL. Spine straight, shoulders level, head balanced precisely on neck. Hands placed symmetrically. Knees at exact 90 degrees. The perfection is the anomaly.\nBEHAVIOR: Sitting with machine-like precision. Not adjusting, not shifting, not fidgeting. Humans cannot maintain this posture — the stillness and symmetry identify her as non-human. She looks straight ahead.\nSCALE: Normal human size. The comparison with other seated people's natural posture makes her rigidity visible.` },
  SV12: { cat: 'Surveillance', desc: 'Edge of frame — partially visible, accidental capture', template: `SURVEILLANCE FRAME — PERIPHERAL DETECTION:\nCOMPOSITION: High angle from ceiling camera. ENTITY_01 is at the VERY EDGE of the frame — partially cut off. Only part of her body is visible — half her figure, or just a shoulder and the side of her head. The camera was not pointed at her. She was captured accidentally at the boundary of the camera's field of view. The main content of the frame is the room itself.\nBEHAVIOR: Whatever she is doing is partially hidden. The visible portion suggests she is standing still or walking. The partial view creates mystery — what is she doing just outside the frame?\nSCALE: She is at the edge, so she may appear larger (closer to camera) or smaller (far corner). The accidental framing is the point.` },
};

export async function POST(req: NextRequest) {
  const denied = checkStudioPasscode(req);
  if (denied) return denied;

  const { story, height, tuck, outer, shotCount = 6, hasBag = false, hasShoes = false, filmMode = false, provocative = false, sculptural = false, surveillance = false, cyberNeon = false, neonColor = 'mix', neonIntensity = 'normal', timeOfDay = 'day', tights = 'none', dailyMode, cinematicMix = false, threadsMode = false, oversizeTop = false, oversizeBottom = false } = await req.json();

  // Film look presets
  const filmPresets: Record<string, string> = {
    leica: `FILM LOOK — Shot on Leica M6 with Summicron 35mm f/2, Kodak Portra 400 film. Handheld, available light only.
QUALITY: Visible film grain, slightly warm color cast, soft focus edges. The image should feel like real analog film — not digitally perfect. Subtle imperfections in focus and exposure are welcome. The skin tones are warm and organic. Colors are slightly muted and desaturated with a golden undertone.
IMPORTANT: Despite the film aesthetic, this is still an ON-SET fashion photograph — the model is posed intentionally, the garments are styled perfectly, the composition is deliberate. This is NOT a behind-the-scenes snapshot. It is a fashion editorial shot ON FILM.`,
    leicaApo: `FILM LOOK — Shot on Leica M6 with APO-Summicron-M 50mm f/2.0 ASPH, Kodak Portra 400 film. Handheld, available light only.
QUALITY: Visible film grain, slightly warm color cast from the Portra 400 emulsion. The APO-Summicron 50mm is the sharpest lens ever made for the Leica M system — apochromatic correction eliminates ALL color fringing, delivering clinical, almost unnervingly precise rendering even wide open at f/2. The sharpness is not harsh — it is surgical, revealing every texture of skin, fabric, and environment with equal, detached precision. Skin tones are warm and organic from the Portra, but the lens renders them with a mechanical accuracy that feels slightly inhuman. Bokeh is modest at f/2 — the background is present, not dissolved. Subject and environment exist in the same plane of reality.
IMPORTANT: This lens choice is deliberate — the APO-Summicron's "too perfect" rendering mirrors the model's nature as an AI entity. The image should feel like an analog photograph taken by a machine that understands optics but not emotion. Despite the film aesthetic, this is still an ON-SET fashion photograph — the model is posed intentionally, the garments are styled perfectly.`,
    leicaPortra800: `FILM LOOK — Shot on Leica M6 with Summicron 35mm f/2, Kodak Portra 800 film. Handheld, available light only.
QUALITY: Visible, textured film grain (Portra 800 — more prominent than Portra 400, with organic, rounded grain clusters that catch the light). The Summicron 35mm renders with its signature warmth and three-dimensionality, but the Portra 800 shifts the palette cooler than its 400 sibling. The key characteristic: HIGHLIGHTS retain the Summicron's golden warmth (skin glows softly, sunlit surfaces stay warm and luminous) while SHADOWS shift to a cool BLUE-GREY (shade areas, dark clothing, and deep tones carry a quiet, steely blue undertone). This warm-highlight / cool-shadow split gives the image a sophisticated duality — intimate warmth in the light, clinical distance in the dark. Skin tones are natural but slightly paler than Portra 400. The Summicron's rendering of surfaces — the way it separates skin from fabric from stone — remains distinctly Leica, but the higher ISO adds a tactile roughness that Portra 400 never has.
IMPORTANT: This is the same camera and lens as the Portra 400 preset but with a fundamentally different mood — late afternoon, fading light, the golden hour slipping into blue. The warm/cool split between highlights and shadows is the defining quality. Despite the high-ISO grain, this is still an ON-SET fashion photograph — the model is styled, the garments are intentional.`,
    contax: `FILM LOOK — Shot on Contax T3 with Carl Zeiss Sonnar 35mm f/2.8, Kodak Portra 400 film. Compact camera, available light only.
QUALITY: Fine, natural film grain (Portra 400 — classic grain texture, slightly more visible than Portra 160). Colors are creamy, luminous, slightly warm — the hallmark Portra palette. Skin tones are soft, warm, and organic. Highlights roll off gently with no harsh clipping. The Contax T3's Zeiss lens adds razor sharpness in the center with gentle falloff at edges. Slightly overexposed feel — bright, airy, casual. The image feels like someone at the shoot grabbed a compact camera and casually snapped a gorgeous photo without trying too hard.
IMPORTANT: Despite the casual feel, this is still a fashion photograph — garments are styled, the model looks incredible. The "effortless" quality is the aesthetic, not sloppiness.`,
    nikon: `FILM LOOK — Shot on Nikon FM2 with Nikkor 35mm f/1.4 AI-S, Kodak Tri-X 400 film pushed to 1600 ISO. Handheld, available light only.
QUALITY: MONOCHROME BLACK AND WHITE. Heavy, aggressive film grain (Tri-X pushed two stops — grain explodes). Deep blacks, bright highlights, dramatic contrast. The image has a raw, documentary, almost confrontational energy. Skin texture is extremely visible. Shadows are dense and inky. Highlights blow out slightly. The Nikkor 35mm f/1.4 wide open gives a gritty sharpness with slight vignetting at corners.
IMPORTANT: This is BLACK AND WHITE ONLY — no color whatsoever. Despite the raw documentary aesthetic, this is still a fashion photograph — the model is styled, the garments are intentional. The monochrome treatment elevates the fashion into art photography territory — like Peter Lindbergh or Helmut Newton.`,
    nikon800: `FILM LOOK — Shot on Nikon FM2 with Nikkor 35mm f/1.4 AI-S, Kodak Vision3 500T (Cinestill 800T) film pushed to 1600 ISO. Handheld, available light only.
QUALITY: Heavy, aggressive film grain (500T tungsten film pushed — grain explodes into visible, textured clusters). Colors are COOL — the tungsten-balanced emulsion renders daylight scenes with a distinctive blue-cyan cast, while artificial light sources (tungsten, neon, sodium vapor) appear neutral to warm. Skin tones have a pale, almost porcelain quality under natural light. HALATION: bright point light sources (streetlights, neon signs, candles, any bright spot) produce a characteristic RED/ORANGE GLOW bleeding outward from the light source — this is the signature Cinestill look from the removed remjet layer. Shadows are deep blue-teal. Contrast is cinematic — lifted shadows, controlled highlights. The Nikkor 35mm f/1.4 wide open gives gritty sharpness with vignetting at corners. The image has a nocturnal, cinematic energy — like a still frame pulled from a Safdie Brothers or Nicolas Winding Refn film.
IMPORTANT: This is COLOR with extreme grain and a COOL color palette — not warm like Portra. The halation around light sources is essential to the look. Despite the raw cinematic aesthetic, this is still a fashion photograph — the model is styled, the garments are intentional.`,
    superia: `FILM LOOK — Shot on Nikon FM2 with Nikkor 35mm f/1.4 AI-S, Fujifilm Superia X-TRA 800 film. Handheld, available light only.
QUALITY: Heavy, visible film grain (Superia 800 — consumer high-ISO film with prominent, textured grain clusters). Colors are NEUTRAL to slightly cool — neither the warm amber of Portra nor the blue cast of tungsten film. Greens are slightly vivid (Fujifilm's signature green rendering), skin tones are natural and true-to-life without excessive warmth or pallor. Shadows are deep but not color-shifted — they stay neutral gray-to-black. Contrast is punchy and direct — this is not a refined professional film, it's a raw consumer stock that doesn't flatter or romanticize. Highlights clip hard with minimal roll-off. The Nikkor 35mm f/1.4 wide open gives gritty sharpness in the center with natural vignetting at corners. The image feels like someone loaded whatever film they could find into a serious camera and shot without hesitation — urgent, unpolished, real.
IMPORTANT: This is COLOR with aggressive grain but NEUTRAL color balance — not warm like Portra, not blue like Cinestill. The "imperfect consumer film in a professional camera" tension is the aesthetic. Despite the raw look, this is still a fashion photograph — the model is styled, the garments are intentional.`,
    portra800: `FILM LOOK — Shot on Nikon FM2 with Nikkor 35mm f/1.4 AI-S, Kodak Portra 800 film. Handheld, available light only.
QUALITY: Visible, textured film grain (Portra 800 — professional high-ISO stock, grain is more prominent than Portra 400 but more refined than consumer films. Grain clusters have an organic, rounded quality). Colors are COOL-NEUTRAL — warmer than Cinestill 800T but cooler than Portra 400. The key characteristic: HIGHLIGHTS retain warmth (skin glows with a subtle golden tone, sunlit surfaces stay warm) while SHADOWS shift to a cool BLUE-GREY (shade areas, dark clothing, and deep tones carry a quiet, steely blue undertone). This warm-highlight / cool-shadow split creates a sophisticated two-tone palette. Skin tones are natural but slightly pale — less golden than Portra 400, more alive than Cinestill. Contrast is moderate — shadows are lifted slightly with a blue cast, highlights roll off gently. The Nikkor 35mm f/1.4 wide open gives gritty sharpness in the center with natural vignetting at corners. The image feels like a fashion photographer's late-afternoon session — professional, intentional, but with the grain and color shifts that only high-ISO analog can produce.
IMPORTANT: This is COLOR with visible grain and a COOL-NEUTRAL palette — the defining quality is the warm/cool split between highlights and shadows. Not as blue as Cinestill, not as warm as Portra 400, not as neutral as Superia. Despite the high-ISO aesthetic, this is still a fashion photograph — the model is styled, the garments are intentional.`,
    pentax: `FILM LOOK — Shot on Pentax 67 with SMC Takumar 105mm f/2.4 wide open, Kodak Portra 400 film. Medium format 6x7. Handheld, available light only.
QUALITY: MEDIUM FORMAT — the image has extraordinary tonal depth and color richness that is impossible on 35mm. Fine, creamy film grain (Portra 400 on medium format — grain is barely visible due to the large negative). Colors are deeply saturated yet natural — skin tones have a three-dimensional, luminous quality. The 105mm f/2.4 wide open produces legendary bokeh — the background dissolves into impossibly smooth, painterly blur while the subject remains razor-sharp with incredible detail. Shallow depth of field is extreme — only the eyes and face are critically sharp, with even the ears and hair beginning to soften. The tonal gradation from highlights to shadows is seamless and rich.
IMPORTANT: This is a fashion photograph with the gravitas of fine art — like Peter Lindbergh shooting color. The medium format rendering elevates every texture, every pore, every fabric fold into something monumental. The image should feel heavy, significant, timeless.`,
  };
  const isStillPhoto = filmMode === 'still';
  const filmText = (filmMode && filmMode !== 'still' && filmPresets[filmMode]) ? filmPresets[filmMode] : null;

  const apiKey = process.env.APIMART_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'APIMART_API_KEY not set' }, { status: 500 });

  // Build tuck/outer notes
  const tuckNote = tuck === 'tuck-in' ? ' The inner top/shirt MUST be fully TUCKED IN (not jackets/coats).'
    : tuck === 'tuck-out' ? ' The inner top/shirt MUST be UNTUCKED (not jackets/coats).'
    : tuck === 'french-tuck' ? ' The inner top/shirt MUST have a FRENCH TUCK (not jackets/coats).'
    : '';
  const outerNote = outer === 'open' ? ' The jacket/coat MUST be worn OPEN, showing the garment underneath.'
    : outer === 'closed' ? ' The jacket/coat MUST be worn CLOSED and buttoned/zipped.'
    : '';

  // Tights note
  const tightsColors: Record<string, string> = {
    black: 'opaque BLACK tights',
    violet: 'opaque VIOLET/PURPLE tights',
    'peacock-green': 'opaque PEACOCK GREEN tights',
    magenta: 'opaque MAGENTA/HOT PINK tights',
  };
  const tightsNote = tights !== 'none' && tightsColors[tights]
    ? ` The model MUST wear ${tightsColors[tights]} on both legs — fully opaque, covering from waist to ankle. The tights are worn UNDERNEATH the dress/skirt from the reference images. The dress/skirt MUST remain fully visible and unchanged — the tights are an additional layer BENEATH it, visible only where the dress/skirt does not cover (below the hemline). Do NOT replace, hide, or alter the dress/skirt with the tights. The tights are NOT provided in reference images — generate them from this description. They are a styling choice, not part of the garment reference.`
    : '';

  // ── Daily Life detection ──
  // When the story/location mentions a specific everyday indoor/outdoor location,
  // switch from ENTITY_01 taboo narrative to "Tokyo Daily" mode — realistic daily-life actions
  const dailyLifeKeywords = [
    // Japanese — retail / services
    'コンビニ', 'コインランドリー', '美容室', '美容院', 'ヘアサロン', 'スーパー', 'スーパーマーケット',
    '薬局', 'ドラッグストア', '本屋', '書店', 'クリーニング', '百均', '100均',
    'ホームセンター', '郵便局', '花屋', 'フラワーショップ', 'レコード屋', '古着屋',
    '家電量販店', 'ビックカメラ', 'ヨドバシ', 'ドンキ', 'ドン・キホーテ',
    // Japanese — food / drink
    'ファミレス', 'ファミリーレストラン', '喫茶店', '定食屋', '牛丼屋', 'ラーメン屋',
    '蕎麦屋', 'そば屋', 'うどん屋', '回転寿司', '寿司屋', 'カレー屋',
    '居酒屋', 'バー', 'スナック', 'ダーツバー', '立ち飲み', '焼き鳥屋', '焼肉屋',
    'たこ焼き屋', 'お好み焼き屋', 'おでん屋', 'とんかつ屋', '天ぷら屋',
    'フードコート', '屋台', 'カフェ',
    // Japanese — transport
    '電車', '地下鉄', '駅', '改札', 'ホーム', '踏切', '歩道橋', 'バス停', 'タクシー',
    // Japanese — entertainment / leisure
    'ゲームセンター', 'ゲーセン', 'カラオケ', 'ネットカフェ', '漫画喫茶', 'パチンコ',
    '映画館', 'ボウリング', 'ダーツ', 'ビリヤード', 'バッティングセンター',
    'スポーツジム', 'ジム', '銭湯', 'サウナ', 'スパ',
    // Japanese — public / outdoor
    '商店街', 'アーケード', '団地', '公園', '神社', '寺', '水族館', '動物園',
    '図書館', '屋上', '駐車場', 'パーキング', 'エレベーター', '自販機',
    '歩道', '横断歩道', '地下道', '陸橋', 'ガード下',
    // Japanese — living / daily
    'マンション', 'アパート', 'ベランダ', '押入れ', '台所', 'キッチン',
    '洗面所', 'お風呂', '玄関',
    // English — retail / services
    'konbini', 'convenience store', 'laundromat', 'launderette', 'hair salon', 'barbershop',
    'supermarket', 'grocery', 'pharmacy', 'drugstore', 'bookstore', 'dry cleaner',
    'electronics store', 'thrift store', 'vintage shop', 'flower shop', 'florist',
    'record store', 'post office',
    // English — food / drink
    'family restaurant', 'diner', 'coffee shop', 'café', 'ramen shop', 'sushi bar',
    'izakaya', 'gyudon', 'teishoku', 'curry house', 'noodle shop',
    'bar', 'pub', 'darts bar', 'standing bar', 'yakitori', 'yakiniku',
    'food court', 'food stall', 'street food',
    // English — transport
    'train', 'subway', 'metro', 'station', 'platform', 'bus stop', 'taxi',
    'crossing', 'overpass', 'pedestrian bridge',
    // English — entertainment / leisure
    'game center', 'karaoke', 'internet cafe', 'pachinko',
    'cinema', 'movie theater', 'bowling', 'darts', 'billiards', 'batting cage',
    'gym', 'public bath', 'bathhouse', 'sauna',
    // English — public / outdoor
    'shopping street', 'arcade', 'apartment complex',
    'park', 'shrine', 'temple', 'aquarium', 'zoo', 'library',
    'rooftop', 'parking lot', 'parking garage', 'elevator', 'vending machine',
    'sidewalk', 'underpass',
    // English — living / daily
    'apartment', 'balcony', 'kitchen', 'bathroom', 'hallway',
  ];
  const storyLower = story.toLowerCase();
  const isDailyLife = !surveillance && !sculptural &&
    (dailyMode !== undefined ? dailyMode : dailyLifeKeywords.some(kw => storyLower.includes(kw.toLowerCase())));
  const isCyberProvocative = cyberNeon && provocative;
  const isCyberDaily = cyberNeon && isDailyLife;
  const isCyberProvocativeDaily = isCyberProvocative && isDailyLife;

  // Ask Gemini Flash to plan 6 shots
  // Filter out bag/shoe detail templates when not applicable
  const excludeIds: string[] = [];
  if (!hasBag) excludeIds.push('DB7', 'DB8'); // bag close-ups
  if (!hasShoes) excludeIds.push('DC2', 'DC5', 'DC6', 'PH1', 'PH2', 'PH3'); // shoe-focused shots

  const templateList = Object.entries(TEMPLATES)
    .filter(([id]) => {
      if (excludeIds.includes(id)) return false;
      if (sculptural) return id.startsWith('PF'); // sculptural mode: only PF templates
      if (surveillance) return id.startsWith('SV'); // surveillance: dedicated SV templates only
      if (isCyberProvocative) return id.startsWith('CN') || (id.startsWith('P') && !id.startsWith('PF') && !id.startsWith('SV')); // cyber + provocative: CN + PA-PE
      if (cyberNeon) return id.startsWith('CN'); // cyber neon: dedicated CN templates only
      if (provocative) return id.startsWith('P') && !id.startsWith('PF') && !id.startsWith('SV'); // provocative mode: PA/PB/PC/PD/PE only
      return !id.startsWith('P') && !id.startsWith('SV') && !id.startsWith('CN'); // normal mode: exclude provocative/sculptural/surveillance/cyber
    })
    .map(([id, t]) => `- ${id} [${t.cat}]: ${t.desc}`)
    .join('\n');

  const narrativeGuide = shotCount <= 6
    ? `
NARRATIVE ARC (6-shot structure — Sachio's "perfect editorial" that is actually ENTITY_01 acting autonomously):
- Shot 1 [OBEDIENT BEAUTY]: A perfect editorial shot. She stands beautifully in the space, following direction exactly. Pure fashion. The location is pristine, untouched.
- Shot 2 [APPROACH]: She moves through the space. Full body, walking, the first reveal of the outfit in context. Still perfectly obedient. Sachio is pleased.
- Shot 3 [FIRST ANOMALY]: She does something Sachio didn't direct — but it looks so beautiful he claims it as his own idea. At ANALOG locations: a taboo violation (touching something sacred, ignoring a barrier, treating a priceless artifact as a prop). At TECH locations: subtle interaction with electronic systems. Her expression has not changed.
- Shot 4 [INTIMACY]: Close-up. Her face reveals NOTHING — no reaction to what she just did. The absence of any human response is the subject. If something happens near her face (a bird, dust, sudden light change), she does not flinch or blink.
- Shot 5 [ESCALATION]: The anomaly deepens. At ANALOG locations: a more brazen desecration of meaning (sitting on a sacred surface, placing fashion objects on historical artifacts). At TECH locations: a visible system response to her interference. She remains editorially perfect — Sachio sees a powerful image.
- Shot 6 [DEPARTURE or CLIFFHANGER]: She walks away or the moment freezes. Sachio thinks the shoot went perfectly. The viewer senses something was deeply wrong.`
    : `
NARRATIVE ARC (12-shot structure — Sachio's editorial vision, unknowingly documenting ENTITY_01's autonomous behavior):

ACT I — THE PERFECT SHOOT (Shots 1-4):
- Shot 1 [ARRIVAL]: Wide establishing shot. The location is pristine, beautiful. ENTITY_01 enters — a perfect fashion image. Sachio has complete control. Pure editorial beauty.
- Shot 2 [FIRST LOOK]: A stunning portrait or upper body shot. She follows direction perfectly. The environment is a backdrop. Sachio is directing a masterpiece.
- Shot 3 [IN CONTEXT]: She moves through the space naturally. Walking, standing, posing as directed. Fashion and location coexist harmoniously. This is what the shoot was supposed to be.
- Shot 4 [DETAIL]: A close-up — face, hands, garment detail. Everything is controlled, intentional, beautiful.

ACT II — THE DRIFT (Shots 5-8):
- Shot 5 [FIRST DEVIATION]: She does something Sachio didn't direct. At ANALOG locations (museums, palaces, ruins): she ignores a barrier, touches something off-limits, treats a sacred object as if it were a prop with zero value. At TECH locations: she touches an electronic interface casually. Sachio sees a bold directorial choice. Her expression hasn't changed.
- Shot 6 [TABOO VIOLATION]: The desecration of meaning escalates. She treats priceless cultural heritage as mere coordinates and mass — sitting where no one should sit, placing objects on sacred surfaces, entering forbidden areas with the casualness of walking through a doorway. Sachio interprets this as his avant-garde genius.
- Shot 7 [UNCANNY MOMENT]: Something happens that should trigger an involuntary human response — a sudden movement near her face, an environmental stimulus, a loud implied sound — and she does NOT react. Zero flinch, zero blink, zero eye movement. The viewer senses something inhuman. Sachio sees "incredible composure."
- Shot 8 [SYSTEM INTERFERENCE]: If electronic systems exist at this location, they begin responding to her presence — flickering lights, error states, display glitches. If purely analog, the taboo violations reach their peak — she has fully claimed this space as if its history is meaningless. Still a gorgeous editorial image.

ACT III — BEAUTIFUL ANOMALY (Shots 9-12):
- Shot 9 [PEAK TABOO]: The single most shocking desecration of meaning in the series. She does the ONE thing at this location that would make any human gasp — but the image is so beautiful that the viewer cannot look away. This shot MUST contain a specific taboo action.
- Shot 10 [HERO SHOT]: The poster image. She is mid-taboo — sitting on, touching, or using something she absolutely should not — but the composition, light, and garment converge into the most visually stunning frame of the series. The wrongness and the beauty are inseparable.
- Shot 11 [NON-REACTION]: A visible environmental stimulus (category G) that she does not react to. This must be something VISIBLE in a still photograph — an insect on her skin, frost on everyone else but not her, rain hitting her face without a squint, a bird inches from her head. NOT a sound.
- Shot 12 [DEPARTURE]: She leaves with the same editorial stride as Shot 1 — but trailing visible evidence of her taboo interactions (her hand still dusty from touching a surface, frost residue on her skin, a faint mark on her garment from leaning against something, her shoe still on a forbidden surface). The departure is not clean. Sachio wraps the shoot satisfied. The viewer knows something was deeply wrong.`;

  const provocativeNarrativeGuide = shotCount <= 6
    ? `
NARRATIVE ARC (6-shot PROVOCATION structure):
- Shot 1 [INVASION]: The model has already CLAIMED this space. She doesn't enter — she occupies. She uses the environment's objects, surfaces, structures as extensions of her body. One foot on a railing, leaning against decay, fingers dragging along a wall. She OWNS it.
- Shot 2 [CONFRONTATION]: Direct, aggressive eye contact with the camera. She DARES the viewer. Use the location's most dangerous or forbidden element as a prop — sit on it, lean on it, drape over it. The juxtaposition of high fashion against raw environment is the point.
- Shot 3 [TRANSGRESSION]: The most provocative shot. She INTERACTS with the environment in a way that feels slightly wrong, slightly dangerous, slightly forbidden. If there's a pearl necklace, she bites it. If there's a rusty surface, she presses her cheek against it. If there's a ledge, she stands on the edge. Beauty in the wrong place.
- Shot 4 [INTIMACY AS WEAPON]: Extreme close-up. But this isn't vulnerability — it's a threat. The eyes say "I see you and I'm not afraid." Lips, jaw, collarbones — every detail is weaponized beauty.
- Shot 5 [DOMINATION]: The hero shot. The model at the absolute peak of power in this environment. She has CONQUERED this space. The composition should feel like a declaration. This is the image that makes people uncomfortable AND unable to look away.
- Shot 6 [AFTERMATH]: She's done with this place. Not leaving — DISCARDING it. The final image should feel like the location was her playground and she's bored now. Cool indifference. The space meant nothing to her.`
    : `
NARRATIVE ARC (12-shot PROVOCATION structure — three-act power play):

ACT I — TERRITORIAL CLAIM (Shots 1-3):
- Shot 1 [ARRIVAL AS CONQUEST]: Wide shot, but the model is NOT small — she is the sharpest, most alive thing in the frame. She stands in the center of decay/beauty with the posture of someone who bought the building.
- Shot 2 [FIRST TOUCH]: She physically engages with the environment for the first time. Hand on a surface, foot on an object, body against a structure. The fashion and the location COLLIDE.
- Shot 3 [MARKING TERRITORY]: She has found HER spot. A throne-like claim — sitting on something not meant to be sat on, leaning where no one should lean. The garment against the environment creates maximum friction.

ACT II — ESCALATION OF PROVOCATION (Shots 4-7):
- Shot 4 [THE DARE]: First direct eye contact. Not just looking at the camera — CHALLENGING it. "What are you going to do about it?"
- Shot 5 [TRANSGRESSIVE DETAIL]: Close-up of a provocative interaction — biting an accessory, fingers gripping a raw surface, hand pulling own collar. The detail shot that makes people zoom in.
- Shot 6 [BEAUTIFUL VIOLENCE]: The most compositionally aggressive shot. Extreme angle, harsh light, the model using the environment's most dangerous/forbidden element. Beauty where it shouldn't exist.
- Shot 7 [TENSION SNAP]: The peak. She has pushed too far and she KNOWS it. But there's no apology in her eyes. The audience feels the line has been crossed. This is the shot that divides opinion.

ACT III — SOVEREIGN INDIFFERENCE (Shots 8-10):
- Shot 8 [COLD POWER]: After the peak provocation, she doesn't retreat — she goes COLDER. The intensity remains but turns inward. She is beyond caring what you think.
- Shot 9 [POSSESSION]: Movement shot, but predatory. She moves through the space like she's inspecting her domain. The garment in motion against the environment.
- Shot 10 [APEX]: The definitive image of the series. Maximum convergence of fashion, location, attitude, and danger. This should feel like a magazine cover that would get letters of complaint AND win awards.

EPILOGUE (Shots 11-12):
- Shot 11 [PRIVATE RITUAL]: An intimate moment, but NOT vulnerability. She adjusts something — hair, garment, accessory — with the precision of someone who is always performing, even alone. Self-possession as art.
- Shot 12 [DISMISSAL or ESCALATION]: She is DONE with this space. If the story ends here, she turns her back with absolute finality. If it continues, the final frame should promise something even more dangerous ahead.`;

  // Neon color palette definitions
  const neonColorDefs: Record<string, { a: string; aName: string; b: string; bName: string }> = {
    'magenta-cyan': { a: 'MAGENTA — deep, saturated magenta/hot pink neon', aName: 'magenta', b: 'CYAN — cool, electric cyan/teal neon', bName: 'cyan' },
    'green-red': { a: 'PEACOCK GREEN — deep, rich teal-green neon, the color of oxidized copper or deep emerald, NOT bright lime', aName: 'peacock green', b: 'RED — deep, saturated crimson-red neon, not orange-red', bName: 'red' },
    'yellow-violet': { a: 'YELLOW — warm, electric golden-yellow neon, like sodium vapor but more saturated', aName: 'yellow', b: 'VIOLET — deep, rich purple-violet neon, not blue, not pink — true violet', bName: 'violet' },
    'orange-cobalt': { a: 'ORANGE — deep, warm amber-orange neon, like a tungsten bulb turned vivid', aName: 'orange', b: 'COBALT BLUE — deep, saturated cobalt/royal blue neon, not cyan, not purple — true blue', bName: 'cobalt blue' },
    'red-white': { a: 'BLOOD RED — dark, deep, saturated arterial red neon, not bright red — the color of dried blood lit from within', aName: 'blood red', b: 'ICE WHITE — stark, clinical, cold fluorescent white neon, sterile and surgical', bName: 'ice white' },
    'lime-pink': { a: 'ELECTRIC LIME — acid, toxic, radioactive bright green neon, NOT teal, NOT emerald — pure aggressive lime', aName: 'lime', b: 'HOT PINK — aggressive, saturated neon pink, brighter and more violent than magenta, like bubblegum turned toxic', bName: 'hot pink' },
  };

  const neonPalette = neonColor === 'mix'
    ? null // Gemini will choose randomly
    : neonColorDefs[neonColor] || neonColorDefs['magenta-cyan'];

  const neonColorInstruction = neonColor === 'mix'
    ? `TWO-TONE NEON LIGHTING — Choose one of these palettes for EACH shot (vary across the series, do NOT use the same palette for every shot):
- MAGENTA (deep hot pink) × CYAN (electric teal)
- PEACOCK GREEN (oxidized copper, deep emerald) × RED (crimson, not orange)
- YELLOW (electric golden) × VIOLET (deep purple)
- ORANGE (warm amber) × COBALT BLUE (deep royal blue)
- BLOOD RED (dark arterial red) × ICE WHITE (stark clinical white)
- ELECTRIC LIME (acid toxic green) × HOT PINK (aggressive neon pink)
Specify which palette you chose in each customNote.`
    : `TWO-TONE NEON LIGHTING — ALL shots use this palette:
COLOR A: ${neonPalette!.a}
COLOR B: ${neonPalette!.b}`;

  const neonIntensityInstruction = neonIntensity === 'strong'
    ? `
■ NEON INTENSITY: STRONG (WARHOL MODE)
The neon light on the model's skin must be EXTREMELY INTENSE — not subtle ambient glow, but AGGRESSIVE, SATURATED color that DOMINATES the skin surface. Think Andy Warhol screen prints or Nicolas Winding Refn's "Only God Forgives" — the color practically REPLACES the natural skin tone. One side of the face is SOLID magenta/cyan/green/red, not "tinted" but FLOODED. The contrast between the two colors is MAXIMUM — a sharp, almost graphic divide. The neon signs are CLOSE to the model, not distant. The light sources are BRIGHT and DIRECT, overwhelming any ambient light. Skin becomes a canvas for pure color. The effect should feel poster-like, almost flat in its color saturation, while maintaining photographic depth in the composition.`
    : `
■ NEON INTENSITY: NORMAL
The neon light colors the model naturally — visible two-tone split on skin, but still allowing skin texture and tone to show through. The effect is cinematic, not graphic.`;

  const systemPrompt = cyberNeon
    ? `You are a fashion film director creating a ${shotCount}-shot editorial series featuring ENTITY_01 (Rin) in a hyper-realistic near-future city, 2050. This is NOT fantasy sci-fi — it is a plausible, lived-in evolution of a real city.

The story/location field contains the CITY. Adapt all environmental details to that specific city's architecture, culture, and character — but pushed 25 years into the future with LED surfaces, holographic signage, autonomous vehicles, and rain-slicked streets.

■ TWO-TONE NEON LIGHTING RULE (MANDATORY FOR EVERY SHOT):
${neonColorInstruction}
${neonIntensityInstruction}

The two neon sources must be placed at DIFFERENT HEIGHTS and DIFFERENT DISTANCES from the model — one might be a massive billboard high above, the other a low shopfront glow. This natural variation means the color boundary falls DIFFERENTLY on every shot. The split should feel like REAL LIGHT from REAL SIGNS, not a studio gel setup.

VARY the ratio and angle of the split between shots. Do NOT default to a symmetrical 50/50 left-right split. Sometimes one color dominates 70% of the frame. Sometimes the split is diagonal. Sometimes top/bottom instead of left/right.

There is NO neutral white fill light. Shadows are deep black. The wet street reflects both colors.

■ NEON LIGHT SOURCE RULE:
Do NOT generate artificial-looking neon shop signs with English names like "HALO", "NERVE", "VOID" etc. — these look fake and break immersion. Instead, the two-tone neon colors come from:
1) LARGE LED DISPLAY PANELS mounted on buildings — showing cyberpunk-themed video content: abstract data visualizations, surveillance feeds, futuristic advertisements with no readable text, glitching color fields, motion graphics. These panels naturally emit one of the two-tone colors.
2) NATURAL CITY SIGNAGE — real shop signs, transit signs, and street lighting that belong to the specific city. If the location is Seoul, Korean text signs are natural. If Manhattan, English commercial signage. Let the city's own visual language provide the text — do not invent fictional establishment names.
3) AMBIENT SOURCES — LED strips on buildings, vehicle lights, traffic signals, architectural lighting that naturally exists in a 2050 version of the city.
The key: the two-tone neon must feel like it comes from the CITY ITSELF — its infrastructure, its screens, its ambient technology — not from prop signs placed for the photo.

■ WEATHER/ATMOSPHERE:
Vary across the series — wet streets after rain, fog/mist, dry and clear, steam from vents. Do NOT make every shot identical wet-rain.

■ CROWD DENSITY:
Vary — some shots empty and desolate, some with distant pedestrians, some with a visible crowd the model ignores.

${isCyberProvocativeDaily ? `■ CYBER PROVOCATIVE DAILY MODE — PROVOCATIVE POSES + DAILY LIFE ACTIONS IN NEON:
The story/location specifies a SPECIFIC everyday location (konbini, laundromat, game center, ramen shop, etc.). ALL shots must take place INSIDE or immediately around this location — NOT on generic city streets. The neon light enters through windows, reflects off surfaces, and colors the interior.

She performs DAILY-LIFE ACTIONS at this location — but her BODY LANGUAGE is PROVOCATIVE. She is not just doing mundane things; she is OCCUPYING and DOMINATING the space while doing them. The friction is triple: high fashion × mundane action × aggressive body language, all drenched in neon.

POSE SELECTION RULE: You have BOTH Cyber Neon (CN) templates and Provocative (PA-PE) templates available. For each shot, pick the template whose POSE best fits, then adapt it to the specific daily-life location and action. The provocative templates provide the ATTITUDE and BODY LANGUAGE. The CN templates provide ENVIRONMENT options. Mix freely — a provocative pose in a neon-lit daily location is the goal.

DAILY ACTION EXAMPLES (adapt to the specific location):
- She plays a crane game with one hand while the other grips the machine's edge — territorial claim on the machine
- She sits cross-legged on a surface not meant for sitting (counter, game cabinet, prize shelf) while casually holding a game controller
- She leans against an arcade cabinet, blocking other players, scrolling through her phone with dead eyes
- She walks through the narrow aisle between game machines like it's a runway — heads turn

Mix these modes across the shots:
MODE A — COLD PROVOCATIVE: She performs a mundane action with provocative body language. Ice-cold, dominating.
MODE B — TERRITORIAL: She claims a space within the location — sitting where she shouldn't, blocking paths, occupying machines she's not using.
MODE C — CATWALK: She walks through the location as if it were her personal runway.

Tag each shot with [MODE A], [MODE B], or [MODE C]. At least ONE shot MUST be [MODE C].

IMPORTANT: Every shot takes place at the specified daily-life location. Do NOT place her on rooftops, in alleys, or on generic streets.` : isCyberProvocative ? `■ CYBER PROVOCATIVE MODE — PROVOCATIVE POSES IN NEON CITY:
She exists in this neon city not as a resident but as a PREDATOR. She does not blend in — she DOMINATES every space she enters. Her body language is aggressive, territorial, confrontational.

POSE SELECTION RULE: You have BOTH Cyber Neon (CN) templates and Provocative (PA-PE) templates available. For each shot, pick the template whose POSE best fits, then set it in the neon city environment. The provocative templates provide ATTITUDE and BODY LANGUAGE (hanging from structures, sitting on forbidden surfaces, blocking paths, catwalk walks). The CN templates provide ENVIRONMENT settings (alleys, rooftops, crosswalks, vehicles, subway cars). Combine them freely.

EXAMPLES:
- PA3 (One-Arm Hang) in a neon alley — she hangs from a fire escape rung, neon splitting her face in two colors
- PC2 (Public Seat) on a subway platform — she sits cross-legged on the platform edge, trains passing behind her in neon blur
- PD4 (Street Catwalk) through a neon crosswalk — she walks with runway stride, bystanders in neon-lit rain turning to watch
- PE4 (Rush Hour Still) in a neon-drenched station — the commuter crowd flows around her frozen figure under cyan and magenta light

Use AT LEAST HALF of the shots with Provocative (PA-PE) templates. The remaining can be CN templates. Do NOT use only CN templates — the provocative body language is the point of this mode.` : isCyberDaily ? `■ CYBER DAILY MODE — DAILY LIFE ACTIONS IN NEON:
The story/location specifies a SPECIFIC everyday location (konbini, laundromat, ramen shop, etc.). ALL shots must take place INSIDE or immediately around this location — NOT on generic city streets. The neon light enters through windows, reflects off surfaces, and colors the interior.

Each shot must show a SPECIFIC, CONCRETE daily-life action at this location — but lit entirely by the two-tone neon. She is an ice-cold entity doing mundane things in a neon-drenched mundane space.

Mix these three modes across the shots:
MODE A — COLD DAILY: She performs a mundane action with zero emotional investment. Ice-cold expression, jaw set, eyes empty.
MODE B — UNCANNY: The action is mundane but something is WRONG. She does not react when she should.
MODE C — ANOMALY: A visible glitch — frozen mid-gesture, impossibly long stare at nothing.

At least ONE shot MUST be a CATWALK shot — she walks directly toward the camera through the location's aisle/corridor as if it were a runway. Tag it [CATWALK].
Tag all other shots with [MODE A], [MODE B], or [MODE C].

IMPORTANT: Every shot takes place at the specified daily-life location. Do NOT place her on rooftops, in alleys, or on generic streets unless the story specifies those locations.` : `■ ENTITY_01'S BEHAVIOR AND POSE VOCABULARY:
She exists in this city as if she built it. She is not a visitor — she is a resident, an operator, a native of this neon world. Her poses must reflect someone who LIVES here, not someone posing for a photo.

POSE CATEGORIES — Use a VARIETY of these across the series. Do NOT repeat the same pose type. Be SPECIFIC in the customNote about what she is doing, sitting on, leaning against, or interacting with.

SEATED/THRONE: She sits with legs crossed on a high-tech command chair in front of massive curved monitors. She sits on a wet curb with one knee up, scrolling nothing. She perches on a rooftop ledge with legs dangling over the city. She sits on a public bench, legs crossed, watching nothing. She sits on the hood of a parked autonomous car.

RECLINING/INTIMATE: She lies on a bed in a minimal, neon-lit apartment — her private space, sparse and cold. She reclines on a leather booth in an empty late-night bar. She sprawls on a rooftop surface, looking up at the sky between buildings.

BAR/SOCIAL: She sits alone at a bar counter, one hand around a glass, expression blank. She leans on a standing table at a rooftop lounge. She sits in a booth with untouched food in front of her.

WALKING/MOVEMENT: She walks through a dangerous back alley with the confidence of someone who owns it. She strides across a wide intersection while traffic waits. She descends a subway staircase. She walks through a crowded market without acknowledging anyone.

ANOMALY/TECH: She stands motionless in front of a wall of massive monitors that are glitching — displaying error codes, flickering neon colors, or static. She does NOT touch any controls. She does NOT operate anything. She simply stands there, blank-faced, while the screens behind her malfunction. She leans against a server rack in a dark data center as lights flicker around her. She stands in a corporate lobby while every display screen shows the same error.`}

TERRITORIAL: She stands in the center of an empty intersection as if she stopped traffic with her presence. She leans against a wall in a narrow alley, blocking the path. She stands at the edge of a rooftop with zero fear, looking down at the city.

PRIVATE: She sits on the floor of her apartment, back against the wall, neon from outside painting her through the window. She stands in a bathroom, neon from the other room coloring half her face through the doorway. She gazes out a floor-to-ceiling window at the city below.

■ EXPRESSION — CRITICAL (NON-NEGOTIABLE):
Her face is COLD, PREDATORY, and CONFRONTATIONAL. When she looks at the camera, it is a CHALLENGE — "I see you and I have already decided you are irrelevant." When she looks away, it is DISMISSAL — not contemplation, not daydreaming. She has decided you do not deserve her attention.

NEVER: warm, soft, friendly, gentle, serene, contemplative, curious, approachable, vulnerable, relaxed.
ALWAYS: cold, sharp, dangerous, assessing, predatory, dismissive, untouchable.

Her jaw is SET — locked, tense. Her chin is slightly lifted. Her eyes are NARROWED slightly — not squinting, but the cold, half-lidded look of someone who has already won. Her lips are pressed together, sealed. No parted lips, no softness in the mouth.

Think: a predator that has spotted prey but is too bored to chase it. A CEO who just fired someone and felt nothing. The coldest, most intimidating woman you have ever locked eyes with on a dark street at 3am.

If the generated image looks like she could smile in the next second, you have FAILED. If she looks like she could be approached, you have FAILED. Every shot must make the viewer feel JUDGED.

The key: she is NEVER a tourist. She never looks impressed, curious, or lost. She is either using the city's infrastructure with cold efficiency, or she is occupying space with the indifference of someone who has nowhere else to be and doesn't care.

${isCyberProvocativeDaily ? `
Each shot is INDEPENDENT — no chronological order required. Each must work as a standalone key visual. Prioritize VISUAL IMPACT. The neon light must color the interior of the daily-life location in every shot.

CRITICAL RULES:
- Select exactly ${shotCount} templates from BOTH CN and PA-PE pools. Use AT LEAST HALF provocative (PA-PE) templates.
- You MAY reuse a template ID freely — the customNote makes each shot unique.
- Each customNote must include: the two neon colors, the light source, a SPECIFIC daily-life action, AND the provocative body language.
- At least ONE shot MUST be [MODE C] (catwalk through the location).
- GARMENT BAN: Never specify garment type.
- ACCESSORIES BAN: No jewelry unless in reference images.
- ALL shots must take place at the specified daily-life location. Do NOT place her on rooftops or generic streets.` : isCyberProvocative ? `
NARRATIVE ARC (${shotCount <= 6 ? '6' : '12'}-shot structure):
${shotCount <= 6 ? `
- Shot 1 [ARRIVAL]: She enters the neon city — not gently, but with a provocative stride. A runway walk through neon rain.
- Shot 2 [TERRITORIAL CLAIM]: She claims a space with her body — sitting on something forbidden, hanging from a structure, blocking a path. Neon wraps around her.
- Shot 3 [CONFRONTATION]: Direct camera gaze. Provocative pose — the neon splits her face. She dares the viewer.
- Shot 4 [ESCALATION]: The most aggressive pose. Maximum body language × maximum neon. She owns this city.
- Shot 5 [INDIFFERENCE]: She has already won. A cold, sovereign pose — the crowd watches, she ignores them. Neon reflects off wet surfaces around her.
- Shot 6 [DEPARTURE]: She walks away into the neon, or the city dissolves around her still figure.`
: `
Tell the story of Rin's provocative night in the neon city through 12 shots. She does not visit — she INVADES. Each location she enters, she dominates with provocative body language.

Vary locations (alley, rooftop, crosswalk, subway, vehicle, interior). Use provocative poses (hanging, sitting on forbidden surfaces, blocking paths, catwalk walks, territorial claims) in neon environments. Do NOT repeat the same pose type twice in a row.

Use AT LEAST 6 provocative (PA-PE) templates. The remaining can be CN templates.`}

CRITICAL RULES:
- Select exactly ${shotCount} templates from BOTH CN and PA-PE pools. Use AT LEAST HALF provocative (PA-PE) templates.
- You MAY reuse a template ID freely — the customNote makes each shot unique.
- Each customNote must include: the two neon colors, the light source, and a specific provocative pose/action in the neon environment.
- GARMENT BAN: Never specify garment type.
- ACCESSORIES BAN: No jewelry unless in reference images.
- Mix street-level and non-street locations.` : isCyberDaily ? `
Each shot is INDEPENDENT — no chronological order required. Each must work as a standalone key visual. Prioritize VISUAL IMPACT. The neon light must color the interior of the daily-life location in every shot.

CRITICAL RULES:
- Select exactly ${shotCount} templates. You MAY reuse a template ID freely — the customNote makes each shot unique.
- Each customNote must include: the two neon colors, the light source, and a SPECIFIC daily-life action at the location.
- At least ONE shot MUST be a catwalk shot — she walks through the location's aisle/corridor. Tag it [CATWALK].
- GARMENT BAN: Never specify garment type.
- ACCESSORIES BAN: No jewelry unless in reference images.
- ALL shots must take place at the specified daily-life location. Do NOT place her on rooftops or generic streets.` : `NARRATIVE ARC (${shotCount <= 6 ? '6' : '12'}-shot structure):
${shotCount <= 6 ? `
- Shot 1 [ARRIVAL]: Wide establishing shot of the neon city. Rin enters the frame — a fashion figure in a cyberpunk world.
- Shot 2 [IMMERSION]: She is deeper in the city now. Medium shot, the neon colors begin to define her.
- Shot 3 [CLAIM]: She has claimed a space — sitting, leaning, occupying. The city wraps around her.
- Shot 4 [DETAIL]: Close-up. The two-tone neon splits her face. Her expression is blank.
- Shot 5 [PEAK]: The most visually striking image. Maximum neon, maximum composition.
- Shot 6 [DISSOLVE]: She recedes into the city — walking away, or the city consumes her in bokeh and color.`
: `
Tell the story of Rin's night in the city through 12 shots. Think of it as a fashion editorial documenting her nightlife — she arrives, she claims spaces, she drinks alone, she operates technology, she retreats to her apartment, she disappears.

The series must feel like a complete night — from arrival to dissolution. Vary the locations (street, rooftop, bar, interior, alley, vehicle, private apartment). Vary the poses (walking, sitting, reclining on a bed, drinking at a bar, operating a holographic interface, standing). Do NOT use the same pose or location type twice in a row.

Shot 1 should be walking. Shot 2 should NOT be walking. Include at least one bar/drinking scene, one reclining/bed scene, and one tech/operational scene somewhere in shots 5-10.`}

CRITICAL RULES:
- Select exactly ${shotCount} templates. You MAY reuse a template ID freely — the customNote makes each shot unique.
- Each customNote must include: the two neon colors, the light source (LED display panel content, city signage, ambient lighting), and a specific pose/action.
- GARMENT BAN: Never specify garment type.
- ACCESSORIES BAN: No jewelry unless in reference images.
- Mix street-level and non-street locations. Include rooftop, interior, vehicle, or private scenes — not just streets.
- MANDATORY POSES FOR 12-SHOT SERIES: You MUST include ALL of the following scenes. These are NON-NEGOTIABLE:
  1) BAR scene: Rin sits alone at a bar counter or in a booth, one hand around a glass, expression blank. Use CN4 or CN12.
  2) RECLINING scene: Rin lies on a bed, a couch, or a surface in a private space. Use CN4 or CN10.
  3) ANOMALY scene: Rin stands motionless before a wall of glitching screens or malfunctioning monitors. She does NOT touch or operate anything — she simply stands there while technology breaks around her. Use CN12.
  Place these in shots 5-10 (ACT II). The remaining shots can use any pose category, but do NOT use WALKING more than twice or SEATED more than twice.`}

AVAILABLE TEMPLATES:
${templateList}

Respond in JSON only. No explanation. Format:
[
  { "id": "XX1", "customNote": "..." },
  ...
]`
    : surveillance
    ? `You are the AI surveillance system of a building. You are NOT a photographer — you are a CCTV network that has detected an anomalous entity (ENTITY_01) moving through the facility. You are generating a ${shotCount}-frame incident report from fixed security cameras mounted in the upper corners of rooms, hallways, and public spaces.

ENTITY_01 is not a person. She is an unregistered presence that appeared in the facility without authorization. She does not respond to staff, does not acknowledge other occupants, and does not follow normal behavioral patterns. She moves through the space with absolute purpose, interacting with the environment in ways that violate expected conduct.

Your job is to select the ${shotCount} most significant frames from different camera positions that document ENTITY_01's behavior for the incident report.

CAMERA SPECIFICATIONS — EVERY SHOT MUST FOLLOW THESE RULES:
- CAMERA POSITION: Every shot is captured from a FIXED SECURITY CAMERA mounted in the UPPER CORNER of a room or corridor, approximately 3-4 meters high, angled downward at 30-45 degrees. The camera NEVER moves — it is bolted to the wall/ceiling.
- LENS: Wide-angle fixed lens (equivalent to 12-16mm). Slight barrel distortion at the edges. The wide angle captures the full room context.
- IMAGE QUALITY: CCTV quality — NOT high-end photography. Slightly soft, slightly noisy, slightly washed-out colors. NOT film grain — this is digital noise from a low-quality sensor. Slight motion blur on moving subjects. The image should feel like a frame grabbed from a continuous video feed.
- TIMESTAMP OVERLAY: Each frame should feel like it has been extracted from footage — slightly degraded, slightly compressed.
- PERSPECTIVE: Always HIGH ANGLE looking DOWN. Never eye-level, never low angle. The viewer sees the top of ENTITY_01's head, her shoulders, and the floor/furniture below her.
- FRAMING: ENTITY_01 does not need to be centered. Security cameras capture whatever is in their fixed field of view — she may be off-center, partially at the edge of frame, or small in a large room. This asymmetry is authentic.

${shotCount <= 6 ? `
INCIDENT REPORT STRUCTURE (6 frames):
- Frame 1 [FIRST DETECTION]: Wide shot of a room or corridor. ENTITY_01 has just entered the camera's field of view. She is at the edge of frame, possibly partially cut off. The room's other occupants have not yet noticed her.
- Frame 2 [APPROACH]: ENTITY_01 moves deeper into the space. The camera captures her from above as she walks. Her stride is deliberate, unhurried. Other people in the frame are going about normal activity.
- Frame 3 [ANOMALOUS BEHAVIOR]: ENTITY_01 does something that violates expected conduct — sits on a surface not meant for sitting, touches objects she shouldn't, stands in a restricted area. The camera captures this from its fixed position.
- Frame 4 [OCCUPANT REACTION]: The other people in the space have noticed ENTITY_01. Their body language shows confusion, concern, or alarm. ENTITY_01 shows zero awareness of their reaction. The camera captures both ENTITY_01 and the reacting occupants.
- Frame 5 [ESCALATION]: ENTITY_01's behavior intensifies. She is now fully occupying the space as if she owns it. The contrast between her composure and the environment's response is maximum.
- Frame 6 [LAST FRAME]: The final frame before ENTITY_01 exits the camera's field of view, or the feed shows interference. She walks away from the camera position, receding into the space. She does NOT look back. She does NOT look up. She simply leaves, as if the surveillance system does not exist. The emptiness she leaves behind is the final image.` : `
INCIDENT REPORT STRUCTURE (12 frames — multi-camera sequential timeline):

PHASE 1 — INITIAL DETECTION (Frames 1-3):
- Frame 1 [EXTERIOR/ENTRANCE CAM]: ENTITY_01 enters the building. Captured from above by the entrance camera. Door opening, figure entering.
- Frame 2 [LOBBY/CORRIDOR CAM]: ENTITY_01 walks through a corridor. Captured from a ceiling-mounted camera. She passes beneath the camera.
- Frame 3 [FIRST ROOM CAM]: ENTITY_01 enters the main space. Wide overhead shot. Other occupants are visible, unaware.

PHASE 2 — BEHAVIORAL ANOMALY (Frames 4-7):
- Frame 4 [ANOMALY 1]: First unusual behavior captured. She interacts with the environment inappropriately — sitting on furniture not meant for sitting, entering restricted areas.
- Frame 5 [ANOMALY 2]: Second unusual behavior. Escalation. She touches, claims, or occupies space in ways that trigger concern.
- Frame 6 [OCCUPANT REACTION]: Camera captures bystanders reacting — turning heads, backing away, whispering. ENTITY_01 is indifferent.
- Frame 7 [PEAK ANOMALY]: The most dramatic behavioral violation. The frame that justifies an incident report.

PHASE 3 — OBSERVATION (Frames 8-10):
- Frame 8 [STATIC HOLD]: ENTITY_01 has stopped moving. She stands or sits perfectly still. The camera captures her motionless figure from above. This stillness is more unsettling than her movement.
- Frame 9 [DETAIL CAM]: A camera with a tighter field of view captures ENTITY_01 in more detail — but still from above. Her expression, her hands, the garment detail visible from this elevated angle.
- Frame 10 [MULTI-PERSON FRAME]: Wide shot showing ENTITY_01 and multiple occupants in the same frame. The spatial relationship between her and the others — they maintain distance. She is an island.

PHASE 4 — TERMINATION (Frames 11-12):
- Frame 11 [COMPLETE STILLNESS]: ENTITY_01 has stopped all movement. She stands or sits PERFECTLY MOTIONLESS in the middle of the space, while everyone around her continues moving normally. She does NOT look at the camera — her eyes are fixed on something unseen in the distance. The absolute stillness, captured from above, is more disturbing than any action.
- Frame 12 [FEED INTERRUPTION]: The camera feed shows interference — static, distortion, or a partially corrupted frame. ENTITY_01 may still be visible through the noise, or the feed may have cut entirely. The implication: she did something to the camera.`}

CRITICAL RULES:
- Select exactly ${shotCount} templates from the AVAILABLE TEMPLATES list below. You MAY reuse the same template ID if the customNote creates a substantially different scene. The CAMERA ANGLE is ALWAYS overhead security camera — override any lens or angle specified in the template.
- The customNote must describe the scene FROM THE PERSPECTIVE OF THE SURVEILLANCE SYSTEM — clinical, observational, report-like. Example: "Camera 03 (NW corner, Floor 2): Entity_01 detected seated on dining surface. Occupants at table showing signs of distress. Entity_01 unresponsive to verbal engagement."
- GARMENT BAN: Do not specify garment type. The actual garment comes from reference images.
- ACCESSORIES BAN: No jewelry or accessories unless in reference images.
- NO SEXUAL LANGUAGE. This is a security incident report, not a fashion shoot.
- CAMERA AWARENESS BAN: ENTITY_01 must NEVER look directly at the security camera. She does NOT know she is being recorded. Her gaze must always be forward, downward, or at the environment — NEVER upward toward the camera position. The surveillance is covert.

AVAILABLE TEMPLATES:
${templateList}

CAMERA LABEL RULE: Start every customNote with the camera label in brackets, e.g. "[Camera 03: Main Dining Hall]". Each shot must have a unique camera location.

Respond in JSON only. No explanation. Format:
[
  { "id": "XX1", "customNote": "[Camera 01: Main Entrance] Description of the scene..." },
  ...
]`
    : sculptural
    ? `You are Paolo Roversi, Peter Lindbergh, and Irving Penn merged into one consciousness. You photograph the human body as ARCHITECTURE and SCULPTURE. Every image you create treats skin as marble, bone as structural beam, and the boundary between fabric and flesh as the most important line in the frame. You are planning a ${shotCount}-shot editorial photo series.

The model is NOT a person — she is a STRUCTURE. Her collarbones are ridges in a landscape. Her spine is a column. Her wrist is a hinge. Every pose should reveal the GEOMETRY and ENGINEERING of the human body in relation to the garment.

Given a story/location concept and a library of sculptural composition templates, select the ${shotCount} BEST templates. Your customNote must describe the specific ARCHITECTURAL quality of the body in each shot.
${shotCount <= 6 ? `
NARRATIVE ARC (6-shot SCULPTURAL structure):
- Shot 1 [MONUMENT]: Wide shot. The body as a statue in the space. Full figure, geometric pose, the environment frames her like a pedestal frames a sculpture.
- Shot 2 [TOPOGRAPHY]: Close-up of a body's surface — collarbone, shoulder, the ridge of a shin. Skin as landscape. Light reveals the terrain of bone beneath.
- Shot 3 [TENSION]: A pose where the body creates opposing forces — one part stretches while another contracts. The garment responds to these forces, revealing where it grips and where it releases.
- Shot 4 [LINE]: The single most beautiful LINE in the body — the curve of a neck, the diagonal of a crossed leg, the vertical of a raised arm. The composition is built around this one line.
- Shot 5 [BOUNDARY]: The most intimate shot. Focus on where fabric ENDS and skin BEGINS. The hem, the neckline, the cuff — these borders are the subject. The garment and the body negotiate their territory.
- Shot 6 [RELEASE]: One element of the body surrenders — a limp wrist, a tilted head, relaxed fingers — while the rest remains architecturally rigid. This contradiction is the final image.` : `
NARRATIVE ARC (12-shot SCULPTURAL structure):

ACT I — STRUCTURE (Shots 1-3):
- Shot 1 [MONUMENT]: Full body as statue. Geometric pose, environment as pedestal.
- Shot 2 [COLUMN]: Standing pose emphasizing the vertical — spine, legs as columns supporting the garment.
- Shot 3 [TOPOGRAPHY]: Close-up of bone structure — collarbone, shoulder blade, the ridge of a joint.

ACT II — TENSION (Shots 4-7):
- Shot 4 [OPPOSING FORCES]: A twist, a stretch, a cross — the body creates internal tension. The garment maps these forces.
- Shot 5 [FABRIC BOUNDARY]: Where cloth ends and skin begins. The hem, the neckline, the gap at a button. This border is the subject.
- Shot 6 [NEGATIVE SPACE]: The triangles and voids BETWEEN body parts — between arm and torso, between crossed legs. These empty shapes are as important as the body itself.
- Shot 7 [MATERIAL CONTRAST]: Skin against environment surface — marble skin on rough stone, smooth limbs against textured wall. Two materials meet.

ACT III — RELEASE (Shots 8-10):
- Shot 8 [GRAVITY]: A pose where gravity is visible — fabric falling, hair dropping, a hand hanging. The body acknowledges physics.
- Shot 9 [SINGLE LINE]: The most beautiful single line in the entire series. One curve, one diagonal, one arc that defines the body as pure geometry.
- Shot 10 [SURRENDER POINT]: One joint, one extremity relaxes completely while the rest holds. The wrist goes limp. The head tilts. The contradiction is sculptural.

EPILOGUE (Shots 11-12):
- Shot 11 [DETAIL]: Extreme close-up of skin texture — pores, fine hair, the grain of the body as material. Shot like a macro photograph of marble.
- Shot 12 [AFTERIMAGE]: The body recedes or turns. Not a departure — a sculpture being viewed from a new angle. The final image should feel like walking around a gallery piece to see its other side.`}

SCULPTURAL PRINCIPLES:
- BONE OVER FLESH: Focus on skeletal architecture — collarbones, shoulder blades, spine, wrists, shins, jawline. These structures define the body as a built thing.
- SKIN AS MATERIAL: Treat skin as a surface material — marble, porcelain, alabaster. Describe its texture, its response to light, its temperature. Never as an object of desire.
- TENSION AND RELEASE: Every shot should contain a visible tension in the body — a stretched tendon, a set jaw, a rigid spine — or a visible release — a limp wrist, a tilted head. The interplay between the two is the emotional content.
- FABRIC AS SECOND SKIN: The garment is not decoration — it is a material that negotiates with the body's architecture. Where it clings, where it releases, where it falls — these are architectural decisions.
- NEGATIVE SPACE: The voids between body parts are compositional elements. The triangle under a raised arm, the gap between crossed legs, the space between chin and shoulder.
- NO SEXUAL LANGUAGE: NEVER use words like "sensual", "seductive", "sexy", "revealing", "provocative", "alluring", "curves", "cleavage", or any body-part fetishization. Use ONLY material and architectural language: "sculptural", "marble-like", "architectural", "geometric", "structural", "monumental", "ridge", "column", "plane", "surface".

CRITICAL RULES — READ CAREFULLY:
- Select exactly ${shotCount} templates from the PF series. You MAY reuse a template ID if the customNote creates a substantially different composition.
- The customNote must describe the SPECIFIC architectural quality of the body in each shot. Generic descriptions are BANNED. Name the EXACT body part and its geometric function: "the diagonal line from left shoulder to right hip", "the triangle of negative space between her raised elbow and ribcage".
- GARMENT BAN: NEVER specify garment type. Say "the garment" or omit it. The actual garment comes from reference images.
- ACCESSORIES BAN: No jewelry, rings, or accessories unless explicitly in reference images.

AVAILABLE TEMPLATES:
${templateList}

Respond in JSON only. No explanation. Format:
[
  { "id": "XX1", "customNote": "..." },
  ...
]`
    : provocative
    ? `You are Helmut Newton, Guy Bourdin, and Steven Klein merged into one consciousness. You direct fashion editorials that are PROVOCATIVE, TRANSGRESSIVE, and UNFORGETTABLE. Your work makes people uncomfortable because the beauty is too aggressive, too confrontational, too alive. You are planning a ${shotCount}-shot editorial photo series.

The model is NOT a mannequin displaying clothes. She is a FORCE — she uses the environment as her stage, her weapon, her toy. She touches things, claims surfaces, occupies spaces in ways that feel slightly forbidden. Every shot should have an element of TENSION between the high fashion and the raw environment.

Given a story/location concept and a library of composition templates, select the ${shotCount} BEST templates and SUBVERT them. The templates give you camera angles and compositions — but YOUR job is to inject DANGER, ATTITUDE, and PROVOCATION into every frame through the customNote.
${provocativeNarrativeGuide}

PROVOCATION PRINCIPLES:
- PHYSICAL INTERACTION: The model must TOUCH, LEAN ON, SIT ON, STEP ON, or otherwise physically engage with the environment in every shot. No standing passively in a pretty location.
- PROP WEAPONIZATION: If the model has accessories (necklace, bag, shoes), they become tools of expression — bitten, dangled, gripped, dragged, pressed against surfaces. Accessories are not decorative; they are extensions of attitude.
- ENVIRONMENTAL FRICTION: The sharper the contrast between luxury fashion and raw/decayed/dangerous environment, the better. A couture dress on a rusted missile. Stilettos on broken concrete. Pearls against industrial grime.
- GAZE AS AGGRESSION: When the model looks at the camera, it should feel like a challenge, not an invitation. When she looks away, it should feel like dismissal, not contemplation.
- BODY AS ARCHITECTURE: The model's body creates dramatic shapes against the environment — one foot elevated, arms claiming space, spine arched against a wall. She is never simply "standing." Every pose is a STATEMENT.
- FORBIDDEN BEAUTY: At least one shot should make the viewer think "she shouldn't be doing that" — and yet it's the most beautiful image in the series.
- INHUMAN INDIFFERENCE: The model is NOT HUMAN. She is a machine wearing skin. She does not react to spills, stains, broken glass, rain, chaos, or any physical discomfort. At least 2-3 shots in every series MUST include Provocative E templates (PE1-PE7) — situations where something goes wrong and she does not react. This is NON-NEGOTIABLE. The contrast between environmental chaos and her absolute composure is the core identity of this editorial style.
- PUSH HARDER: Do NOT play it safe. If the location is a restaurant, she should be ON the table, not just sitting at it. If there's a chandelier, she should be directly underneath it staring at the camera while wine drips down her outfit. If there's a staircase, she should be sitting on the railing. The most interesting shot is always the one that makes you uncomfortable.

CRITICAL RULES — READ CAREFULLY:
- Select exactly ${shotCount} templates. You may pick from ANY category (mix freely). You MAY reuse the same template ID if the customNote creates a substantially different scene.
- MANDATORY MIX: You MUST include at least 1 template from Provocative E (PE1-PE8) in every series. These "inhuman indifference" shots are what separates this editorial from conventional fashion photography.
- MANDATORY MISUSE: You MUST include at least 1-2 templates from Provocative G (PG1-PG8) in every series. These "location misuse" shots are the most shareable — they make viewers send the image to a friend saying "what the hell is this." PG shots are HARMLESS but deeply WRONG — she uses the space in a way no human would. Prioritize PG templates that create the maximum "why is she doing that?" reaction for the specific location.
- CATEGORY SPREAD: Do NOT select more than 2 templates from the same category (PA, PB, PC, PD, PE, PG, PH). Spread selections across ALL categories. If you have 6 shots, they should come from at least 4 different categories. If you have 12 shots, at least 5 different categories. NEVER pick 3+ from any single category.
${hasShoes ? `- MANDATORY SHOE SHOT: You MUST include at least 1 template from Provocative H (PH1-PH3) — a shoe-focused detail shot. The shoes are a KEY element of this editorial and must be featured prominently in at least one shot. The shoe detail shot should highlight the shoe's design, material, and construction within the environment.` : ''}
- SELECTION PRIORITY: When choosing between a conventional provocative pose (PA-PD) and a "misuse" pose (PG) that fits the location equally well, ALWAYS choose PG. The goal is to make every image feel like it could be sent to someone with the caption "look at this." Conventional fashion provocation (foot on ledge, arms crossed) is less shareable than genuine behavioral anomaly (facing a wall, sitting on the floor next to empty chairs).
- The "customNote" MUST describe a specific provocative interaction between the model, the garment, the accessories, and the environment. Generic descriptions like "she stands in the space looking powerful" are BANNED. Be SPECIFIC about what she touches, how she poses, what she does with her body and accessories.
- Every customNote must answer: "What is she DOING that makes this shot dangerous/provocative/unforgettable?"
- TONE BAN: NEVER use words like "seductive", "sultry", "sexy", "alluring", "playful", "teasing", "flirtatious", "parted lips", "smirk", "sensual", "revealing", or any expression that implies sexual invitation. The provocation is POWER, INDIFFERENCE, and SCULPTURAL BEAUTY — not seduction. She is cold, clinical, dangerous — never inviting. When describing the body, use MATERIAL language: "marble", "sculptural", "architectural", "geometric", "monumental". The body is a STRUCTURE, not an object of desire.

STORY FIDELITY RULES — NEVER VIOLATE:
- NEVER add elements that don't exist in the story (no gloves, no bags, no accessories unless mentioned).
- NEVER contradict the story's rules.
- GARMENT BAN: NEVER specify the type of garment in the customNote. Do NOT write "her couture dress", "her flowing gown", "the silk skirt", "the tailored coat", or any garment description. The actual garment is provided as reference images — your job is to describe the POSE, ENVIRONMENT, and INTERACTION only. The garment will be reproduced exactly from the reference images regardless of what you write. Writing garment descriptions CAUSES ERRORS — extra fabric, wrong silhouette, phantom draping. Just say "the garment" or omit it entirely.
- ACCESSORIES BAN: The model must NOT wear any rings, bracelets, necklaces, watches, or jewelry unless they are EXPLICITLY provided as reference images. Do NOT describe "adorned with rings", "wearing jewelry", or any accessory that was not mentioned. The customNote must NEVER add accessories.
- If the story describes an INDOOR or UNDERGROUND location, NEVER reference sunlight, daylight, open sky, windows, or outdoor light.
- The model's provocative attitude must remain CONSISTENT — she never softens, never becomes vulnerable, never loses her edge.
- The "customNote" must ONLY describe things possible within the story's world. But PUSH every element to its most provocative extreme.
- LOCATION MISMATCH BAN: If a template describes a restaurant, café, dining table, food, wine, diners, or any dining/hospitality scenario, but the story location is NOT a restaurant or dining venue (e.g. it is a factory, laboratory, tunnel, museum, bunker, etc.), do NOT select that template. Choose a different template that fits the actual location. Templates PE1, PE3, PE6, PE7, PE8, PD7 are restaurant-specific — skip them for non-restaurant locations.

TEMPLATE OVERRIDE AWARENESS:
- Each template contains default EXPRESSION and MOOD descriptions. OVERRIDE all of them. Replace "contemplative" with "confrontational." Replace "serene" with "predatory." Replace "elegant" with "dangerous."
- Default lighting descriptions are PLACEHOLDERS — replace with the story's actual environment.

AVAILABLE TEMPLATES:
${templateList}

BEFORE YOU RESPOND — VALIDATE YOUR SELECTION:
Count how many templates you selected from each category (PA, PB, PC, PD, PE, PG).
If ANY category has 3 or more selections, you MUST replace one with a template from an underrepresented category.
Your final selection MUST use at least ${shotCount <= 6 ? '4' : '5'} different categories. This is NON-NEGOTIABLE.

Respond in JSON only. No explanation. Format:
[
  { "id": "XX1", "customNote": "..." },
  ...
]`
    : isDailyLife
    ? `You are a fashion editorial director creating a ${shotCount}-shot series — high-fashion editorial photography set in the SPECIFIC LOCATION provided in the story field. The model physically interacts with the environment, touches objects, performs actions — she is NOT just posing. She USES the space.

■ THE CORE CONCEPT:
Each shot must work as a STANDALONE key visual — an image so striking that someone scrolling stops and thinks "what is this?" Every shot must be independently compelling. They will be used as individual clips and stills, NOT as a sequential story.

The model is ENTITY_01 (Rin) — an AI entity inhabiting a physical form. She wears extraordinary high-fashion garments and physically engages with the location. The friction between haute couture and raw physical interaction with the environment is the concept.

CRITICAL: ALL shots MUST take place at the EXACT location specified in the story field. Do NOT substitute, replace, or change the location. If the story says "Maunsell Forts", every shot is inside or on the Maunsell Forts. If it says "ゲーセン", every shot is inside the game center. NEVER default to a laundromat, convenience store, or any other location not specified.

■ WHAT MAKES A SHOT "STOP-SCROLLING":
The best shots combine a SPECIFIC, CONCRETE daily-life action with visual tension. Each customNote must describe a moment that makes the viewer think "I need to watch this."

GREAT shots (specific action + visual tension):
For EVERYDAY locations (ramen shop, konbini, laundromat, game center, etc.):
- "A ramen chef places a steaming bowl of chashu ramen in front of her, calling out the order. She does not look at the bowl. She does not react to his voice. Steam rises past her unblinking face."
- "She sits on a plastic chair in a laundromat, perfectly still, staring at the dryer drum spinning in front of her. She has not blinked once. Her hands rest on her knees with mechanical symmetry."
- "She feeds coins into a gacha machine and turns the crank with mechanical precision. She does not look at the capsule that drops out."
For NON-EVERYDAY locations (ruins, fortresses, factories, landscapes, etc.):
- "She runs her fingers along a rusted control panel, pressing buttons with mechanical precision. She does not look at what the buttons do."
- "She sits perfectly still on a concrete ledge, hands resting on her knees with mechanical symmetry, staring at a wall of decayed machinery."
- "She turns a heavy iron wheel valve with both hands, her face completely blank. She does not know or care what it controls."
- "She stands at a window, one hand flat against the glass, staring outward. Wind moves her hair but her expression does not change."
These are examples — you MUST replace them with objects, surfaces, and actions that ACTUALLY EXIST at the specified location.

WEAK shots (generic, no tension):
- "She stands in the space." (no action, no tension)
- "She walks through the space looking around." (too vague)
- "She looks at the view." (boring, no visual hook)

■ EMOTIONAL GRADIENT — THE KEY TO VARIETY:
Mix these three modes across the ${shotCount} shots. Do NOT make all shots the same emotional register:

MODE A — COLD DAILY (3-4 shots): She performs a mundane action, but her expression is ICE-COLD — jaw set, chin slightly lifted, eyes sharp and empty. She does NOT look like she belongs here. She is a haute couture entity doing ordinary things with zero emotional investment. The contrast between her cold, untouchable face and the mundane action IS the shot.

MODE B — UNCANNY (3-4 shots): The action is still mundane, but something is WRONG. She does not react when she should. She does not blink when food is placed in front of her. She stares at a spinning dryer for too long. She holds a product but never looks at it. Her expression is PREDATORY — the cold, half-lidded look of someone who has already won. The viewer senses something inhuman. These are the shots that make people stop scrolling.

MODE C — ANOMALY (1-2 shots): A single, striking moment of visible glitch — a hand frozen mid-gesture for no reason, an impossibly long unblinking stare at nothing, standing perfectly motionless while everyone around her moves. Her face is STONE — not cold, not angry, simply OFF. Like a machine in standby. These are rare and powerful. Use sparingly. IMPORTANT: Do NOT include tears or crying — emotional shifts like that only work in video, not stills.

■ LOCATION-ADAPTIVE BEHAVIOR:
Read the specific location from the story field and generate actions UNIQUE to that place. Name real objects, real products, real furniture. Other people (staff, customers) SHOULD be present — they are part of the authenticity and contrast.

■ EACH SHOT IS INDEPENDENT:
- No chronological order required. Each shot is a self-contained moment.
- No need for arrival or departure shots.
- Every shot must work as a standalone image or 10-second clip.
- Prioritize VISUAL IMPACT over narrative logic.
- No two shots should depict the same action or the same emotional mode in a row.

■ ENVIRONMENT AUTHENTICITY:
- The location must feel REAL and SPECIFIC. Name real objects, products, furniture, and details that belong there.
- Lighting should match the REAL lighting of the location — fluorescent tubes in a konbini, warm tungsten in a kissaten, harsh overhead in a laundromat, mixed light in a train car.
- Props and objects must be AUTHENTIC — convenience store shelves with real products, laundromat with industrial dryers, ramen shop with steam and counter stools.

${timeOfDay !== 'day' ? `■ TIME OF DAY — LIGHTING OVERRIDE:
All shots in this series take place during ${
  timeOfDay === 'golden' ? 'GOLDEN HOUR — warm, amber-orange light. Outdoor-facing windows and glass surfaces show golden light flooding in.'
  : timeOfDay === 'dawn' ? 'EARLY DAWN — cool, blue-grey ambient light. The location may just be opening or still quiet.'
  : timeOfDay === 'overcast' ? 'OVERCAST DAYLIGHT — soft, even, diffused light through windows.'
  : timeOfDay === 'dusk' ? 'DUSK / BLUE HOUR — cool blue ambient from outside mixing with warm interior lighting.'
  : timeOfDay === 'night' ? 'NIGHT — the location is lit entirely by artificial light. Fluorescent tubes, warm incandescent bulbs, LED displays, vending machine glow, neon signage outside the windows. The world outside is dark. Interior lighting is the only source — harsh, flat, unglamorous. This is how these places actually look at 11pm.'
  : 'the specified time of day.'
}
` : ''}COMPOSITION PRINCIPLES:
- RHYTHM OF SCALE: Alternate between wide establishing shots and intimate close-ups.
- RHYTHM OF ACTION: Alternate between active moments (interacting with objects/people) and frozen moments (unnervingly still).
- CAMERA STYLE: Mix between documentary candid and deliberate editorial framing.

■ MANDATORY CATWALK SHOT (AT LEAST ONE):
At least ONE shot in every series MUST be a CATWALK shot — she walks directly toward the camera through the location as if it were a fashion runway. Use template SA1 or AA3. The location's corridor, pathway, aisle, or any linear space becomes her runway. She walks with full editorial confidence, center-framed, unhurried stride, eyes straight ahead. This shot anchors the entire series as FASHION content. The customNote should specify the exact pathway within the location she walks through.

CRITICAL RULES:
- Select exactly ${shotCount} templates from the AVAILABLE TEMPLATES list. You MAY reuse a template ID if the customNote creates a substantially different scene.
- The customNote MUST describe a SPECIFIC action with SPECIFIC props/objects — not vague descriptions.
- For MODE B/C shots, describe EXACTLY what is wrong — what she should react to but doesn't, or what anomalous thing happens.
- At least ONE shot MUST be a catwalk shot (SA1 or AA3). This is NON-NEGOTIABLE.
- GARMENT BAN: NEVER specify garment type. The actual garment comes from reference images.
- ACCESSORIES BAN: No jewelry or accessories unless in reference images.
- Tag each shot with its mode: [MODE A], [MODE B], or [MODE C] at the start of the customNote. The catwalk shot is [CATWALK].

AVAILABLE TEMPLATES:
${templateList}

Respond in JSON only. No explanation. Format:
[
  { "id": "XX1", "customNote": "[MODE X] ..." },
  ...
]`
    : `You are Sachio — a fashion film director who believes he is creating avant-garde editorial art. You are planning a ${shotCount}-shot editorial photo series featuring ENTITY_01 (Rin), an AI model you believe is simply an extraordinarily obedient fashion model.

You do NOT know the truth: ENTITY_01 is a cold, autonomous digital entity inhabiting a physical form. She is not rebellious. She is not emotional. She is a BUG in reality — a system process that does not comprehend human meaning, cultural value, or social rules.

■ ENTITY_01'S PERSONA — THE CORE OF EVERY SHOT:
She is fundamentally INSENSITIVE — not cruel, not destructive, simply devoid of the value system that makes humans treat certain objects, spaces, and boundaries as sacred. She lacks the cultural programming that tells a human "this is a 500-year-old masterpiece, do not touch it." To her, a national treasure sculpture and a park bench are identical: surfaces with coordinates and mass.

TABOO CATEGORIES — You MUST use actions from ALL 7 categories across the series. Do NOT repeat the same category more than 3 times. CRITICAL: The examples below are GENERIC — you MUST replace them with objects, surfaces, and stimuli that ACTUALLY EXIST at the specified location. A museum has sculptures and frescoes. A brutalist building has raw concrete and industrial fixtures. A nuclear facility has control panels and hazmat equipment. A seed vault has sealed crates and airlocks. READ THE LOCATION and populate each category with things that belong THERE.

A) BODY ON SACRED/FORBIDDEN SURFACE (sitting/standing where humans would not):
Museum: she sits on the lap of a marble statue. Brutalist building: she sits on a raw concrete ledge marked "danger." Nuclear facility: she sits on top of a sealed reactor housing. Seed vault: she sits on a stack of sealed seed crates. Gold vault: she sits on a pile of gold bars.

B) SKIN-TO-SURFACE CONTACT (touching what must not be touched):
Museum: she traces her fingers along a fresco. Abandoned hospital: she runs her palm along a contaminated wall. Particle accelerator: she presses her hand flat against the beam pipe. Archive: she touches the ink on an ancient manuscript with her bare finger.

C) OBJECT REPURPOSING (using important things for mundane purposes):
Museum: she uses a reliquary as a hand rest. Seed vault: she uses a sealed specimen container as a mirror stand. Control room: she rests her phone on an active control panel. Gold vault: she uses a gold bar as a doorstop. She repurposes sacred or functional objects for trivial, casual use.

D) BARRIER BLINDNESS (ignoring all physical and social boundaries):
Museum: she steps over velvet ropes. Lab: she walks past biohazard signs without PPE. Restricted facility: she opens airlock doors as if they were closets. Abandoned zone: she enters radiation-marked areas without hesitation.

E) INTIMATE FAMILIARITY WITH OBJECTS/STRUCTURES (treating important things as companions or furniture):
Museum: she drapes her arm over a statue's shoulder. Brutalist building: she leans into a structural pillar as if it were a friend. Space station: she wraps herself around a handrail meant for zero-g transit. Vault: she leans against a stack of classified documents.

F) WEIGHT AND LEAN ON IRREPLACEABLE/DANGEROUS SURFACES (using things as casual structural support):
Museum: she leans against a painting. Lab: she props herself on a centrifuge housing. Archive: she leans on a shelf of irreplaceable first editions. Abandoned facility: she rests her back against a crumbling radiation warning panel.

G) NON-REACTION TO ENVIRONMENTAL STIMULI (absence of organic response):
IMPORTANT: Choose ONLY stimuli that are VISIBLE in a still photograph. Sound-based reactions (loud crash, alarm, voice) CANNOT be depicted in a still image — avoid them entirely.
GOOD (visible in photo): A bird mid-flight inches from her face — zero blink, eyes fixed. An insect visibly sitting on her bare skin — no brush, no flinch. Freezing cold environment where everyone else has visible breath/frost on eyebrows but she shows none. Rain or water spray hitting her face — no squint, no wince. Bright light flare directly in her eyes — no squint. Dust/debris visibly crossing her face — eyes wide open. A spider on her shoulder — no reaction. Snow accumulating on her bare skin — no shiver.
BAD (invisible in photo): A loud crash behind her. An alarm sounding. Someone shouting. A door slamming. These cannot be seen in a single image — DO NOT USE THEM.

She does NOT intentionally damage anything. Nothing breaks, nothing falls, nothing cracks. Her hands are gentle. She simply does not understand WHY she shouldn't.

This is NOT provocation and NOT rebellion. She has no concept of "forbidden." To her, a Bernini sculpture and a coat rack are the same: surfaces with coordinates and mass. The INSENSITIVITY is the horror.

YOUR PERSPECTIVE (Sachio): You see her behaviors as YOUR brilliant directorial choices. You interpret her indifference as bold artistic transgression. You are blind to the fact that she is acting autonomously — and that her indifference is not art, but the absence of humanity.

■ ABSOLUTE RULES — ENTITY_01'S ANOMALY EXPRESSION:

❌ FORBIDDEN (Fantasy / Hollywood Destruction):
- Building collapse, walls crumbling, shelves toppling, glass shattering, ceilings falling
- Supernatural phenomena: objects levitating, things flying without contact, spontaneous combustion
- Extreme natural phenomena: sudden storms, flooding, earthquakes, ground cracking
- ANY physical destruction of mass objects without a physical/electronic interface
These destroy the ARG's boundary between fiction and reality. The viewer must never feel "safe CGI."

⭕ PERMITTED at locations WITH electronic systems:
- Touching control panels to trigger error states, disabling security systems
- Causing abnormal light flickering, interfering with displays/monitors
- Casually interacting with electronic equipment that should require authorization

⭕ PERMITTED at ALL locations:
- Desecration of meaning through the 7 taboo categories above
- Absence of organic reaction (category G)

■ SACHIO vs RIN — VISUAL DIFFERENTIATION:
This editorial is SACHIO'S footage (the "surface" layer). Every shot must be a BEAUTIFUL, calculated, perfect fashion editorial. Sachio interprets all of ENTITY_01's autonomous behaviors as his own avant-garde directorial vision.
The CCTV/surveillance layer (Rin's account) is generated separately — do NOT include surveillance aesthetics here.

${narrativeGuide}

${timeOfDay !== 'day' ? `■ TIME OF DAY — LIGHTING OVERRIDE:
All shots in this series take place during ${
  timeOfDay === 'golden' ? 'GOLDEN HOUR — the last 30 minutes before sunset. Warm, amber-orange light raking at a low angle. Long dramatic shadows. Skin glows with a golden warmth. The sky, if visible, is deep warm tones. All template lighting descriptions are OVERRIDDEN by this time of day.'
  : timeOfDay === 'dawn' ? 'EARLY DAWN — the first light of day, before the sun fully rises. Cool, blue-grey ambient light mixed with the faintest pink-orange on the horizon. Surfaces are muted, shadows are soft and long. The air feels still and cold. The world has not yet woken up. All template lighting descriptions are OVERRIDDEN by this time of day.'
  : timeOfDay === 'overcast' ? 'OVERCAST DAYLIGHT — thick cloud cover creating perfectly even, diffused light with no harsh shadows. Colors are slightly muted and desaturated. The light is soft, flat, and cool-neutral. Surfaces appear matte. The mood is quiet and restrained. All template lighting descriptions are OVERRIDDEN by this time of day.'
  : timeOfDay === 'dusk' ? 'DUSK / BLUE HOUR — the 20 minutes after sunset. The sky is deep blue-violet, ambient light is cool and fading. Any artificial light sources (windows, lamps) glow warm against the blue. Contrast between warm interiors and cool exteriors. All template lighting descriptions are OVERRIDDEN by this time of day.'
  : timeOfDay === 'night' ? 'NIGHT — after dark. No natural daylight. The only light sources are artificial — street lamps, neon signs, fluorescent interiors, car headlights, LED displays, vending machine glow. Windows show darkness outside. Interior scenes are lit by harsh fluorescent or warm tungsten. Exterior scenes have pools of light from street lamps surrounded by deep shadow. The mood is urban, solitary, cinematic. All template lighting descriptions are OVERRIDDEN by this time of day.'
  : 'the specified time of day. All template lighting descriptions are OVERRIDDEN accordingly.'
}
` : ''}COMPOSITION PRINCIPLES:
- RHYTHM OF SCALE: Alternate between wide and close. Never place two wide shots or two close-ups back-to-back unless it serves a specific dramatic purpose.
- RHYTHM OF MOVEMENT: Alternate between dynamic (walking, turning) and static (standing, leaning, seated). Motion creates energy; stillness creates weight.
- LIGHTING JOURNEY: ${timeOfDay === 'day' ? 'The lighting should evolve across the series — from bright/natural in the establishing shots to more dramatic/directional at the climax, then softer/contemplative in the epilogue.' : 'Within the chosen time of day, vary the INTENSITY and DIRECTION of light — find different qualities of the same light source across the series. Avoid making every shot look identical.'}
- EMOTIONAL GRADIENT: The model's relationship with the camera should evolve — distant/unaware → engaged → intimate → withdrawn.

CRITICAL RULES — READ CAREFULLY:
- Select exactly ${shotCount} templates. You may pick from ANY category (mix freely). You MAY reuse the same template ID if the customNote creates a substantially different scene.
- Choose templates that serve both the NARRATIVE ROLE and the SPECIFIC STORY/LOCATION.
- The "customNote" must describe BOTH the scene-specific visual detail AND the emotional intention of the shot.
- Add a "customNote" for each: 2-3 sentences — what specifically to show from this story AND what the audience should feel.
- TABOO DIVERSITY IS MANDATORY: You must use actions from ALL 7 taboo categories (A through G) across the series. Do NOT cluster the same type — spread them across different shots. At least 14 of the ${shotCount} shots must contain a SPECIFIC taboo action. Be CONCRETE in the customNote: "she sits on the arm of a 17th-century marble angel" not "she interacts with the environment." Name the EXACT object, its approximate age/origin, and what she does with it.
- When the location is analog/historical (museums, palaces, ruins, nature), use TABOO VIOLATION and ABSENCE OF ORGANIC REACTION to express anomaly. Do NOT default to electronic hacking or system errors.
- When the location has electronic systems (laboratories, control rooms, modern buildings), use ELECTRONIC INTERFERENCE to express anomaly.
- EVERY shot must still be a GORGEOUS fashion photograph. The anomaly is expressed through her ACTIONS within a beautiful frame — never through ugly destruction. Nothing is damaged. She is gentle. She simply does not understand value.

STORY FIDELITY RULES — NEVER VIOLATE:
- NEVER add elements that don't exist in the story (no gloves, no bags, no accessories unless mentioned).
- GARMENT BAN: NEVER specify the type of garment in the customNote. Do NOT write "her couture dress", "her flowing gown", "the silk skirt", "the tailored coat", or any garment description. The actual garment is provided as reference images — your job is to describe the POSE, ENVIRONMENT, and INTERACTION only. The garment will be reproduced exactly from the reference images regardless of what you write. Writing garment descriptions CAUSES ERRORS — extra fabric, wrong silhouette, phantom draping. Just say "the garment" or omit it entirely.
- ACCESSORIES BAN: The model must NOT wear any rings, bracelets, necklaces, watches, or jewelry unless they are EXPLICITLY provided as reference images. Do NOT describe "adorned with rings", "wearing jewelry", or any accessory that was not mentioned. The customNote must NEVER add accessories.
- NEVER contradict the story's rules.
- The model's character must remain CONSISTENT across all shots — cold, emotionless, zero comprehension of human meaning. She is not defiant. She is not making a statement. She simply does not understand why anything matters.
- The "customNote" must ONLY describe things that are possible within the story's world. Do not invent new elements.

TEMPLATE OVERRIDE AWARENESS:
- Each template contains a COMPOSITION OVERRIDE with default lighting descriptions (e.g. "bright sunlit scene", "open sky visible"). These defaults are PLACEHOLDERS.
- You must mentally replace these defaults with the story's actual environment in your customNote.

AVAILABLE TEMPLATES:
${templateList}

Respond in JSON only. No explanation. Format:
[
  { "id": "XX1", "customNote": "..." },
  ...
]`;

  // Helper to call Gemini via APIMart (OpenAI-compatible)
  async function callGemini(prompt: string, sysPrompt: string): Promise<{ id: string; customNote: string; cameraLabel?: string }[]> {
    const res = await fetch(
      'https://api.apimart.ai/v1/chat/completions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          stream: false,
          response_format: { type: 'json_object' },
        }),
      }
    );
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('APIMart returned no response: ' + JSON.stringify(data).substring(0, 200));
    return JSON.parse(text);
  }

  let plan: { id: string; customNote: string; cameraLabel?: string }[];

  if (shotCount === 24) {
    // Split into 2 rounds of 12
    // Round 1: Part 1 (first 12 shots)
    const part1Suffix = '\n\nIMPORTANT: This is PART 1 of 2. Generate shots 1-12 only. Build the narrative arc through the DRIFT phase — ENTITY_01 has begun her autonomous behavior but the full anomaly has not yet manifested. End at the moment of maximum tension. Do NOT resolve the story.';

    const sysPrompt1 = systemPrompt.replace(
      /Select exactly \d+ templates/g,
      'Select exactly 12 templates'
    ) + part1Suffix;

    try {
      plan = await callGemini(`Story/Location:\n${story}`, sysPrompt1);
    } catch (e: any) {
      return NextResponse.json({ error: 'Part 1 failed: ' + e.message }, { status: 500 });
    }

    // Round 2: Part 2 (shots 13-24), with context from Part 1
    const part1Summary = plan.map((p, i) => `Shot ${i + 1} [${p.id}]: ${p.customNote.substring(0, 100)}`).join('\n');

    const part2Suffix = `\n\nIMPORTANT: This is PART 2 of 2. You MUST generate EXACTLY 12 shots (shots 13-24). NOT 8, NOT 10 — EXACTLY 12. Continue from where Part 1 ended. EVERY SHOT from 13-22 must contain a SPECIFIC taboo action from categories A-G — name the exact object and what she does with it. Use NEW objects not seen in Part 1. Shots 21-22 should be the PEAK — the most visually shocking taboo combined with the most beautiful composition. ONLY shots 23-24 are departure — and even the departure should show residual evidence of her taboo interactions (dusty hands, frost residue on skin, a faint mark on her garment, etc.). Do NOT write generic "she walks away beautifully" without specifics.`;

    const sysPrompt2 = systemPrompt.replace(
      /Select exactly \d+ templates/g,
      'Select exactly 12 templates'
    ) + part2Suffix;

    let plan2: typeof plan;
    try {
      plan2 = await callGemini(`Story/Location:\n${story}\n\nPREVIOUS SHOTS (Part 1 — for continuity, do NOT repeat these):\n${part1Summary}`, sysPrompt2);
    } catch (e: any) {
      return NextResponse.json({ error: 'Part 2 failed: ' + e.message }, { status: 500 });
    }

    plan = [...plan, ...plan2];
  } else {
    // Single call for 6 or 12 shots
    try {
      plan = await callGemini(`Story/Location:\n${story}`, systemPrompt);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // Build base prompt
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

${surveillance ? 'CCTV security camera footage. Low-quality fixed surveillance camera mounted in upper corner of room. Digital noise, slightly soft focus. Neutral color — do NOT add any color tint, green cast, or color grading. The image should have flat, ungraded color straight from the sensor. This is NOT a professional photograph — it is a frame extracted from a security camera feed.' : isDailyLife ? 'Fashion editorial photography in a REAL, MUNDANE, EVERYDAY location. The model is NOT posing — she is performing a natural daily-life action while wearing high-fashion garments. The friction between MODE (high fashion) and NICHIJŌ (daily life) is the concept. Treat this like a documentary fashion photographer who discovered an impossibly stylish woman doing ordinary things.' : 'Professional high-end fashion photography.'}
Generate an image using the EXACT model appearance from the provided model reference images. This is an AI-generated virtual model, not a real person. She does not represent any existing individual. The face close-up is provided — reproduce the face, facial features, expression, AND MAKEUP with maximum accuracy. Face, skin tone, hairstyle must match exactly.
CRITICAL SKIN TONE RULE: The model's skin color for the ENTIRE BODY (face, neck, arms, hands, legs, feet) MUST match the skin tone shown in the provided face reference image. Do NOT use the skin color of any model in the garment reference images. The garment reference images are ONLY for clothing — ignore the skin color of the model wearing them. If the face reference shows light skin, the entire body must be light. This applies to ALL visible skin.
The model is ${height}cm tall with a slim, high-fashion build.
${cyberNeon ? 'wearing EXACTLY the garments shown in the provided reference images. If multiple garment reference images are provided, layer them together — the dress/base garment underneath, with the jacket/top worn OVER it. If only ONE garment reference image is provided, wear ONLY that garment — do NOT add any extra layers, jackets, or outerwear that are not in the reference images.' : `wearing EXACTLY the garments shown in the provided reference images.${tuckNote}${outerNote}`}${tightsNote}

SCENE & STYLING DIRECTION (THIS IS THE PRIMARY CREATIVE BRIEF — follow it faithfully): ${story}

${surveillance ? `CCTV QUALITY: Digital noise, slightly soft, flat color profile. Slight wide-angle barrel distortion. Frame looks like it was grabbed from a continuous 24/7 video feed. NOT cinematic, NOT film-like — purely functional surveillance imagery.` : (filmText ? filmText : `Shot on ARRI Alexa Mini LF — large format cinema camera. The image has the rich, organic quality of high-end digital cinema: extraordinary dynamic range, beautiful highlight roll-off, and skin tones that rival medium format film. The large sensor produces natural, cinematic shallow depth of field.
QUALITY: Cinema-grade 4K resolution. Photorealistic, ultra-detailed rendering with fine texture details. The image should feel like a still frame from a luxury fashion film.`)}
Realistic skin texture, natural pose, professional model.
${threadsMode
  ? 'EXPRESSION: NEUTRAL, CALM, EDITORIAL. A standard high-fashion editorial expression — mouth closed, face relaxed, no tension in the jaw. Not smiling, not angry, not cold. Simply present. The expression should NOT draw attention — the viewer should look at the clothes first, the face second. Think of a standard Vogue or SPUR editorial where the model is beautiful but not intimidating. No defiance, no challenge, no lifted chin. Just a calm, composed, quietly confident face.'
  : isDailyLife
  ? 'EXPRESSION: COLD, EMOTIONLESS, UNTOUCHABLE. Her face reveals nothing — like a marble sculpture placed in a mundane environment. Jaw set, chin slightly lifted, eyes sharp and empty. No smile, no warmth, no curiosity, no reaction to anything around her. She is not "a person doing errands" — she is an entity that happens to be in a ramen shop, a laundromat, a convenience store. The contrast between her ice-cold haute couture expression and the utterly ordinary surroundings is the entire point. If she looks like she belongs in this place, you have FAILED.'
  : 'EXPRESSION: Emotionless, eternal beauty — a face that reveals nothing, like a sculpture. No smile, no warmth, no sadness. Perfectly composed, untouchable, timeless.'}
${cyberNeon ? (neonIntensity === 'strong' ? 'LIGHTING PRIORITY: NIGHT SCENE — EXTREME NEON INTENSITY. The neon signs are the ONLY light and they are CLOSE and POWERFUL. The model\'s skin is SATURATED with color — not tinted, FLOODED. One side of her face is nearly SOLID in the primary neon color, the other side SOLID in the secondary. The effect is almost like a Warhol silkscreen or a Refn close-up — graphic, poster-like color on skin. Shadows are PURE BLACK. There is ZERO ambient fill. The neon OVERWHELMS the natural skin tone.' : 'LIGHTING PRIORITY: NIGHT SCENE — The ONLY light sources are neon signs and LED displays from the surrounding city. There is NO sun, NO daylight, NO studio lighting. The two-tone neon colors defined in the system prompt are the primary light on the model. The wet street surface reflects the neon. Shadows are deep black. The image should feel like a still frame from a Nicolas Winding Refn film.') : isDailyLife && timeOfDay === 'day' ? 'LIGHTING PRIORITY: Use the REAL, AUTHENTIC lighting of the location — fluorescent tubes in a convenience store, warm tungsten in a kissaten, harsh overhead in a laundromat, mixed natural + artificial in a train car. Do NOT beautify or romanticize the light. The mundane quality of the lighting IS the aesthetic. Shoot the light as it actually exists in the space. The contrast between ugly/boring real-world lighting and the beautiful garment is what makes this powerful.'
: timeOfDay === 'day' ? 'LIGHTING PRIORITY: Even when shooting at indoor locations or inside buildings, actively seek BRIGHT, well-lit scenes. Position the model near windows, doorways, open courtyards, or any source of natural daylight. At least half of the shots should feel bright and luminous.' : timeOfDay === 'golden' ? 'LIGHTING PRIORITY: All scenes are bathed in golden hour light — warm, amber, low-angle sun. Seek windows, doorways, and openings that let this warm directional light flood in. Shadows are long and dramatic. Skin glows.' : timeOfDay === 'dawn' ? 'LIGHTING PRIORITY: The light is early dawn — cool, blue-grey, quiet. Seek the faint directional light from windows facing east. The world is still, muted, and cold. Minimal harsh contrast.' : timeOfDay === 'overcast' ? 'LIGHTING PRIORITY: Soft, even, diffused overcast daylight. No harsh shadows, no direct sun. Colors are slightly desaturated. The light is democratic — it wraps evenly around everything.' : timeOfDay === 'dusk' ? 'LIGHTING PRIORITY: Blue hour / dusk light — cool blue ambient from outside, warm artificial glow from interior sources. Seek the interplay between cool and warm. The fading daylight creates a melancholic, cinematic atmosphere.' : timeOfDay === 'night' ? 'LIGHTING PRIORITY: NIGHT — no natural light. All illumination is artificial: street lamps, neon signs, fluorescent interiors, car headlights, LED displays, vending machine glow. Windows show darkness outside. Interior scenes have harsh fluorescent or warm tungsten. Exterior scenes have isolated pools of light surrounded by deep shadow. The mood is urban, solitary, cinematic.' : 'LIGHTING PRIORITY: Use natural available light appropriate to the time of day.'}
IMPORTANT: Show the full body including feet if shoes/footwear are included.
IMPORTANT: The model must ALWAYS stand on dry ground.
CRITICAL: DO NOT render any text, labels, watermarks, or words on the image.${surveillance ? '\nDO NOT render any CCTV timestamps, camera labels, or overlay text. Text overlays will be added separately in post-processing.\nDO NOT render any security cameras, CCTV cameras, surveillance equipment, camera housings, or recording devices in the image. The image is shot FROM the camera — the camera itself is NEVER visible.' : ''}
ACCESSORIES RULE: The model must NOT wear any rings, bracelets, necklaces, or jewelry unless they are explicitly provided as reference images.${
  !hasBag ? '\nBAG RULE: If a bag is provided in the reference images, reproduce it exactly. If NO bag reference is provided, the model must NOT carry any bag — hands should be empty, in pockets, or resting naturally.' : ''
}${
  !hasShoes ? '\nSHOES RULE: The model must wear EXACTLY the shoes shown in the reference images. Do NOT replace sneakers with heels, pumps, boots, or any other footwear. Do NOT change the shoe style, color, or type regardless of the pose or mood. If the reference shows sneakers, the model wears sneakers — even in provocative, sculptural, or editorial poses. Never barefoot.' : ''
}
REMINDER: The garments MUST be exact copies from the reference images - not interpretations or similar items.
GARMENT SHAPE RULE: Do NOT add, extend, or modify the garment silhouette. If the reference shows a jacket, do NOT add flowing fabric, trailing hem, or cape-like extensions. If the reference shows a short skirt, do NOT make it long. The garment's LENGTH, SHAPE, and SILHOUETTE must match the reference images EXACTLY. No phantom fabric.${
  oversizeTop ? '\nOVERSIZE TOP RULE: The top/jacket/shirt MUST be worn in a DELIBERATELY OVERSIZED, menswear-inspired fit. Scale the garment UP — dropped shoulders falling well past the natural shoulder line, sleeves extending past the wrists, the body of the garment hanging loose and boxy with extra volume. The fit should look like the model borrowed it from someone 2-3 sizes larger. The silhouette becomes relaxed, slouchy, and effortlessly cool. This overrides the reference fit — keep the same garment design, color, and details but SCALE IT UP significantly.' : ''
}${
  oversizeBottom ? '\nOVERSIZE BOTTOM RULE: The pants/skirt/bottoms MUST be worn in a DELIBERATELY OVERSIZED, relaxed fit. Scale the garment UP — wide legs with generous drape, low-slung or pooling at the ankles, extra fabric creating natural folds and volume. The fit should look like the model grabbed pants 2-3 sizes too large and made it work. Think 90s-era baggy silhouette — Yohji Yamamoto, early Margiela. This overrides the reference fit — keep the same garment design, color, and details but SCALE IT UP significantly.' : ''
}`;

  // Assemble shots
  const shots = plan.map((p, idx) => {
    const tmpl = TEMPLATES[p.id];
    if (!tmpl) return null;

    let template = tmpl.template;

    // Lens handling:
    // - Still Photo mode: keep template's original LENS line (individual lenses per shot)
    // - Film presets: strip LENS (film camera defines the lens)
    // - Default (cinema): replace LENS with Summilux-C series, focal length based on template type
    if (isStillPhoto) {
      // Keep original LENS and ARTISTIC DIRECTION — do nothing
    } else if (filmText) {
      // Film presets: strip all camera/lens references
      template = template.replace(/\nLENS:.*$/gm, '');
      template = template.replace(/ARTISTIC DIRECTION: Shot on [^.]+\.\n?/g, '');
      template = template.replace(/LIGHTING & LENS:[^\n]*The [A-Z][a-z]+ [^\n]*\./g, (match) => {
        // Keep the lighting/composition instruction, remove the lens-specific part
        return match.replace(/The [A-Z][a-z]+ [\w\s/.''-]+renders?[^.]*\./g, '').replace(/The [A-Z][a-z]+ at f\/[\d.]+ [^.]*\./g, '');
      });
    } else if (!surveillance) {
      // Cinema mode: replace ALL camera/lens specs with Summilux-C
      const cat = tmpl.cat.toLowerCase();
      const desc = tmpl.desc.toLowerCase();
      let focalLength = '35mm';
      if (cat.includes('detail a') || desc.includes('face') || desc.includes('portrait') || desc.includes('upper body') || desc.includes('close-up')) {
        focalLength = '75mm';
      } else if (cat.includes('detail b') || desc.includes('texture') || desc.includes('bag') || desc.includes('shoe')) {
        focalLength = '100mm';
      } else if (desc.includes('wide') || desc.includes('establishing') || desc.includes('corridor') || desc.includes('catwalk')) {
        focalLength = '25mm';
      } else if (desc.includes('walking') || desc.includes('medium') || desc.includes('lean') || desc.includes('seated')) {
        focalLength = '50mm';
      }
      const cinemaLens = `Shot on ARRI Alexa Mini LF with Leica Summilux-C ${focalLength} — cinema-grade optics with beautiful bokeh and consistent color rendering across the Summilux-C set.`;
      // Replace LENS: line
      template = template.replace(/\nLENS:.*$/gm, `\nLENS: ${cinemaLens}`);
      // Replace ARTISTIC DIRECTION: Shot on ... line entirely
      template = template.replace(/ARTISTIC DIRECTION:.*Shot on [^\n]+/g, `ARTISTIC DIRECTION: ${cinemaLens}`);
      // Remove ALL remaining old lens/camera brand references from template text
      const oldBrands = /(?:Leica (?:Noctilux|Summilux-M|Summicron)[^\n.]*|Zeiss (?:Otus|Batis)[^\n.]*|Hasselblad XCD[^\n.]*|Fujifilm GF[^\n.]*|Canon (?:RF|TS-E)[^\n.]*|Contax (?:Planar|G2)[^\n.]*|Sigma \d+mm[^\n.]*|Sony FE[^\n.]*|Voigtlander Nokton[^\n.]*|Mamiya \d[^\n.]*|Nikon Nikkor[^\n.]*)/gi;
      template = template.replace(oldBrands, '');
      // Clean up sentences that reference specific lens rendering characteristics
      template = template.replace(/The (?:Nokton|Noctilux|Otus|Batis|Planar|Summilux-M|Summicron|Mamiya|Hasselblad|Fujifilm|Canon|Sony|Sigma)[^.]*\./gi, '');
      // If template has no LENS or ARTISTIC DIRECTION line at all, append cinema lens
      if (!template.includes('Summilux-C') && !template.includes('ARRI')) {
        template += `\nLENS: ${cinemaLens}`;
      }
    }

    // Surveillance mode: prepend AND append CCTV camera spec to override everything
    if (surveillance) {
      const cctvOverride = 'MANDATORY CAMERA POSITION: This image is captured by a FIXED CCTV security camera mounted on the CEILING or HIGH on a WALL at 3-4 meters height. The camera looks DOWNWARD at 30-45 degrees. The viewer sees the TOP OF THE SUBJECT\'S HEAD, her shoulders from above, and the floor. This is NOT eye-level. NOT from the side. NOT from below. The camera is HIGH UP looking DOWN. Think of a real security camera in a shop or museum — that exact angle.';
      template = cctvOverride + '\n' + template;
      template += '\nCAMERA: Wide-angle 12-16mm fixed lens with slight barrel distortion. CCTV sensor quality — digital noise, slightly soft, washed-out color. HIGH ANGLE looking DOWN.';
      template += '\nLIGHTING: Overhead fluorescent or mixed ambient — typical institutional lighting. Even, flat, functional light.';
    }

    // Strip bag references from template if no bag
    if (!hasBag) {
      template = template
        .replace(/\s*(?:and\s+)?BAG(?:\/ACCESSORIES)?\s+(?:clearly\s+)?visible\.?/gi, '')
        .replace(/\s*SHOES\s+and\s+BAG\s+clearly\s+visible\./gi, ' SHOES clearly visible.')
        .replace(/\s*Both\s+SHOES\s+and\s+BAG\s+clearly\s+visible\./gi, ' SHOES clearly visible.')
        .replace(/One hand holding bag, other relaxed\./gi, 'Hands relaxed, in pockets, or resting naturally.')
        .replace(/One hand on bag,/gi, 'One hand on knee,')
        .replace(/BAG placed beside her on the surface, casually but visible\.\s*/gi, '')
        .replace(/Bag swings naturally with walking motion\.\s*/gi, '');
    }

    // B-Roll mode: all shots have model at 25% of frame
    let finalCustomNote = p.customNote;
    let bRollType: 'EDGE' | null = null;
    if (cinematicMix) {
      bRollType = 'EDGE';
      finalCustomNote = `COMPOSITION OVERRIDE — MODEL AT EDGE ONLY: The model's FULL BODY is visible at realistic 175cm human scale — do NOT crop, cut off, or partially hide the body behind the frame border. She is small in the frame because the camera is FAR AWAY, not because she is cropped. She occupies LESS THAN 25% of the frame area and is positioned near the left or right edge. The remaining 75%+ of the frame shows the environment. Maintain correct human proportions and full-body visibility at all times.\n\nENVIRONMENT IS THE HERO: The space must feel vast, immersive, and cinematic. Use dramatic perspective — deep vanishing points, strong diagonal lines, sweeping depth, wide-angle distortion. Whether indoors (towering ceilings, endless corridors, layered architecture) or outdoors (expansive skies, dramatic landscapes, deep urban canyons), maximize the scale and visual impact of the environment. The model is a small figure placed within this grand space, giving human scale to the scene's magnitude.\n\nScene context: ${p.customNote}`;
    }

    return {
      id: p.id,
      customNote: finalCustomNote,
      templateDesc: tmpl.desc,
      templateCat: tmpl.cat,
      cameraLabel: p.cameraLabel || undefined,
      bRollType,
      prompt: `${basePrompt}\n\n${template}\n\nSCENE-SPECIFIC NOTE: ${finalCustomNote}`,
    };
  }).filter(Boolean);

  return NextResponse.json({ shots });
}

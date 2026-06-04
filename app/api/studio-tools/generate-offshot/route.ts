import { NextRequest, NextResponse } from 'next/server';
import { buildPromptFromPayload, buildOffshotPOV } from '@/app/api/ai/gemini-image/prompt-builder';
import { checkStudioPasscode } from '../_guard';

export async function POST(req: NextRequest) {
  const denied = checkStudioPasscode(req);
  if (denied) return denied;

  const { location, scene, shotCount = 6, isJapan = false, soloMode = false, povMode = false, height = '175', tuck = 'none', outer = 'none' } = await req.json();

  if (!location) {
    return NextResponse.json({ error: 'Location is required' }, { status: 400 });
  }

  // Solo mode (no crew): use 日本 keyword to trigger Japan mode in prompt-builder
  // which replaces crew with invisible friend photographer + solo shots
  // The actual location stays as-is (can be Paris, London, anywhere)
  const customPrompt = (isJapan || soloMode) ? `日本 ${location}` : location;

  // Determine offshotVariant
  // A, B, C are variants; breakfast/lunch/dinner/nightclub/pub-bar/snap are scene-specific
  const variantMap: Record<string, string> = {
    'A': 'A',
    'B': 'B',
    'C': 'C',
    'breakfast': 'breakfast',
    'lunch': 'lunch',
    'dinner': 'dinner',
    'nightclub': 'nightclub',
    'pub-bar': 'pub-bar',
    'snap': 'snap',
  };

  const offshotVariant = variantMap[scene] || 'A';

  // ── POV Mode: always 6 shots, uses buildOffshotPOV directly ──
  if (povMode) {
    const heightNote = height ? ` The model is ${height}cm tall.` : '';
    const povModelDesc = `Generate an image using the EXACT model appearance from the provided model reference images. A full-body reference AND a face close-up crop are provided — use the close-up to ensure the face, facial features, expression, AND MAKEUP are reproduced with maximum accuracy and consistency across all shots. Face, body type, skin tone, and all visible cosmetics (eye makeup, lip color, brow shape, contour) must match exactly.${heightNote}`;
    const povGarmentDesc = 'wearing EXACTLY the garment shown in the provided reference images';
    const povShotLabels = ['Table POV', 'Legs/Lap POV', 'Mirror Selfie', 'Arm Selfie', 'Walking/Feet POV', 'Window/View POV'];

    const povShots = [];
    for (let i = 0; i < 6; i++) {
      const tuckNote = tuck === 'tuck-in' ? ' The inner top/shirt MUST be fully TUCKED IN.'
        : tuck === 'tuck-out' ? ' The inner top/shirt MUST be UNTUCKED.'
        : tuck === 'french-tuck' ? ' The inner top/shirt MUST have a FRENCH TUCK.'
        : '';
      const outerNote = outer === 'open' ? ' The jacket/coat MUST be worn OPEN.'
        : outer === 'closed' ? ' The jacket/coat MUST be worn CLOSED and buttoned/zipped.'
        : '';
      const stylingExtra = tuckNote || outerNote ? `${tuckNote}${outerNote}` : '';

      let prompt = buildOffshotPOV(povModelDesc, povGarmentDesc, location, i);
      if (stylingExtra) {
        prompt = `${prompt}\n\nSTYLING OVERRIDE:${stylingExtra}`;
      }

      povShots.push({
        index: i,
        prompt,
        summary: povShotLabels[i],
      });
    }

    return NextResponse.json({ shots: povShots, scene: 'pov', isJapan: false });
  }

  const shots = [];
  for (let i = 0; i < shotCount; i++) {
    const tuckNote = tuck === 'tuck-in' ? ' The inner top/shirt MUST be fully TUCKED IN.'
      : tuck === 'tuck-out' ? ' The inner top/shirt MUST be UNTUCKED.'
      : tuck === 'french-tuck' ? ' The inner top/shirt MUST have a FRENCH TUCK.'
      : '';
    const outerNote = outer === 'open' ? ' The jacket/coat MUST be worn OPEN.'
      : outer === 'closed' ? ' The jacket/coat MUST be worn CLOSED and buttoned/zipped.'
      : '';
    const stylingExtra = tuckNote || outerNote ? `${tuckNote}${outerNote}` : '';

    const prompt = buildPromptFromPayload({
      modelSettings: { height },
      modelImage: true,
      background: '',
      customPrompt,
      aspectRatio: '3:4',
      locale: 'ja',
      sceneVariant: undefined,
      detailMode: undefined,
      offshot: true,
      offshotVariant,
      shotIndex: i,
      totalShots: shotCount,
      garmentImages: ['placeholder'],
      secondGarmentImages: [],
      thirdGarmentImages: [],
      fourthGarmentImages: [],
      fifthGarmentImages: [],
    });

    // Solo mode override: remove Japan-specific references if soloMode is on but not actually in Japan
    let processedPrompt = prompt;
    if (soloMode && !isJapan) {
      processedPrompt = processedPrompt
        .replace(/This is in JAPAN\.\s*/gi, '')
        .replace(/a stylish Japanese woman of similar age[^.]*\./gi, 'a close female friend of similar age with a different hairstyle.')
        .replace(/Japanese woman/gi, 'woman')
        .replace(/local Japanese/gi, 'local');
    }

    // Append styling instructions if set
    const finalPrompt = stylingExtra ? `${processedPrompt}\n\nSTYLING OVERRIDE:${stylingExtra}` : processedPrompt;

    // Extract summary from prompt — Japanese keywords
    const sceneMatch = prompt.match(/SCENE: The model (.+?)(?:\.\s|$)/m);
    let summary = '';
    if (sceneMatch) {
      const raw = sceneMatch[1].toLowerCase();

      if (/selfie|front-facing phone/i.test(raw)) {
        summary = '友達とツーショット（セルフィー）';
      } else {
        // Keyword-based Japanese summary
        const keywords: [RegExp, string][] = [
          [/coffee cup|holding a latte|cappuccino/, 'コーヒーを持って'],
          [/chin.*hand|resting.*elegantly/, 'エレガントなポーズ'],
          [/pancake|pastry|toast|granola|breakfast/, '朝食を食べながら'],
          [/orange juice|sipping/, 'ドリンクを飲みながら'],
          [/fork|mid-bite|eating|food/, '食事中'],
          [/wine|glass|raises.*glass|sip of wine/, 'ワインを持って'],
          [/cocktail|drink.*bar|beer/, 'カクテル/ドリンクを持って'],
          [/dance floor|dancing/, 'ダンスフロアで'],
          [/leaning|leans.*bar|sits at the bar/, 'バーカウンターにて'],
          [/chin.*hands|resting.*chin/, '頬杖をついて'],
          [/laughs|laughing|amused/, 'クールな微笑みで'],
          [/walking|walks/, '歩きながら'],
          [/standing|stands at/, '立ちポーズ'],
          [/sitting|sits/, '座って'],
          [/phone|scrolling/, 'スマホを見ながら'],
          [/looking at the camera|looking directly/, 'カメラ目線'],
          [/window|looking out/, '窓の外を見て'],
          [/mirror|checking/, '鏡をチェック'],
          [/club|neon/, 'クラブにて'],
          [/outside|cooling off/, '外の空気を吸いながら'],
        ];

        const matched: string[] = [];
        for (const [pattern, label] of keywords) {
          if (pattern.test(raw) && !matched.includes(label)) {
            matched.push(label);
            if (matched.length >= 2) break;
          }
        }

        const isSolo = /SOLO SHOT/i.test(sceneMatch[1]);
        const prefix = isSolo ? '凛ソロ' : '';
        summary = prefix + (prefix && matched.length ? ' — ' : '') + (matched.join('、') || 'キャンディッドショット');
      }
    }

    shots.push({
      index: i,
      prompt: finalPrompt,
      summary,
    });
  }

  return NextResponse.json({ shots, scene: offshotVariant, isJapan });
}

import { NextRequest, NextResponse } from 'next/server';
import { loadRecipe, readRecipeFile, stepIntoAllowed } from '@/lib/latitude-recipe';

// LATITUDE「Step into this look」：見る人の顔で、そのページの場所・光・服の1枚を作る（APIMart の Nano Banana 2.1 EXT）。
// GET ?slug=&file=garments/..&key=  服の写真（シートの小さな写真）
// POST { slug, page, face(dataURL), key }  生成を送る → { taskId }
// GET ?task=&key=  できたか → { status, url }
// 今は合言葉（公開前の確認用）がある時だけ動く。顔の写真は生成に送るだけで、ここでは保存しない。

const APIMART_API_KEY = process.env.APIMART_API_KEY;
const MODEL = 'gemini-nano-banana-2.1-ext';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  if (!stepIntoAllowed(sp.get('key'))) return NextResponse.json({ error: 'not available' }, { status: 404 });
  const file = sp.get('file');
  if (file) {
    const buf = await readRecipeFile(sp.get('slug') || '', file);
    if (!buf) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return new NextResponse(new Uint8Array(buf), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' } });
  }
  const task = sp.get('task');
  if (!task || !/^[A-Za-z0-9_-]+$/.test(task) || !APIMART_API_KEY) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  const res = await fetch(`https://api.apimart.ai/v1/tasks/${task}`, { headers: { Authorization: `Bearer ${APIMART_API_KEY}` } });
  if (!res.ok) return NextResponse.json({ status: 'processing' });
  const d = await res.json();
  const status: string = d.data?.status ?? 'unknown';
  if (status === 'completed') {
    const img = d.data?.result?.images?.[0];
    const url = Array.isArray(img?.url) ? img.url[0] : img?.url;
    return NextResponse.json({ status: 'completed', url });
  }
  if (status === 'failed' || status === 'error') return NextResponse.json({ status: 'failed' });
  return NextResponse.json({ status: 'processing' });
}

const toDataUrl = (buf: Buffer) => `data:image/jpeg;base64,${buf.toString('base64')}`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !stepIntoAllowed(body.key)) return NextResponse.json({ error: 'not available' }, { status: 404 });
  if (!APIMART_API_KEY) return NextResponse.json({ error: 'not configured' }, { status: 500 });
  const { slug, page, face } = body as { slug: string; page: number; face: string };
  if (typeof face !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(face) || face.length > 8_000_000) {
    return NextResponse.json({ error: 'face photo required' }, { status: 400 });
  }
  const recipe = await loadRecipe(slug);
  const p = recipe?.pages.find((x) => x.page === Number(page));
  if (!recipe || !p || !p.look || !p.scene) return NextResponse.json({ error: 'no look on this page' }, { status: 400 });
  const look = recipe.looks[String(p.look)];
  const scene = await readRecipeFile(slug, p.scene);
  const garments = (await Promise.all(look.garments.map((g) => readRecipeFile(slug, g)))).filter((b): b is Buffer => !!b);
  if (!scene || !garments.length) return NextResponse.json({ error: 'recipe files missing' }, { status: 500 });

  const n = garments.length;
  const prompt =
    `Image 1 is a photograph from a fashion magazine. Recreate Image 1 as the same photograph: the same place, the same camera position and framing, ` +
    `the same light, colours and film look, the same background and any other people exactly as they are. ` +
    `Replace the woman in Image 1 with the person in the LAST image: reproduce that person's face, facial features, hair and skin exactly. ` +
    `She wears EXACTLY the garments in images 2 to ${n + 1}, worn the same way as in Image 1, and keeps the same pose and gesture. ` +
    `Photorealistic and natural. No text, no logos, no watermark.`;

  const res = await fetch('https://api.apimart.ai/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${APIMART_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size: p.aspectRatio || '3:4',
      resolution: '2K',
      n: 1,
      image_urls: [toDataUrl(scene), ...garments.map(toDataUrl), face],
    }),
  });
  if (!res.ok) return NextResponse.json({ error: 'submit failed' }, { status: 502 });
  const d = await res.json();
  const taskId = d.data?.[0]?.task_id ?? d.data?.task_id ?? d.task_id;
  if (!taskId) return NextResponse.json({ error: 'submit failed' }, { status: 502 });
  return NextResponse.json({ taskId });
}

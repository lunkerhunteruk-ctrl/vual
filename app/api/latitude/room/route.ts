import { NextRequest, NextResponse } from 'next/server';
import { getRoom, roomsOpen } from '@/lib/latitude-rooms';
import { logUse, usedToday, visitor } from '@/lib/latitude-usage';

// LATITUDE の部屋：会話を始めるための、1回きりの入口を ElevenLabs からもらって渡す（会話設定は署名つきの入口からしか始まらない）。
// GET ?person=rin&mode=text → { signedUrl }（文字の部屋・WebSocket）
// GET ?person=rin&mode=call → { conversationToken, seconds }（通話・WebRTC）
// 1人1日の回数は lib/latitude-rooms.ts。記録は latitude-logs/room-<mode>/<person>/<日付>/ に回数だけ（会話の中身は ElevenLabs 側に30日）。

const KEY = process.env.ELEVENLABS_API_KEY;

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const room = getRoom(sp.get('person') || '');
  const mode = sp.get('mode') === 'call' ? 'call' : 'text';
  if (!room || !roomsOpen()) return NextResponse.json({ error: 'not available' }, { status: 404 });
  if (!KEY) return NextResponse.json({ error: 'not configured' }, { status: 503 });

  const v = visitor(req);
  const kind = `room-${mode}/${room.person}` as const;
  const limit = mode === 'call' ? room.callsPerDay : room.textPerDay;
  // 手元（開発中）は回数の上限をかけない（試しで同じ接続元の回数がすぐ埋まるため）。公開したサイトでは上限あり
  const dev = process.env.NODE_ENV !== 'production';
  if (!dev && (await usedToday(kind, v)) >= limit) return NextResponse.json({ error: 'limit', limit }, { status: 429 });

  const agent = mode === 'call' ? room.callAgentId : room.textAgentId;
  const url = mode === 'call'
    ? `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agent}`
    : `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agent}`;
  const res = await fetch(url, { headers: { 'xi-api-key': KEY }, cache: 'no-store' });
  if (!res.ok) return NextResponse.json({ error: 'upstream', status: res.status }, { status: 502 });
  const d = await res.json();

  await logUse(kind, v, { mode, person: room.person, page: (sp.get('page') || '').slice(0, 80) });
  const out = NextResponse.json(mode === 'call' ? { conversationToken: d.token, seconds: room.callSeconds } : { signedUrl: d.signed_url });
  if (v.isNew) out.cookies.set('lat_vid', v.vid, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' });
  out.headers.set('Cache-Control', 'no-store');
  return out;
}

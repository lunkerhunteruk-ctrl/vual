import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse, after } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { getRoom, roomsOpen } from '@/lib/latitude-rooms';
import { logUse, usedToday, visitor } from '@/lib/latitude-usage';
import { createServerClient } from '@/lib/supabase';

// 2026-10-30 旅人との文字のチャット。サイトが Gemini（gemini-3.5-flash-lite）で直接返す（ユーザー指定：Ultra の毎月の Google のクレジットを使う。通話だけ ElevenLabs）。
// 人物の説明・店の一覧・決まりは lib/latitude-prompts/<人>-text.txt（vault.vual.jp/tools/rin-call-agent.cjs が書き出す。通話の設定と同じ中身）。
// POST { person, messages: [{ role: 'user'|'her', text }], context?, lang? } → { reply, end }
// 会話の文字は、直すために latitude-logs/chat/<日付>/ に30日だけ残す（画面にそう書いてある。古い物は scripts/latitude-stats.mjs が消す）。

// Gemini は Vertex AI（Google Cloud）から呼ぶ。プロジェクト vual-production-a7298 の請求先に Google Developer Program の毎月のクレジットが付いているので、そこから引かれる。
// AI Studio の鍵（GEMINI_API_KEY）は前払いの残高が切れていて、このクレジットは使えなかった（2026-10-30 確認）。GEMINI_CHAT_API_KEY があれば、そちらを使う。
// 認証：本番は GCP_SERVICE_ACCOUNT_JSON、手元は GOOGLE_APPLICATION_CREDENTIALS（vual-vertex-ai のサービスアカウント）。モデルは global の場所にだけある。
const KEY = process.env.GEMINI_CHAT_API_KEY;
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCP_PROJECT_ID;
const SA = process.env.GCP_SERVICE_ACCOUNT_JSON;
const vertex = !!PROJECT && (!!SA || !!process.env.GOOGLE_APPLICATION_CREDENTIALS);
let auth: GoogleAuth | null = null;
async function vertexToken() {
  auth ??= new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'], ...(SA ? { credentials: JSON.parse(SA) } : {}) });
  return (await (await auth.getClient()).getAccessToken()).token;
}
const MODEL = 'gemini-3.5-flash-lite';
const PER_DAY = 200; // 1人1日に送れる数（公開したサイトだけ。まだ人が少ないので緩め。2026-10-30）
type Msg = { role: 'user' | 'her'; text: string };

const prompts = new Map<string, string>();
async function prompt(person: string) {
  if (process.env.NODE_ENV !== 'production') prompts.delete(person); // 手元では、書き出し直した指示をすぐ読む
  if (!prompts.has(person)) prompts.set(person, await fs.readFile(path.join(process.cwd(), 'lib/latitude-prompts', `${person}-text.txt`), 'utf8'));
  return prompts.get(person)!;
}

// 文字のチャットを Gemini で返せるか（鍵があるか）。無い間は、画面が ElevenLabs の文字の会話を使う
export async function GET() {
  return NextResponse.json({ ready: (!!KEY || vertex) && roomsOpen() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  let b: { person?: string; messages?: Msg[]; context?: string; lang?: string; session?: string } = {};
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'bad request' }, { status: 400 }); }
  const room = getRoom(b.person || '');
  if (!room || !roomsOpen()) return NextResponse.json({ error: 'not available' }, { status: 404 });
  if (!KEY && !vertex) return NextResponse.json({ error: 'not configured' }, { status: 503 });
  const msgs = (b.messages || []).filter((m) => m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'her'))
    .slice(-24).map((m) => ({ role: m.role, text: m.text.slice(0, 600) }));
  if (!msgs.length || msgs.at(-1)!.role !== 'user') return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const v = visitor(req);
  const kind = `room-text/${room.person}` as const;
  const dev = process.env.NODE_ENV !== 'production';
  if (!dev && (await usedToday(`chat-msg/${room.person}`, v)) >= PER_DAY) return NextResponse.json({ error: 'limit' }, { status: 429 });

  const system = (await prompt(room.person))
    + (b.context ? `\n\n## いまの状況\n${String(b.context).slice(0, 300)}` : '')
    + (b.lang === 'en' ? '\n\nThe visitor came from the English page: answer in English unless they write in Japanese.' : '');
  const url = KEY
    ? `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
    : `https://aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/global/publishers/google/models/${MODEL}:generateContent`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(KEY ? { 'x-goog-api-key': KEY } : { Authorization: `Bearer ${await vertexToken()}` }) };
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: msgs.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),

      // 考える時間を0にして速く返す（短い会話なので質は落ちない。2026-10-30 試して決めた）
      generationConfig: { temperature: 0.6, maxOutputTokens: 400, thinkingConfig: { thinkingBudget: 0 } },
    }),
    cache: 'no-store',
  });
  if (!res.ok) return NextResponse.json({ error: 'upstream', status: res.status }, { status: 502 });
  const d = await res.json();
  let reply: string = (d.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('').trim();
  const end = /\[\[END\]\]/.test(reply);
  reply = reply.replace(/\[\[END\]\]/g, '').replace(/\[[a-z ,-]+\]\s*/gi, '').trim();
  if (!reply) reply = b.lang === 'en' ? 'Sorry. Say that again?' : 'ごめん、もう一回言って。';

  // 回数と、直すための文字の記録（30日）。返事を先に返し、記録はそのあとで（待たせると返事が約1秒遅れた）
  after(async () => {
    await logUse(`chat-msg/${room.person}` as `room-text/${string}`, v, { page: '' }).catch(() => {});
    if (msgs.length === 1) await logUse(kind, v, { mode: 'text', person: room.person, page: '' }).catch(() => {});
    const s = createServerClient();
    const session = String(b.session || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40) || 'x';
    const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    await s?.storage.from('latitude-logs').upload(`chat/${day}/${session}__${Date.now()}.json`,
      JSON.stringify({ at: new Date().toISOString(), person: room.person, user: msgs.at(-1)!.text, reply, end }), { contentType: 'application/json' }).catch(() => {});
  });

  return NextResponse.json({ reply, end }, { headers: { 'Cache-Control': 'no-store' } });
}

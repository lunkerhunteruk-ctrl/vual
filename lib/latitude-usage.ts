import { createHash, randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// LATITUDE「Step into this look」の利用の記録と回数の上限（2026-10-22 ユーザー指定：ログインなし・1人1日3回まで・まずどれくらい使われるかを見る）。
// 1人＝ブラウザの目印（クッキー lat_vid）と接続元IPのハッシュ。どちらかが今日3回に達したら止める。
// 記録は Supabase Storage の非公開の場所 latitude-logs/stepinto/<日本の日付>/ に小さな JSON で残す（顔の写真は残さない）。

export const DAILY_LIMIT = 3;
const BUCKET = 'latitude-logs';
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }); // YYYY-MM-DD

export function visitor(req: NextRequest) {
  const vid = req.cookies.get('lat_vid')?.value || randomUUID();
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  const ipHash = createHash('sha256').update(`latitude:${ip}`).digest('hex').slice(0, 16);
  return { vid: vid.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40), ipHash, isNew: !req.cookies.get('lat_vid') };
}

async function listToday(kind: string) {
  const s = createServerClient();
  if (!s) return [];
  const { data } = await s.storage.from(BUCKET).list(`${kind}/${today()}`, { limit: 1000 });
  return (data || []).map((o) => o.name);
}

// 今日あと何回使えるか
export async function remainingToday(v: { vid: string; ipHash: string }) {
  const names = await listToday('stepinto');
  const byVid = names.filter((n) => n.startsWith(`${v.vid}__`)).length;
  const byIp = names.filter((n) => n.split('__')[1] === v.ipHash).length;
  return Math.max(0, DAILY_LIMIT - Math.max(byVid, byIp));
}

// 1回ぶんを記録（kind: stepinto＝生成した／open＝体験の画面を開いた）
export async function logUse(kind: 'stepinto' | 'open', v: { vid: string; ipHash: string }, data: Record<string, unknown>) {
  const s = createServerClient();
  if (!s) return;
  const name = `${kind}/${today()}/${v.vid}__${v.ipHash}__${Date.now()}.json`;
  await s.storage.from(BUCKET).upload(name, JSON.stringify({ at: new Date().toISOString(), ...data }), { contentType: 'application/json' });
}

import { NextRequest, NextResponse } from 'next/server';
import { logUse, visitor } from '@/lib/latitude-usage';

// 2026-10-30 LATITUDE の街のページと旅人の会話の記録（手応えを、検索の数字より先に見るため）。
// POST { e, person, page, shop?, kind?, mode? } → latitude-logs/track/<e>/<日本の日付>/ に小さな JSON（会話の中身・個人の情報は残さない）。
// e：ask_open＝「凛に聞く」を開いた／ask_shop＝店の「凛に聞く」／msg＝凛に送った1通（文字・通話）／link＝店の公式サイト・地図を押した
// 集計は scripts/latitude-stats.mjs。

// 2026-11-14 ③ saved・shared・locate は回数だけ（店の名前・位置は来ない）
const EVENTS = new Set(['ask_open', 'ask_shop', 'msg', 'link', 'saved', 'shared', 'locate']);
const clean = (v: unknown) => (typeof v === 'string' ? v.slice(0, 80) : undefined);

export async function POST(req: NextRequest) {
  let b: Record<string, unknown> = {};
  try { b = JSON.parse(await req.text()); } catch { return new NextResponse(null, { status: 400 }); }
  const e = clean(b.e);
  if (!e || !EVENTS.has(e)) return new NextResponse(null, { status: 400 });
  const v = visitor(req);
  await logUse(`track/${e}`, v, { person: clean(b.person), page: clean(b.page), shop: clean(b.shop), kind: clean(b.kind), mode: clean(b.mode) });
  return new NextResponse(null, { status: 204 });
}

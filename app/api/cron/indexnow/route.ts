import { NextRequest, NextResponse } from 'next/server';
import { ISSUES } from '@/lib/latitude';
import { submitIndexNow } from '@/lib/indexnow';

// 2026-10-30 公開予約の LATITUDE の号が、この1日で公開になったら Bing などへ知らせる（vercel.json の cron が毎朝呼ぶ）。
// すぐ公開した号は、公開した時に scripts/indexnow.py で知らせる
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const now = Date.now();
  const fresh = ISSUES.filter((i) => {
    if (!i.publishAt) return false;
    const t = new Date(i.publishAt).getTime();
    return t <= now && t > now - 26 * 3600 * 1000;
  });
  const urls = fresh.flatMap((i) => [
    `https://vual.jp/en/latitude/${i.slug}`,
    ...(i.person ? [`https://vual.jp/en/latitude/people/${i.person}`] : []),
  ]);
  if (urls.length) urls.push('https://vual.jp/en/latitude');
  const result = await submitIndexNow([...new Set(urls)]);
  return NextResponse.json({ ok: true, ...result, urls });
}

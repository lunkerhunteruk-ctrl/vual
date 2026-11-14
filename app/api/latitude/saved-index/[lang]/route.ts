import { NextResponse } from 'next/server';
import { savedIndex } from '@/lib/latitude-saved-index';

// 2026-11-14 ③-2 保存した店の一覧（ブラウザで描く自分の一覧）が使う、店の id → 店名・種類と地区・住所。全部の店の一覧で、ビルドの時に作る。
// 見る人が何を保存したかは受け取らない（どの店か、の情報はここへ来ない）
export const dynamic = 'force-static';
export const generateStaticParams = () => [{ lang: 'ja' }, { lang: 'en' }];

export async function GET(_req: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (lang !== 'ja' && lang !== 'en') return NextResponse.json({}, { status: 404 });
  return NextResponse.json(savedIndex(lang === 'ja'));
}

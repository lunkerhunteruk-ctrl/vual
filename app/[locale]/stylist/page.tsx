import type { Metadata } from 'next';
import StylistPicker from '@/components/stylist/StylistPicker';

// スタイリスト用：VUAL オリジナルでコーデを組んで送るページ。招待のリンク（?key=）を持っている人だけが使える。2026-11-02
// どこからもリンクしない・検索に出さない
export const metadata: Metadata = {
  title: 'VUAL ORIGINALS — Style a day',
  robots: { index: false, follow: false, nocache: true },
};

export default async function StylistPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { locale } = await params;
  const { key } = await searchParams;
  return <StylistPicker locale={locale === 'en' ? 'en' : 'ja'} inviteKey={typeof key === 'string' ? key : ''} />;
}

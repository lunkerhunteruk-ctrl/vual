import type { Metadata } from 'next';
import Link from 'next/link';
import { assetUrl, issueNo, liveIssues } from '@/lib/latitude';
import { INK, IssueStrip, MUTE, PAPER, SERIF } from '@/components/latitude/Latitude';

// LATITUDE の一覧：公開中の号の表紙を、緯度の数字と一緒に並べる。公開予約の時刻を過ぎた号が出るよう、数分ごとに作り直す
export const revalidate = 300;

// LATITUDE の美学（ドキュメンタリーの手法で描く、架空の一日）。連絡文・紹介資料と同じ文
const STATEMENT_EN =
  'LATITUDE is a series of fictional days, filmed as if documented. The place — and one true thing about it — is real; the person and the day are imagined. We look for the beauty of clothes not in the posed moment, but in the time between.';
const STATEMENT_JA =
  'LATITUDE は、ひとつの緯度の、ある一日を記録するように描く連作です。場所と、その土地のひとつの事実は本物。人と一日は架空です。飾った瞬間ではなく、その間に流れる時間の中に、服の美しさを探しています。';
const MINCHO = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const description = locale === 'ja' ? STATEMENT_JA : STATEMENT_EN;
  return {
    title: 'LATITUDE — VUAL',
    description,
    openGraph: { type: 'website', siteName: 'VUAL', title: 'LATITUDE — VUAL', description, url: `https://vual.jp/${locale}/latitude` },
  };
}

export default async function LatitudeIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <IssueStrip locale={locale} />
      <header className="mx-auto max-w-6xl px-4 pb-14 pt-16 md:px-8 md:pb-24 md:pt-28">
        <h1 className="text-[56px] uppercase leading-none md:text-[104px]" style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: '0.12em', color: INK }}>
          Latitude
        </h1>
        <p className="mt-6 text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>
          A travelling issue by VUAL
        </p>
        {locale === 'ja' ? (
          <p className="mt-4 max-w-xl text-[15px] leading-[2.1] md:text-[17px]" style={{ fontFamily: MINCHO }}>
            {STATEMENT_JA}
          </p>
        ) : (
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed md:text-[20px]" style={{ fontFamily: SERIF }}>
            {STATEMENT_EN}
          </p>
        )}
      </header>
      <main className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-14 px-4 pb-28 md:grid-cols-4 md:gap-x-8 md:px-8">
        {liveIssues().map((i) => (
          <Link key={i.slug} href={`/${locale}/latitude/${i.slug}`} className="group block" style={{ color: INK }}>
            <div className="overflow-hidden" style={{ aspectRatio: '9 / 16' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(i, 'cover.jpg')}
                alt={`LATITUDE ${issueNo(i)} — ${i.latitude} ${i.city}`}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
            </div>
            <p className="mt-4 text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>
              {issueNo(i)}
            </p>
            <p className="mt-1 text-[26px] leading-tight" style={{ fontFamily: SERIF }}>
              {i.latitude}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.35em]">{i.city}</p>
          </Link>
        ))}
      </main>
    </div>
  );
}

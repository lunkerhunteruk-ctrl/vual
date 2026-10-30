import type { Metadata } from 'next';
import Link from 'next/link';
import { PEOPLE, assetUrl, issueNo, liveIssues } from '@/lib/latitude';
import { INK, IssueStrip, MUTE, NewsletterSignup, PAPER, PublishedBy, SERIF } from '@/components/latitude/Latitude';

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
    // 2026-10-30 本体の場所はこのページ自身（親の layout の canonical "/" を上書きする。上書きしないとトップの写しと見なされる）
    alternates: {
      canonical: `/${locale}/latitude`,
      languages: { en: '/en/latitude', ja: '/ja/latitude', 'x-default': '/en/latitude' },
    },
    // リンクの見え方：Fårö の灯台のページ＋LATITUDE の題（public/latitude/og-index.jpg。scripts/latitude-og.py で作る）
    openGraph: { type: 'website', siteName: 'VUAL', title: 'LATITUDE — VUAL', description, url: `https://vual.jp/${locale}/latitude`,
      images: [{ url: '/latitude/og-index.jpg', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title: 'LATITUDE — VUAL', description, images: ['/latitude/og-index.jpg'] },
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
        {/* 2026-10-30 6人それぞれの旅。名前からその人のページへ */}
        <nav className="mt-10">
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>People</p>
          <ul className="mt-3 flex flex-wrap gap-x-7 gap-y-2 text-[12px] uppercase tracking-[0.3em]">
            {PEOPLE.map((p) => (
              <li key={p.slug}>
                <Link href={`/${locale}/latitude/people/${p.slug}`} className="underline-offset-4 hover:underline" style={{ color: INK }}>{p.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="flex snap-x gap-4 overflow-x-auto px-4 pb-28 md:gap-8 md:px-8 lg:px-[max(2rem,calc((100vw-72rem)/2+2rem))]" style={{ scrollbarWidth: 'thin' }}>
        {liveIssues().map((i) => (
          <Link key={i.slug} href={`/${locale}/latitude/${i.slug}`} className="group block w-[62vw] shrink-0 snap-start md:w-[24vw] md:max-w-[300px]" style={{ color: INK }}>
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
      {/* 2026-10-30 次の号をメールで（Substack） */}
      <section className="mx-auto max-w-6xl px-4 pb-24 md:px-8">
        <NewsletterSignup locale={locale} />
      </section>
      <footer className="pb-16">
        <PublishedBy locale={locale} />
      </footer>
    </div>
  );
}

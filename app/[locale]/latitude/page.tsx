import type { Metadata } from 'next';
import Link from 'next/link';
import { ISSUES, assetUrl, issueNo } from '@/lib/latitude';
import { INK, IssueStrip, MUTE, PAPER, SERIF } from '@/components/latitude/Latitude';

// LATITUDE の一覧：全号の表紙を、緯度の数字と一緒に並べる

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const description = 'A travelling issue by VUAL. One city, one latitude, three places from morning to dusk.';
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
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed md:text-[20px]" style={{ fontFamily: SERIF }}>
          A travelling issue by VUAL. One city, one latitude, three places from morning to dusk.
        </p>
      </header>
      <main className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-14 px-4 pb-28 md:grid-cols-4 md:gap-x-8 md:px-8">
        {ISSUES.map((i) => (
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

import type { Metadata } from 'next';
import Link from 'next/link';
import { INK, IssueStrip, MUTE, PAPER, PublishedBy, SERIF, SectionLabel } from '@/components/latitude/Latitude';
import PlacesMap from '@/components/latitude/PlacesMap';
import { JsonLd } from '@/lib/latitude-publication';
import { placeCountries } from '@/lib/latitude-places-index';

// 2026-11-11 試作：場所から探すページ（/latitude/places）。世界の地図 → 国 → 街 → 街の案内。
// 地図の下に、国ごと・街ごとの文字の一覧（街の案内と号へのリンク）を必ず置く（検索と AI のチャットが読むため）。構造化データは ItemList（City）。
// 公開予約の号が出た時に街が増えるよう、一覧ページと同じく数分ごとに作り直す

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const ja = locale === 'ja';
  const title = ja ? '場所から探す — LATITUDE の街と、旅人のおすすめ | VUAL' : 'Places — the cities of LATITUDE, and where the travellers would go | VUAL';
  const description = ja
    ? 'LATITUDE の旅人が1日を過ごした街を、地図から。日本・アイスランド・スウェーデン・デンマーク・イギリス・オーストリア・イタリアの街の案内（編集部が営業を確かめた店）と、その街の号へ。'
    : 'The cities where the LATITUDE travellers spent a day, on a map: Japan, Iceland, Sweden, Denmark, the United Kingdom, Austria and Italy. Each has a city guide of places the editors checked, and the issue set there.';
  return {
    title,
    description,
    alternates: { canonical: `/${ja ? 'ja' : 'en'}/latitude/places`, languages: { en: '/en/latitude/places', ja: '/ja/latitude/places', 'x-default': '/en/latitude/places' } },
    openGraph: { type: 'website', siteName: 'VUAL', title, description, url: `https://vual.jp/${ja ? 'ja' : 'en'}/latitude/places` },
  };
}

export default async function LatitudePlacesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ja = locale === 'ja';
  const countries = placeCountries();
  const site = `https://vual.jp/${ja ? 'ja' : 'en'}/latitude`;
  let n = 0;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: ja ? 'LATITUDE の街' : 'The cities of LATITUDE',
    itemListElement: countries.flatMap((c) => c.cities.map((q) => ({
      '@type': 'ListItem',
      position: ++n,
      item: {
        '@type': 'City',
        name: ja ? q.nameJa : q.name,
        url: `${site}/places/${q.slug}`,
        geo: { '@type': 'GeoCoordinates', latitude: q.lat, longitude: q.lon },
        containedInPlace: { '@type': 'Country', name: ja ? c.name.ja : c.name.en, identifier: c.code },
        ...(q.issue ? { subjectOf: { '@type': 'CreativeWork', name: `LATITUDE ${q.latitude} ${q.name}`, url: `${site}/${q.issue.slug}` } } : {}),
      },
    }))),
  };

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <JsonLd data={jsonLd} />
      <IssueStrip locale={locale} current="places" />
      <header className="mx-auto max-w-6xl px-4 pb-10 pt-16 md:px-8 md:pb-14 md:pt-28">
        <p className="text-[11px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>Latitude&nbsp;&nbsp;·&nbsp;&nbsp;{ja ? '場所' : 'Places'}</p>
        <h1 className="mt-5 text-[48px] leading-[0.95] md:text-[88px]" style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.01em' }}>
          {ja ? '場所から探す' : 'Places'}
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed md:text-[20px]" style={{ fontFamily: SERIF }}>
          {ja
            ? '旅人が1日を過ごした街。国を押すとその国へ寄り、街を押すとその街の案内へ。'
            : 'The cities where the travellers spent a day. Choose a country to go closer, then a city for its guide.'}
        </p>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-8 md:pb-24">
        <PlacesMap countries={countries} locale={locale} src="/latitude/placesmap.json" />
      </section>

      {/* 文字の一覧（国ごと・街ごと）。地図が読めない時・検索と AI のチャットのため */}
      <section className="mx-auto max-w-6xl px-4 pb-24 md:px-8 md:pb-32">
        <SectionLabel>{ja ? '国と街' : 'Countries and cities'}</SectionLabel>
        <div className="grid gap-12 md:grid-cols-2 md:gap-x-16">
          {countries.map((c) => (
            <div key={c.code}>
              <h2 className="text-[26px] leading-tight" style={{ fontFamily: SERIF, fontWeight: 400 }}>{ja ? c.name.ja : c.name.en}</h2>
              <ul className="mt-4 flex flex-col">
                {c.cities.map((q) => (
                  <li key={q.slug} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t py-4" style={{ borderColor: 'rgba(30,29,27,0.14)' }}>
                    <span className="flex items-baseline gap-4">
                      <Link href={`/${locale}/latitude/places/${q.slug}`} className="text-[20px] underline-offset-4 hover:underline" style={{ fontFamily: SERIF, color: INK }}>
                        {ja ? q.nameJa : q.name}
                      </Link>
                      <span className="text-[10px] uppercase tracking-[0.3em] tabular-nums" style={{ color: MUTE }}>{q.latitude}</span>
                    </span>
                    <span className="flex gap-x-5 text-[10px] uppercase tracking-[0.3em]">
                      <Link href={`/${locale}/latitude/places/${q.slug}`} className="underline-offset-4 hover:underline" style={{ color: INK }}>
                        {ja ? '街の案内' : 'City guide'}
                      </Link>
                      {q.issue && (
                        <Link href={`/${locale}/latitude/${q.issue.slug}`} className="underline-offset-4 hover:underline" style={{ color: INK }}>
                          {ja ? `号${q.person ? `（${q.person.name}${q.issue.month ? `・${q.issue.month}` : ''}）` : ''}` : `The issue${q.person ? ` · ${q.person.name}${q.issue.month ? `, ${q.issue.month}` : ''}` : ''}`}
                        </Link>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="pb-28">
        <PublishedBy locale={locale} />
      </footer>
    </div>
  );
}

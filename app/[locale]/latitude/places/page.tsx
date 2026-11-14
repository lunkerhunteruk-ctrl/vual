import type { Metadata } from 'next';
import { INK, IssueStrip, MUTE, PAPER, PublishedBy, SERIF, SectionLabel } from '@/components/latitude/Latitude';
import PlacesMap from '@/components/latitude/PlacesMap';
import { hiddenDots } from '@/lib/latitude-hidden';
import { JsonLd } from '@/lib/latitude-publication';
import { citiesJsonLd, placeCountries } from '@/lib/latitude-places-index';
import { CountryCityList } from '@/components/latitude/PlaceLists';

// 2026-11-11 試作：場所から探すページ（/latitude/places）。世界の地図 → 国 → 街 → 街の案内。
// 地図の下に、国ごと・街ごとの文字の一覧（街の案内と号へのリンク）を必ず置く（検索と AI のチャットが読むため）。構造化データは ItemList（City）。
// 公開予約の号が出た時に街が増えるよう、一覧ページと同じく数分ごとに作り直す

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const ja = locale === 'ja';
  const title = ja ? '場所から探す — LATITUDE の街と、旅人のおすすめ | VUAL' : 'Places — the cities of LATITUDE, and where the travellers would go | VUAL';
  const description = ja
    ? 'LATITUDE の旅人が1日を過ごした街と、旅人のおすすめの町を、地図から。日本・アイスランド・スウェーデン・デンマーク・イギリス・オーストリア・イタリアの街の案内（編集部が営業を確かめた店）と、その街の号へ。'
    : 'The cities where the LATITUDE travellers spent a day, and towns with their picks, on a map: Japan, Iceland, Sweden, Denmark, the United Kingdom, Austria and Italy. Each has a city guide of places the editors checked, and the issue set there if there is one.';
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
  const jsonLd = citiesJsonLd(countries, ja, ja ? 'LATITUDE の街' : 'The cities of LATITUDE');

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <JsonLd data={jsonLd} />
      <IssueStrip locale={locale} current="places" />
      <header className="mx-auto max-w-6xl px-4 pb-10 pt-16 md:px-8 md:pb-14 md:pt-28">
        <p className="text-[12px] uppercase tracking-[0.2em]" style={{ color: MUTE }}>Latitude&nbsp;&nbsp;·&nbsp;&nbsp;{ja ? '場所' : 'Places'}</p>
        <h1 className="mt-5 text-[48px] leading-[0.95] md:text-[88px]" style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.01em' }}>
          {ja ? '場所から探す' : 'Places'}
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed md:text-[20px]" style={{ fontFamily: SERIF }}>
          {ja
            ? '旅人が1日を過ごした街と、旅人のおすすめの町。国を押すとその国へ寄り、街を押すとその街の案内へ。'
            : 'The cities where the travellers spent a day, and towns with their picks. Choose a country to go closer, then a city for its guide.'}
        </p>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-8 md:pb-24">
        <PlacesMap countries={countries} locale={locale} src="/latitude/placesmap.json" syncUrl hidden={hiddenDots()} />
      </section>

      {/* 文字の一覧（国ごと・街ごと）。地図が読めない時・検索と AI のチャットのため */}
      <section className="mx-auto max-w-6xl px-4 pb-24 md:px-8 md:pb-32">
        <SectionLabel>{ja ? '国と街' : 'Countries and cities'}</SectionLabel>
        <CountryCityList countries={countries} locale={locale} />
      </section>

      <footer className="pb-28">
        <PublishedBy locale={locale} />
      </footer>
    </div>
  );
}

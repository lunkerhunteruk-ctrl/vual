import type { Metadata } from 'next';
import Link from 'next/link';
import { INK, IssueStrip, MUTE, PAPER, PublishedBy, SERIF, SectionLabel } from '@/components/latitude/Latitude';
import PlacesMap from '@/components/latitude/PlacesMap';
import { CountryCityList } from '@/components/latitude/PlaceLists';
import { JsonLd } from '@/lib/latitude-publication';
import { breadcrumbJsonLd, citiesJsonLd, type PlaceCountry } from '@/lib/latitude-places-index';

// 2026-11-11 試作：国のページ（/latitude/places/<国>。例 /latitude/places/japan）。
// 開くと最初からその国の地図に寄った形（世界地図を通らない）。「← 世界」で /latitude/places へ。
// 地図の下にその国の街の文字の一覧と、構造化データ（ItemList・BreadcrumbList）。
// URL は街のページと同じ段（app/[locale]/latitude/places/[city]/page.tsx で、国の slug なら国のページを出す）。

const list = (names: string[], ja: boolean) =>
  ja ? names.join('・') : names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

export function countryMetadata(c: PlaceCountry, locale: string): Metadata {
  const ja = locale === 'ja';
  // 2026-11-11 号のない「街の案内」だけの町がある国は「1日を過ごした街」とだけは書かない
  const guides = c.cities.some((q) => !q.issue);
  const names = c.cities.map((q) => (ja ? q.nameJa : q.name));
  const title = ja
    ? `${c.name.ja} — LATITUDE の街（${list(names, true)}）｜旅人のおすすめの店と街の案内`
    : `${c.name.en} — places from LATITUDE: ${list(names, false)} | city guides`;
  const description = ja
    ? `${guides ? `LATITUDE の旅人が1日を過ごした街と、旅人のおすすめの町、${c.name.ja}の` : `LATITUDE の旅人が1日を過ごした${c.name.ja}の街、`}${list(names, true)}の案内。その街ならではの店、食べる所、器や工芸の店を、編集部が営業を確かめて載せています。`
    : `City guides to ${list(names, false)} in ${c.name.en}, from LATITUDE: where to eat, what is made there, and shops the editors checked are open, from ${guides ? 'a traveller who spent a day there, or whose picks they are' : 'a traveller who spent a day in each'}.`;
  const path = `/latitude/places/${c.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `/${ja ? 'ja' : 'en'}${path}`, languages: { en: `/en${path}`, ja: `/ja${path}`, 'x-default': `/en${path}` } },
    openGraph: { type: 'website', siteName: 'VUAL', title, description, url: `https://vual.jp/${ja ? 'ja' : 'en'}${path}` },
  };
}

export default function CountryPlacesPage({ c, locale }: { c: PlaceCountry; locale: string }) {
  const ja = locale === 'ja';
  const guides = c.cities.some((q) => !q.issue);
  const name = ja ? c.name.ja : c.name.en;
  const names = c.cities.map((q) => (ja ? q.nameJa : q.name));
  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <JsonLd data={citiesJsonLd([c], ja, ja ? `${c.name.ja}の LATITUDE の街` : `LATITUDE cities in ${c.name.en}`)} />
      <JsonLd data={breadcrumbJsonLd(ja, [[ja ? '場所' : 'Places', '/latitude/places'], [name, `/latitude/places/${c.slug}`]])} />
      <IssueStrip locale={locale} current={`places/${c.slug}`} />
      <header className="mx-auto max-w-6xl px-4 pb-10 pt-16 md:px-8 md:pb-14 md:pt-28">
        <nav aria-label={ja ? '道しるべ' : 'Breadcrumb'} className="text-[11px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>
          <Link href={`/${locale}/latitude/places`} className="underline-offset-4 hover:underline" style={{ color: MUTE }}>{ja ? '場所' : 'Places'}</Link>
          <span className="mx-2">›</span>
          <span aria-current="page" style={{ color: INK }}>{name}</span>
        </nav>
        <h1 className="mt-5 text-[56px] leading-[0.95] md:text-[110px]" style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.01em' }}>{name}</h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed md:text-[20px]" style={{ fontFamily: SERIF }}>
          {ja
            ? `${guides ? `${c.name.ja}の、LATITUDE の旅人が1日を過ごした街と、旅人のおすすめの町` : `LATITUDE の旅人が1日を過ごした${c.name.ja}の街`}：${list(names, true)}。街を押すと、その街の案内へ。`
            : `${guides ? `The cities in ${c.name.en} where a LATITUDE traveller spent a day, and towns with their picks` : `The cities in ${c.name.en} where a LATITUDE traveller spent a day`}: ${list(names, false)}. Choose one for its city guide.`}
        </p>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-8 md:pb-24">
        <PlacesMap countries={[c]} locale={locale} src="/latitude/placesmap.json" initial={c.code} worldHref={`/${locale}/latitude/places`} />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 md:px-8 md:pb-32">
        <SectionLabel>{ja ? `${c.name.ja}の街` : `Cities in ${c.name.en}`}</SectionLabel>
        <CountryCityList countries={[c]} locale={locale} linkCountry={false} />
        <p className="mt-12 text-[10px] uppercase tracking-[0.3em]">
          <Link href={`/${locale}/latitude/places`} className="underline-offset-4 hover:underline" style={{ color: INK }}>
            {ja ? 'ほかの国の街 →' : 'Cities in other countries →'}
          </Link>
        </p>
      </section>

      <footer className="pb-28">
        <PublishedBy locale={locale} />
      </footer>
    </div>
  );
}

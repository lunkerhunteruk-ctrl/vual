import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPerson } from '@/lib/latitude';
import { CITIES, areasOf, getCity, sectionsOf } from '@/lib/latitude-places';
import { getRoom, roomsOpen } from '@/lib/latitude-rooms';
import { INK, IssueStrip, MUTE, PAPER, PublishedBy, SERIF } from '@/components/latitude/Latitude';
import AskTraveller from '@/components/latitude/AskTraveller';
import { CategoryLinks, PlaceGroup, PlacesJsonLd } from '@/components/latitude/CityPlaces';

// 2026-10-30 地区のページ（例 /latitude/places/kanazawa/area/higashi-chaya）。その場で地区の名前で調べる人の入口。
// 店が AREA_MIN 軒以上ある地区だけ（lib/latitude-places.ts の areasOf）。中身は街のページと同じ一覧から、その地区の店だけを種類ごとに。

export function generateStaticParams() {
  return CITIES.flatMap((c) => areasOf(c).map((a) => ({ city: c.slug, area: a.slug })));
}

function find(city: string, area: string) {
  const c = getCity(city);
  const a = c && areasOf(c).find((x) => x.slug === area);
  return c && a ? { c, a } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; city: string; area: string }> }): Promise<Metadata> {
  const { locale, city, area } = await params;
  const f = find(city, area);
  if (!f) return { title: 'LATITUDE — VUAL' };
  const { c, a } = f;
  const ja = locale === 'ja';
  const p = getPerson(c.person);
  const who = p ? (ja ? p.ja.name : p.name) : '';
  const title = ja ? `${a.name}（${c.nameJa}）— ${who}のおすすめ | LATITUDE` : `${a.nameEn}, ${c.name} — where ${who} would go | LATITUDE`;
  const path = `/latitude/places/${c.slug}/area/${a.slug}`;
  return {
    title,
    description: (ja ? `${who}がすすめる、${c.nameJa}・${a.name}の店。` : `Places in ${a.nameEn}, ${c.name}, chosen by ${who}: `) + a.places.map((x) => (ja ? x.name : x.nameEn)).join(ja ? '、' : ', '),
    alternates: { canonical: `/${ja ? 'ja' : 'en'}${path}`, languages: { en: `/en${path}`, ja: `/ja${path}`, 'x-default': `/en${path}` } },
  };
}

export default async function LatitudeAreaPage({ params }: { params: Promise<{ locale: string; city: string; area: string }> }) {
  const { locale, city, area } = await params;
  const f = find(city, area);
  if (!f) notFound();
  const { c, a } = f;
  const ja = locale === 'ja';
  const p = getPerson(c.person);
  const who = p ? (ja ? p.ja.name : p.name) : '';
  const cityName = ja ? c.nameJa : c.name;
  const areaName = ja ? a.name : a.nameEn;
  const groups = sectionsOf(c, a.places);
  const room = roomsOpen() ? getRoom(c.person) : undefined;

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <IssueStrip locale={locale} />
      <PlacesJsonLd c={c} items={a.places} ja={ja} name={ja ? `${a.name}（${c.nameJa}）` : `${a.nameEn}, ${c.name}`} />

      <header className="mx-auto max-w-6xl px-4 pb-10 pt-16 md:px-8 md:pb-14 md:pt-28">
        <p className="text-[12px] uppercase tracking-[0.2em] [&:lang(ja)]:tracking-[0.08em]" style={{ color: MUTE }}>
          <Link href={`/${locale}/latitude/places/${c.slug}`} className="-my-[13px] inline-flex min-h-[44px] items-center" style={{ color: MUTE }}>{c.latitude}&nbsp;&nbsp;{cityName}</Link>
        </p>
        <h1 className="mt-5 text-[48px] leading-[1] md:text-[88px]" style={{ fontFamily: SERIF, fontWeight: 400 }}>{areaName}</h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed md:text-[19px]" style={{ fontFamily: SERIF }}>
          {ja ? `${who}がすすめる、${a.name}の${a.places.length}か所。どれも編集部が実在と営業を確かめた所です。` : `${a.places.length} places in ${a.nameEn}, chosen by ${who} and checked by the editors.`}
        </p>
      </header>

      <section className="px-4 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-14">
            {groups.map((g) => (
              <PlaceGroup key={g.key} c={c} sec={g} ja={ja} locale={locale} who={who} canAsk={!!room} linkHeading />
            ))}
          </div>
          <div className="mt-16 flex flex-col gap-4">
            <CategoryLinks c={c} locale={locale} ja={ja} />
            <Link href={`/${locale}/latitude/places/${c.slug}`} className="-my-[13px] inline-flex min-h-[44px] items-center self-start text-[12px] uppercase tracking-[0.2em] [&:lang(ja)]:tracking-[0.08em]" style={{ color: INK }}>
              {ja ? `${who}の${cityName}をすべて見る` : `All of ${who}'s ${cityName}`}&nbsp;&nbsp;→
            </Link>
          </div>
          <p className="mt-12 max-w-2xl text-[13px] leading-relaxed" style={{ color: MUTE }}>
            {ja
              ? `${who}は架空の旅人です。店は、編集部が実在と営業を確かめた所だけを載せています。営業時間や休みは、行く前に公式サイトで確かめてください。`
              : `${who} is a fictional traveller. Every place here was checked by the editors to exist and be open. Please confirm hours on the official site before you go.`}
          </p>
        </div>
      </section>

      <footer className="pb-28">
        <PublishedBy locale={locale} />
      </footer>

      {room && p && (
        <AskTraveller locale={locale} slug={p.slug} name={who} callSeconds={room.callSeconds}
          context={`The visitor is reading your guide page for the ${a.nameEn} area of ${c.name}. Answer about that area and those places.`} />
      )}
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPerson } from '@/lib/latitude';
import { CATEGORY_LABEL, CITIES, getCity, type PlaceCategory } from '@/lib/latitude-places';
import { getRoom, roomsOpen } from '@/lib/latitude-rooms';
import { INK, IssueStrip, MUTE, PAPER, PublishedBy, SERIF } from '@/components/latitude/Latitude';
import AskTraveller from '@/components/latitude/AskTraveller';
import { CATEGORY_ORDER, CategoryLinks, PlaceGroup, PlacesJsonLd } from '@/components/latitude/CityPlaces';

// 2026-10-30 「街×種類」のページ（例 /latitude/places/kanazawa/matcha）。検索の細かい言葉（金沢 抹茶 など）の入口。
// 中身は街のページと同じ一覧から、その種類の店だけ。

export function generateStaticParams() {
  return CITIES.flatMap((c) => CATEGORY_ORDER.filter((k) => c.places.some((x) => x.category === k)).map((k) => ({ city: c.slug, category: k })));
}

const isCategory = (k: string): k is PlaceCategory => (CATEGORY_ORDER as string[]).includes(k);

function words(cityName: string, k: PlaceCategory, ja: boolean, who: string, n: number) {
  const label = ja ? CATEGORY_LABEL[k].ja : CATEGORY_LABEL[k].en.toLowerCase();
  return ja
    ? { title: `${cityName}の${label}`, lead: `${who}がすすめる、${cityName}の${label}の店を${n}軒。どれも編集部が営業を確かめた所です。` }
    : { title: `${CATEGORY_LABEL[k].en} in ${cityName}`, lead: `${n} places for ${label} in ${cityName}, chosen by ${who} and checked by the editors.` };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; city: string; category: string }> }): Promise<Metadata> {
  const { locale, city, category } = await params;
  const c = getCity(city);
  if (!c || !isCategory(category)) return { title: 'LATITUDE — VUAL' };
  const ja = locale === 'ja';
  const p = getPerson(c.person);
  const who = p ? (ja ? p.ja.name : p.name) : '';
  const items = c.places.filter((x) => x.category === category);
  const w = words(ja ? c.nameJa : c.name, category, ja, who, items.length);
  const path = `/latitude/places/${c.slug}/${category}`;
  return {
    title: `${w.title} — ${ja ? `${who}のおすすめ` : `where ${who} would go`} | LATITUDE`,
    description: `${w.lead} ${items.map((x) => (ja ? x.name : x.nameEn)).join(ja ? '、' : ', ')}`,
    // 試作の間は検索に出さない（公開を決めたら外す）
    robots: { index: false, follow: false },
    alternates: { canonical: `/${ja ? 'ja' : 'en'}${path}`, languages: { en: `/en${path}`, ja: `/ja${path}`, 'x-default': `/en${path}` } },
  };
}

export default async function LatitudeCityCategoryPage({ params }: { params: Promise<{ locale: string; city: string; category: string }> }) {
  const { locale, city, category } = await params;
  const c = getCity(city);
  if (!c || !isCategory(category)) notFound();
  const items = c.places.filter((x) => x.category === category);
  if (!items.length) notFound();
  const ja = locale === 'ja';
  const p = getPerson(c.person);
  const who = p ? (ja ? p.ja.name : p.name) : '';
  const cityName = ja ? c.nameJa : c.name;
  const w = words(cityName, category, ja, who, items.length);
  const room = roomsOpen() ? getRoom(c.person) : undefined;

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <IssueStrip locale={locale} />
      <PlacesJsonLd c={c} items={items} ja={ja} name={w.title} />

      <header className="mx-auto max-w-6xl px-4 pb-10 pt-16 md:px-8 md:pb-14 md:pt-28">
        <p className="text-[11px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>
          <Link href={`/${locale}/latitude/places/${c.slug}`} style={{ color: MUTE }}>{c.latitude}&nbsp;&nbsp;{cityName}</Link>
        </p>
        <h1 className="mt-5 text-[48px] leading-[1] md:text-[88px]" style={{ fontFamily: SERIF, fontWeight: 400 }}>{w.title}</h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed md:text-[19px]" style={{ fontFamily: SERIF }}>{w.lead}</p>
      </header>

      <section className="px-4 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-6xl">
          <PlaceGroup c={c} k={category} items={items} ja={ja} locale={locale} who={who} canAsk={!!room} linkHeading={false} />
          <div className="mt-16 flex flex-col gap-4">
            <CategoryLinks c={c} locale={locale} ja={ja} current={category} />
            <Link href={`/${locale}/latitude/places/${c.slug}`} className="text-[11px] uppercase tracking-[0.3em]" style={{ color: INK }}>
              {ja ? `${who}の${cityName}をすべて見る` : `All of ${who}'s ${cityName}`}&nbsp;&nbsp;→
            </Link>
          </div>
          <p className="mt-12 max-w-2xl text-[12px] leading-relaxed" style={{ color: MUTE }}>
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
          context={`The visitor is reading your guide page for ${CATEGORY_LABEL[category].en.toLowerCase()} in ${c.name} on the website. Answer about those places.`} />
      )}
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPerson } from '@/lib/latitude';
import { CITIES, getCity, getSection, sectionsOf, type PlaceSection } from '@/lib/latitude-places';
import { getRoom, roomsOpen } from '@/lib/latitude-rooms';
import { INK, IssueStrip, MUTE, PAPER, PublishedBy, SERIF } from '@/components/latitude/Latitude';
import AskTraveller from '@/components/latitude/AskTraveller';
import { CategoryLinks, PlaceGroup, PlacesJsonLd } from '@/components/latitude/CityPlaces';
import HiddenMonthPage, { hiddenMonthMetadata } from '@/components/latitude/HiddenMonthPage';
import { MONTHS, monthOf } from '@/lib/latitude-hidden';

// 2026-10-30 「街×種類」のページ（例 /latitude/places/kanazawa/cafe）。検索の細かい言葉（金沢 喫茶 など）の入口。
// 2026-11-11 種類を5つにまとめた（抹茶・コーヒー → 喫茶 cafe、器 → 工芸 craft）。古い /matcha・/coffee は next.config.ts で /cafe へ 301
// 中身は街のページと同じ一覧から、その種類の店だけ。
// 2026-11-01 その街ならではの産業も同じ形のページにする（例 /latitude/places/kanazawa/gold-leaf・/latitude/places/vienna/glass-porcelain-silver）。
// 産業を1ページにまとめず産業ごとに分けるのは、「金沢 金箔」のように産業の名前で調べる人に、題と中身が1つの言葉でそろったページを返すため。

export function generateStaticParams() {
  // 2026-11-14 日本の月ごとの穴場のページ（/latitude/places/japan/may など）も、この段
  return [...CITIES.flatMap((c) => sectionsOf(c).map((s) => ({ city: c.slug, category: s.key }))), ...MONTHS.map((m) => ({ city: 'japan', category: m }))];
}

function words(cityName: string, sec: PlaceSection, ja: boolean, who: string, n: number) {
  const label = ja ? sec.label.ja : sec.label.en;
  if (sec.kind === 'industry') {
    return ja
      ? { title: `${cityName}の${label}`, lead: `${sec.about?.ja ?? ''} ${who}がすすめる${n}か所。どれも編集部が実在と営業を確かめた所です。`.trim() }
      : { title: `${label} in ${cityName}`, lead: `${sec.about?.en ?? ''} ${n} places, chosen by ${who} and checked by the editors.`.trim() };
  }
  return ja
    ? { title: `${cityName}の${label}`, lead: `${who}がすすめる、${cityName}の${label}の店を${n}軒。どれも編集部が営業を確かめた所です。` }
    : { title: `${sec.label.en} in ${cityName}`, lead: `${n} places for ${label.toLowerCase()} in ${cityName}, chosen by ${who} and checked by the editors.` };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; city: string; category: string }> }): Promise<Metadata> {
  const { locale, city, category } = await params;
  if (city === 'japan' && monthOf(category)) return hiddenMonthMetadata(monthOf(category), locale);
  const c = getCity(city);
  const sec = c && getSection(c, category);
  if (!c || !sec) return { title: 'LATITUDE — VUAL' };
  const ja = locale === 'ja';
  const p = getPerson(c.person);
  const who = p ? (ja ? p.ja.name : p.name) : '';
  const items = sec.items;
  const w = words(ja ? c.nameJa : c.name, sec, ja, who, items.length);
  const path = `/latitude/places/${c.slug}/${sec.key}`;
  return {
    title: `${w.title} — ${ja ? `${who}のおすすめ` : `where ${who} would go`} | LATITUDE`,
    description: `${w.lead} ${items.map((x) => (ja ? x.name : x.nameEn)).join(ja ? '、' : ', ')}`,
    alternates: { canonical: `/${ja ? 'ja' : 'en'}${path}`, languages: { en: `/en${path}`, ja: `/ja${path}`, 'x-default': `/en${path}` } },
  };
}

export default async function LatitudeCityCategoryPage({ params }: { params: Promise<{ locale: string; city: string; category: string }> }) {
  const { locale, city, category } = await params;
  if (city === 'japan' && monthOf(category)) return <HiddenMonthPage m={monthOf(category)} locale={locale} />;
  const c = getCity(city);
  const sec = c && getSection(c, category);
  if (!c || !sec) notFound();
  const items = sec.items;
  const ja = locale === 'ja';
  const p = getPerson(c.person);
  const who = p ? (ja ? p.ja.name : p.name) : '';
  const cityName = ja ? c.nameJa : c.name;
  const w = words(cityName, sec, ja, who, items.length);
  const room = roomsOpen() ? getRoom(c.person) : undefined;

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <IssueStrip locale={locale} />
      <PlacesJsonLd c={c} items={items} ja={ja} name={w.title} />

      <header className="mx-auto max-w-6xl px-4 pb-10 pt-16 md:px-8 md:pb-14 md:pt-28">
        <p className="text-[12px] uppercase tracking-[0.2em] [&:lang(ja)]:tracking-[0.08em]" style={{ color: MUTE }}>
          <Link href={`/${locale}/latitude/places/${c.slug}`} className="-my-[13px] inline-flex min-h-[44px] items-center" style={{ color: MUTE }}>{c.latitude}&nbsp;&nbsp;{cityName}</Link>
        </p>
        <h1 className="mt-5 text-[48px] leading-[1] md:text-[88px]" style={{ fontFamily: SERIF, fontWeight: 400 }}>{w.title}</h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed md:text-[19px]" style={{ fontFamily: SERIF }}>{w.lead}</p>
      </header>

      <section className="px-4 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-6xl">
          <PlaceGroup c={c} sec={sec} ja={ja} locale={locale} who={who} canAsk={!!room} linkHeading={false} />
          <div className="mt-16 flex flex-col gap-4">
            <CategoryLinks c={c} locale={locale} ja={ja} current={sec.key} />
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
          context={`The visitor is reading your guide page for ${sec.label.en.toLowerCase()} in ${c.name} on the website. Answer about those places.`} />
      )}
    </div>
  );
}

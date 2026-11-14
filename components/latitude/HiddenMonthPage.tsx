import type { Metadata } from 'next';
import Link from 'next/link';
import { INK, IssueStrip, MUTE, PAPER, PublishedBy, SERIF, SectionLabel } from '@/components/latitude/Latitude';
import PlacesMap from '@/components/latitude/PlacesMap';
import { Dots } from '@/components/latitude/HiddenBits';
import { MONTHS, forMonth, hiddenDots, monthLabel } from '@/lib/latitude-hidden';
import { getPlaceCountry, breadcrumbJsonLd } from '@/lib/latitude-places-index';
import { latAsset } from '@/lib/latitude-assets';
import { JsonLd } from '@/lib/latitude-publication';

// 2026-11-14 月ごとの穴場のページ（/latitude/places/japan/may など）。地図と同じデータ（lib/latitude-hidden）から自動で作る。
// 「Japan in May off the beaten path」のような検索の入口。上に、その月を選んだ日本の地図（点はその月のおすすめ度で大きく）、
// 下に、その月のおすすめ度4以上の穴場を高い順に、ふつうの文字で並べる（検索エンジンと AI のチャットが読めるように）。
// URL は「街×種類」と同じ段（app/[locale]/latitude/places/[city]/[category]/page.tsx で、japan＋月の名前ならこのページ）。

const MOSS = '#4f6b3a';

export function hiddenMonthMetadata(m: number, locale: string): Metadata {
  const ja = locale === 'ja';
  const list = forMonth(m);
  const top = list.slice(0, 5).map((s) => (ja ? s.name : s.nameEn));
  const title = ja ? `${m}月の日本の、地元の名所 ${list.length}か所 — 見頃の1か所への1日 | LATITUDE` : `Japan in ${monthLabel(m, false)}: ${list.length} hidden spots locals love, and a day trip to each | LATITUDE`;
  const description = ja
    ? `${m}月に見頃をむかえる、地元では有名でも外国から来た人には見つけにくい所。${top.join('、')}など。行き方と1日のおすすめコース、近くのごはんと温泉。編集部が2026年の営業を確かめました。`
    : `Off the beaten path in Japan in ${monthLabel(m, false)}: places famous with locals but easy for visitors to miss, at their best this month — ${top.join(', ')} and more. How to get there and a day around each. Checked for 2026.`;
  const path = `/latitude/places/japan/${MONTHS[m - 1]}`;
  return {
    title, description,
    alternates: { canonical: `/${ja ? 'ja' : 'en'}${path}`, languages: { en: `/en${path}`, ja: `/ja${path}`, 'x-default': `/en${path}` } },
    openGraph: { type: 'website', siteName: 'VUAL', title, description, url: `https://vual.jp/${ja ? 'ja' : 'en'}${path}` },
  };
}

export default function HiddenMonthPage({ m, locale }: { m: number; locale: string }) {
  const ja = locale === 'ja';
  const c = getPlaceCountry('japan');
  const list = forMonth(m);
  const path = `/latitude/places/japan/${MONTHS[m - 1]}`;
  const prev = ((m + 10) % 12) + 1, next = (m % 12) + 1;
  const ld = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: ja ? `${m}月の日本の地元の名所` : `Hidden spots in Japan in ${monthLabel(m, false)}`,
    itemListElement: list.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: `https://vual.jp/${ja ? 'ja' : 'en'}/latitude/places/japan/spot/${s.slug}`, name: ja ? s.name : s.nameEn })),
  };
  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <JsonLd data={ld} />
      <JsonLd data={breadcrumbJsonLd(ja, [[ja ? '場所' : 'Places', '/latitude/places'], [ja ? '日本' : 'Japan', '/latitude/places/japan'], [ja ? `${m}月の地元の名所` : monthLabel(m, false), path]])} />
      <IssueStrip locale={locale} />
      <header className="mx-auto max-w-6xl px-4 pb-10 pt-16 md:px-8 md:pb-14 md:pt-24">
        <nav aria-label={ja ? '道しるべ' : 'Breadcrumb'} className="text-[12px] uppercase tracking-[0.2em]" style={{ color: MUTE }}>
          <Link href={`/${locale}/latitude/places`} className="underline-offset-4 hover:underline" style={{ color: MUTE }}>{ja ? '場所' : 'Places'}</Link>
          <span className="mx-2">›</span>
          <Link href={`/${locale}/latitude/places/japan`} className="underline-offset-4 hover:underline" style={{ color: MUTE }}>{ja ? '日本' : 'Japan'}</Link>
          <span className="mx-2">›</span>
          <span aria-current="page" style={{ color: INK }}>{ja ? `${m}月` : monthLabel(m, false)}</span>
        </nav>
        <h1 className="mt-5 text-[44px] leading-[1] md:text-[84px]" style={{ fontFamily: SERIF, fontWeight: 400, textWrap: 'balance' }}>
          {ja ? `${m}月の、日本の地元の名所` : `Japan in ${monthLabel(m, false)}, off the beaten path`}
        </h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-relaxed md:text-[20px]" style={{ fontFamily: SERIF }}>
          {ja
            ? `地元では誰もが知っているのに、外から来た人には見つけにくい所。${m}月がいい${list.length}か所を、おすすめの順に。どれも、行き方と1日のおすすめコースつきです。`
            : `Places everyone local knows, but visitors rarely find. ${list.length} that are good in ${monthLabel(m, false)}, best first — each with how to get there and a day around it.`}
        </p>
        <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[12px] uppercase tracking-[0.2em]">
          <Link href={`/${locale}/latitude/places/japan/${MONTHS[prev - 1]}`} className="underline-offset-4 hover:underline">← {monthLabel(prev, ja)}</Link>
          <Link href={`/${locale}/latitude/places/japan/${MONTHS[next - 1]}`} className="underline-offset-4 hover:underline">{monthLabel(next, ja)} →</Link>
        </p>
      </header>

      {c && (
        <section className="mx-auto max-w-6xl px-4 pb-14 md:px-8 md:pb-20">
          <PlacesMap countries={[c]} locale={locale} src="/latitude/placesmap.json" initial={c.code} worldHref={`/${locale}/latitude/places`} hidden={hiddenDots()} month={m} />
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-24 md:px-8">
        <SectionLabel>{ja ? `${m}月におすすめの順` : `Best in ${monthLabel(m, false)} first`}</SectionLabel>
        <ol className="flex flex-col">
          {list.map((s, i) => {
            const v = s.monthScore[m - 1];
            const n = s.monthNote[String(m)];
            return (
              <li key={s.slug} className="grid grid-cols-[minmax(0,1fr)] gap-4 border-t py-6 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8" style={{ borderColor: 'rgba(30,29,27,0.14)' }}>
                {s.banner ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={latAsset(`hidden/${s.slug}/thumb.webp`)} alt="" loading="lazy" className="block aspect-[3/2] w-full object-cover md:w-[180px]" style={{ objectPosition: `50% ${s.banner.y ?? 50}%` }} />
                ) : s.bannerOg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.bannerOg} alt="" loading="lazy" referrerPolicy="no-referrer" className="block aspect-[3/2] w-full object-cover md:w-[180px]" />
                ) : <span className="hidden md:block" />}
                <div className="min-w-0">
                  <p className="text-[12px] uppercase tracking-[0.2em]" style={{ color: MUTE }}>{i + 1} · {ja ? s.prefectureJa : s.prefecture}</p>
                  <h2 className="mt-1 text-[22px] leading-snug md:text-[26px]" style={{ fontFamily: SERIF, fontWeight: 400 }}>
                    <Link href={`/${locale}/latitude/places/japan/spot/${s.slug}`} className="underline-offset-4 hover:underline">{ja ? s.name : s.nameEn}</Link>
                  </h2>
                  <p className="mt-2 flex items-center gap-2 text-[12px]">
                    <Dots n={v} />
                    <span style={{ color: v >= 5 ? MOSS : INK }}>{n ? (ja ? n.ja : n.en) : ja ? s.peakNoteJa : s.peakNote}</span>
                  </p>
                  <p className="mt-2 max-w-2xl text-[15px] leading-relaxed">{ja ? s.what : s.whatEn}</p>
                  <Link href={`/${locale}/latitude/places/japan/spot/${s.slug}`} className="mt-2 inline-block text-[12px] uppercase tracking-[0.18em] underline underline-offset-4" style={{ color: MOSS }}>
                    {ja ? '行き方と1日のコース →' : 'How to get there, and a day there →'}
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
        <nav className="mt-14 flex flex-wrap gap-x-4 gap-y-2 text-[12px] uppercase tracking-[0.18em]" aria-label={ja ? 'ほかの月' : 'Other months'}>
          {MONTHS.map((slug, i) => (
            <Link key={slug} href={`/${locale}/latitude/places/japan/${slug}`} aria-current={i + 1 === m ? 'page' : undefined} className="underline-offset-4 hover:underline" style={{ color: i + 1 === m ? INK : MUTE }}>
              {monthLabel(i + 1, ja)}
            </Link>
          ))}
        </nav>
      </section>
      <footer className="pb-28">
        <PublishedBy locale={locale} />
      </footer>
    </div>
  );
}

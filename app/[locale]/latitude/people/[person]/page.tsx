import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PEOPLE, assetUrl, getPerson, issuesOf } from '@/lib/latitude';
import { INK, IssueStrip, MUTE, PAPER, PublishedBy, SERIF, SectionLabel } from '@/components/latitude/Latitude';
import TravellerMap from '@/components/latitude/TravellerMap';
import { mapTravellers } from '@/lib/latitude-map';
import { getRoom, roomsOpen } from '@/lib/latitude-rooms';
import { placeCountries } from '@/lib/latitude-places-index';
import { REGIONS } from '@/lib/latitude-regions';

// 2026-10-30 LATITUDE の人のページ。号の番号をやめ、名前のある6人がそれぞれ旅する形にした（設定書は vault.vual.jp/docs/LATITUDE-CHARACTERS.md）。
// 名前・住む街・旅をする理由・持ち物の印・その人の全部の1日。のちの部屋（3D）や会話の入口もここに置く

export function generateStaticParams() {
  return PEOPLE.map((p) => ({ person: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; person: string }> }): Promise<Metadata> {
  const { locale, person } = await params;
  const p = getPerson(person);
  if (!p) return { title: 'LATITUDE — VUAL' };
  const ja = locale === 'ja';
  const title = `${ja ? p.ja.name : p.name} — LATITUDE | VUAL`;
  const cities = issuesOf(p.slug).map((i) => `${i.city} in ${i.month}`).join(', ');
  const description = ja ? p.ja.line : `${p.line}${cities ? ` Her days so far: ${cities}.` : ''}`;
  // 2026-10-30 日本語の本文を足したので、英語と日本語をそれぞれのページとして出す
  const path = `/latitude/people/${p.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `/${ja ? 'ja' : 'en'}${path}`, languages: { en: `/en${path}`, ja: `/ja${path}`, 'x-default': `/en${path}` } },
    openGraph: { type: 'profile', siteName: 'VUAL', title, description, url: `https://vual.jp/${ja ? 'ja' : 'en'}${path}` },
  };
}

export default async function LatitudePersonPage({ params }: { params: Promise<{ locale: string; person: string }> }) {
  const { locale, person } = await params;
  const p = getPerson(person);
  if (!p) notFound();
  const days = issuesOf(p.slug);
  const ja = locale === 'ja';
  const t = ja ? { ...p.ja, age: `${p.age}歳` } : { name: p.name, home: p.home, line: p.line, about: p.about, age: String(p.age) };
  // 大きな名前：日本語でも凛は漢字、ほかの5人は綴りのまま大きく出し、読みを小さく添える
  const big = ja && p.slug === 'rin' ? p.ja.name : p.name;

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <IssueStrip locale={locale} />

      <header className="mx-auto max-w-6xl px-4 pb-12 pt-16 md:px-8 md:pb-20 md:pt-28">
        <p className="text-[12px] uppercase tracking-[0.2em]" style={{ color: MUTE }}>
          Latitude&nbsp;&nbsp;·&nbsp;&nbsp;{ja ? '旅をする人' : 'People'}
        </p>
        <h1 className="mt-5 text-[64px] leading-[0.95] md:text-[120px]" style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.01em', color: INK }}>
          {big}
        </h1>
        {ja && big !== p.ja.name && <p className="mt-3 text-[14px] tracking-[0.2em]" style={{ color: MUTE }}>{p.ja.name}</p>}
        <p className="mt-6 text-[14px] uppercase tracking-[0.2em] md:mt-8 md:text-[15px]">
          {t.home}&nbsp;&nbsp;·&nbsp;&nbsp;{t.age}
        </p>
        <p className="mt-8 max-w-xl text-[17px] leading-relaxed md:text-[20px]" style={{ fontFamily: SERIF }}>
          {t.line}
        </p>
        {/* 2026-10-30 部屋の試作（開いている人だけ） */}
        {getRoom(p.slug) && roomsOpen() && (
          <Link href={`/${locale}/latitude/people/${p.slug}/room`} className="mt-8 inline-block border px-6 py-3 text-[12px] uppercase tracking-[0.2em]" style={{ borderColor: INK, color: INK }}>
            {ja ? `${p.ja.name}の部屋へ` : 'Her room'}&nbsp;&nbsp;→
          </Link>
        )}
      </header>

      <section className="px-4 pb-20 md:px-8 md:pb-28">
        <div className="mx-auto max-w-6xl md:grid md:grid-cols-[1fr_2fr] md:gap-16">
          <SectionLabel>{ja ? 'この人のこと' : 'About her'}</SectionLabel>
          <div className="flex max-w-2xl flex-col gap-5">
            {t.about.map((a, k) => (
              <p key={k} className="text-[16px] leading-[1.8] md:text-[17px]">{a}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <SectionLabel>{ja ? 'これまでの1日' : 'Her days'}</SectionLabel>
        </div>
        {days.length ? (
          <div className="mx-auto flex max-w-6xl snap-x gap-4 overflow-x-auto px-4 md:gap-8 md:px-8" style={{ scrollbarWidth: 'thin' }}>
            {days.map((i) => (
              <Link key={i.slug} href={`/${locale}/latitude/${i.slug}`} className="group block w-[62vw] shrink-0 snap-start md:w-[24vw] md:max-w-[300px]" style={{ color: INK }}>
                <div className="overflow-hidden" style={{ aspectRatio: '9 / 16' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={assetUrl(i, 'cover.jpg')} alt={`${p.name} in ${i.city}, ${i.month} — LATITUDE ${i.latitude}`} loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                </div>
                <p className="mt-4 text-[12px] uppercase tracking-[0.2em]" style={{ color: MUTE }}>{i.month}</p>
                <p className="mt-1 text-[26px] leading-tight" style={{ fontFamily: SERIF }}>{i.latitude}</p>
                <p className="mt-1 text-[12px] uppercase tracking-[0.2em]">{i.city}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mx-auto max-w-6xl px-4 text-[14px] md:px-8" style={{ color: MUTE }}>{ja ? '最初の1日を準備しています。' : 'Her first day is on its way.'}</p>
        )}
        {/* 2026-11-01 その人の街のページ（おすすめの店・回り方・何を着るか）へ。
            2026-11-14 ユーザー：「凛の〇〇のおすすめ →」を50回以上並べず、見出し1回＋地方（外国は国）ごとに北から町の名前だけ。号のある町は点で印 */}
        {(() => {
          const groups = placeCountries().flatMap((co) => {
            const mine = co.cities.filter((c) => c.person?.slug === p.slug && !c.preview);
            if (!mine.length) return [];
            const rs = REGIONS[co.code];
            const byNorth = (a: { lat: number }, b: { lat: number }) => b.lat - a.lat;
            if (!rs) return [{ key: co.code, label: ja ? co.name.ja : co.name.en, cities: mine.sort(byNorth) }];
            return rs.map((r) => ({ key: `${co.code}-${r.key}`, label: ja ? r.ja : r.en, cities: mine.filter((c) => c.region === r.key).sort(byNorth) })).filter((g) => g.cities.length);
          });
          const n = groups.reduce((a, g) => a + g.cities.length, 0);
          if (!n) return null;
          return (
            <div className="mx-auto mt-14 max-w-6xl px-4 md:px-8">
              <p className="text-[12px] uppercase tracking-[0.2em]" style={{ color: MUTE }}>
                {ja ? `${p.ja.name}のおすすめの町　${n}` : `Where ${p.name} would go  ·  ${n} towns`}
              </p>
              <dl className="mt-5 flex flex-col">
                {groups.map((g) => (
                  <div key={g.key} className="grid grid-cols-1 gap-1 border-t py-3 md:grid-cols-[140px_minmax(0,1fr)] md:gap-6" style={{ borderColor: 'rgba(30,29,27,0.12)' }}>
                    <dt className="text-[12px] uppercase tracking-[0.2em] md:pt-[3px]" style={{ color: MUTE }}>{g.label}</dt>
                    <dd className="flex min-w-0 flex-wrap gap-x-5 gap-y-1.5 text-[14px]">
                      {g.cities.map((c) => (
                        <Link key={c.slug} href={`/${locale}/latitude/places/${c.slug}`} className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline" style={{ color: INK }}>
                          {c.issue && <span aria-label={ja ? '号あり' : 'with an issue'} title={ja ? '映像とカルーセルの号がある町' : 'A town with an issue'} className="inline-block h-[6px] w-[6px] rounded-full" style={{ background: INK }} />}
                          {ja ? c.nameJa : c.name}
                        </Link>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 flex items-center gap-1.5 text-[12px] tracking-[0.15em]" style={{ color: MUTE }}>
                <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ background: INK }} />
                {ja ? `${p.ja.name}の1日の映像とカルーセルがある町` : `Towns with ${p.name}'s day on film`}
              </p>
            </div>
          );
        })()}
      </section>

      {/* 2026-10-30 その人の旅の跡を濃く、ほかの5人は薄く */}
      <section className="mx-auto max-w-6xl pb-20 md:px-8 md:pb-28">
        <div className="px-4 md:px-0">
          <SectionLabel>{ja ? '旅の地図' : 'Her map'}</SectionLabel>
        </div>
        <TravellerMap travellers={mapTravellers()} locale={locale} focus={p.slug} />
      </section>

      <section className="px-4 pb-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>{ja ? 'ほかに旅をしている人' : 'Also travelling'}</SectionLabel>
          <ul className="flex flex-wrap gap-x-8 gap-y-3 text-[12px] uppercase tracking-[0.2em]">
            {PEOPLE.filter((o) => o.slug !== p.slug).map((o) => (
              <li key={o.slug}>
                <Link href={`/${locale}/latitude/people/${o.slug}`} style={{ color: INK }}>{ja ? o.ja.name : o.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="pb-16">
        <PublishedBy locale={locale} />
      </footer>
    </div>
  );
}

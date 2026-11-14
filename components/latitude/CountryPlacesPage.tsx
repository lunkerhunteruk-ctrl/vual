import type { Metadata } from 'next';
import Link from 'next/link';
import { INK, IssueStrip, MUTE, PAPER, PublishedBy, SERIF, SectionLabel } from '@/components/latitude/Latitude';
import PlacesMap from '@/components/latitude/PlacesMap';
import { HIDDEN, MONTHS, hiddenDots, monthLabel } from '@/lib/latitude-hidden';
import { REGIONS } from '@/lib/latitude-regions';
import { CountryCityList } from '@/components/latitude/PlaceLists';
import { JsonLd } from '@/lib/latitude-publication';
import { breadcrumbJsonLd, citiesJsonLd, type PlaceCountry } from '@/lib/latitude-places-index';

// 県の番号の順（北から）
const PREF_ORDER = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];


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
  // 2026-11-14 ②-6 日本は町が多く、町名を並べた題が600字を超えていた。短い題に（オーナー了承の文言）。町名は下の一覧に全部ある。ほかの国は今のまま
  const n = c.cities.length;
  const title = c.code === 'JP'
    ? (ja ? `日本——ものづくりの町${n}の案内 | LATITUDE` : `Japan — city guides to ${n} craft towns | LATITUDE`)
    : ja
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
  const jp = c.code === 'JP';
  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <JsonLd data={citiesJsonLd([c], ja, ja ? `${c.name.ja}の LATITUDE の街` : `LATITUDE cities in ${c.name.en}`)} />
      <JsonLd data={breadcrumbJsonLd(ja, [[ja ? '場所' : 'Places', '/latitude/places'], [name, `/latitude/places/${c.slug}`]])} />
      <IssueStrip locale={locale} current={`places/${c.slug}`} />
      {/* 2026-11-14 ②-6 日本は頭を短く（町名の羅列を外し、下の余白も詰める）。地図と月の絞り込みが1画面めに来るように */}
      <header className={`mx-auto max-w-6xl px-4 pt-16 md:px-8 md:pt-28 ${jp ? 'pb-6 md:pb-10' : 'pb-10 md:pb-14'}`}>
        <nav aria-label={ja ? '道しるべ' : 'Breadcrumb'} className="text-[12px] uppercase tracking-[0.2em] [&:lang(ja)]:tracking-[0.08em]" style={{ color: MUTE }}>
          <Link href={`/${locale}/latitude/places`} className="-my-[13px] inline-flex min-h-[44px] items-center underline-offset-4 hover:underline" style={{ color: MUTE }}>{ja ? '場所' : 'Places'}</Link>
          <span className="mx-2">›</span>
          <span aria-current="page" style={{ color: INK }}>{name}</span>
        </nav>
        <h1 className="mt-5 text-[56px] leading-[0.95] md:text-[110px]" style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.01em' }}>{name}</h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed md:text-[20px]" style={{ fontFamily: SERIF }}>
          {jp
            ? (ja
              ? `旅人が1日を過ごした町と、旅人のおすすめの町。東京や京都の先にある、ものづくりの町を${c.cities.length}。地図か、下の一覧から選べます。`
              : `Towns where a LATITUDE traveller spent a day, and towns with their picks: ${c.cities.length} craft towns beyond Tokyo and Kyoto. Choose one on the map or from the list below.`)
            : ja
              ? `${guides ? `${c.name.ja}の、LATITUDE の旅人が1日を過ごした街と、旅人のおすすめの町` : `LATITUDE の旅人が1日を過ごした${c.name.ja}の街`}：${list(names, true)}。街を押すと、その街の案内へ。`
              : `${guides ? `The cities in ${c.name.en} where a LATITUDE traveller spent a day, and towns with their picks` : `The cities in ${c.name.en} where a LATITUDE traveller spent a day`}: ${list(names, false)}. Choose one for its city guide.`}
        </p>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-8 md:pb-24">
        <PlacesMap countries={[c]} locale={locale} src="/latitude/placesmap.json" initial={c.code} worldHref={`/${locale}/latitude/places`} hidden={c.code === 'JP' ? hiddenDots() : undefined} />
      </section>

      {/* 2026-11-14 ユーザー：国のページでは「〇〇の街」「〇〇」の見出しは要らない。町の一覧を穴場より上に */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-8 md:pb-24">
        <CountryCityList countries={[c]} locale={locale} linkCountry={false} heading={false} />
        <p className="mt-12 text-[12px] uppercase tracking-[0.2em] [&:lang(ja)]:tracking-[0.08em]">
          <Link href={`/${locale}/latitude/places`} className="underline-offset-4 hover:underline" style={{ color: INK }}>
            {ja ? 'ほかの国の街 →' : 'Cities in other countries →'}
          </Link>
        </p>
      </section>

      {/* 2026-11-14 穴場：月ごとのページと、地方ごとの文字の一覧（検索と AI のチャットのため） */}
      {c.code === 'JP' && (
        <section className="mx-auto max-w-6xl px-4 pb-16 md:px-8 md:pb-24">
          <SectionLabel>{ja ? '地元の名所を、行く月から' : 'Hidden spots, by the month you visit'}</SectionLabel>
          <nav className="mb-10 flex flex-wrap gap-x-5 gap-y-2 text-[12px] uppercase tracking-[0.18em] [&:lang(ja)]:tracking-[0.08em]">
            {MONTHS.map((m, i) => (
              <Link key={m} href={`/${locale}/latitude/places/japan/${m}`} className="underline-offset-4 hover:underline" style={{ color: '#4f6b3a' }}>{monthLabel(i + 1, ja)}</Link>
            ))}
          </nav>
          {/* 2026-11-14 ユーザー：スマホでは地方ごとにたたみ、気になる地方を押して開く。広い画面は今までどおり3列に全部 */}
          <div className="flex flex-col md:hidden">
            {REGIONS.JP.map((g) => {
              const list = HIDDEN.filter((h) => h.region === g.key);
              if (!list.length) return null;
              return (
                <details key={g.key} className="group border-t" style={{ borderColor: 'rgba(30,29,27,0.14)' }}>
                  <summary className="flex cursor-pointer list-none items-baseline justify-between py-3.5 [&::-webkit-details-marker]:hidden">
                    <span className="text-[17px]" style={{ fontFamily: SERIF }}>{ja ? g.ja : g.en}<span className="ml-3 text-[12px] tabular-nums" style={{ color: MUTE }}>{list.length}</span></span>
                    <span className="text-[16px] leading-none" style={{ color: MUTE }}><span className="group-open:hidden">＋</span><span className="hidden group-open:inline">－</span></span>
                  </summary>
                  <div className="pb-3">
                  {/* 2026-11-14 ユーザー：県ごとにまとめ、県の名前は1回だけ。県の間は細い横線（北から＝県の番号の順） */}
                  {[...new Set(list.map((h) => h.prefectureJa))].sort((x, y) => PREF_ORDER.indexOf(x) - PREF_ORDER.indexOf(y)).map((pj) => {
                    const qs = list.filter((h) => h.prefectureJa === pj);
                    return (
                      <div key={pj} className="border-t py-2.5" style={{ borderColor: 'rgba(30,29,27,0.12)' }}>
                        <p className="text-[12px] tracking-[0.2em] [&:lang(ja)]:tracking-[0.08em]" style={{ color: MUTE }}>{ja ? pj : qs[0].prefecture}</p>
                        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
                          {qs.map((h) => (
                            <li key={h.slug}>
                              <Link href={`/${locale}/latitude/places/japan/spot/${h.slug}`} className="underline-offset-4 hover:underline">{ja ? h.name : h.nameEn}</Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  </div>
                </details>
              );
            })}
          </div>
          <div className="hidden gap-x-10 gap-y-8 md:grid md:grid-cols-3">
            {REGIONS.JP.map((g) => {
              const list = HIDDEN.filter((h) => h.region === g.key);
              if (!list.length) return null;
              return (
                <div key={g.key}>
                  <p className="mb-2 text-[12px] uppercase tracking-[0.2em] [&:lang(ja)]:tracking-[0.08em]" style={{ color: MUTE }}>{ja ? g.ja : g.en}</p>
                  {/* 2026-11-14 ユーザー：県ごとにまとめ、県の名前は1回だけ。県の間は細い横線（北から＝県の番号の順） */}
                  {[...new Set(list.map((h) => h.prefectureJa))].sort((x, y) => PREF_ORDER.indexOf(x) - PREF_ORDER.indexOf(y)).map((pj) => {
                    const qs = list.filter((h) => h.prefectureJa === pj);
                    return (
                      <div key={pj} className="border-t py-2.5" style={{ borderColor: 'rgba(30,29,27,0.12)' }}>
                        <p className="text-[12px] tracking-[0.2em] [&:lang(ja)]:tracking-[0.08em]" style={{ color: MUTE }}>{ja ? pj : qs[0].prefecture}</p>
                        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
                          {qs.map((h) => (
                            <li key={h.slug}>
                              <Link href={`/${locale}/latitude/places/japan/spot/${h.slug}`} className="underline-offset-4 hover:underline">{ja ? h.name : h.nameEn}</Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </section>
      )}


      <footer className="pb-28">
        <PublishedBy locale={locale} />
      </footer>
    </div>
  );
}

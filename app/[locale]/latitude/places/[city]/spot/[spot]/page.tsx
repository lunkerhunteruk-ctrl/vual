import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { INK, IssueStrip, MUTE, PAPER, PublishedBy, SERIF, SectionLabel } from '@/components/latitude/Latitude';
import CityRouteMap, { type RouteStop } from '@/components/latitude/CityRouteMap';
import { Dots, Strip } from '@/components/latitude/HiddenBits';
import { HIDDEN, MONTHS, getHidden, monthLabel, type HiddenSpot } from '@/lib/latitude-hidden';
import { getCity } from '@/lib/latitude-places';
import { latAsset, latAssetAbs } from '@/lib/latitude-assets';
import { JsonLd } from '@/lib/latitude-publication';
import { breadcrumbJsonLd } from '@/lib/latitude-places-index';

// 2026-11-14 穴場のページ（/latitude/places/japan/spot/<穴場>。例 /latitude/places/japan/spot/kawachi-fujien）。
// 地元では有名でも、外国から来た人には見つけにくい1か所。上から：写真（ウィキメディア・コモンズの自由な写真・作者と条件を出す）→
// 何の所か・いつが良いか（12か月のおすすめ度）→ 1日のおすすめコース（着く → 穴場がいちばん良い時間 → ごはん → 温泉 → 帰る）と動く地図
// → Google マップの道案内 → 近くの見どころ → 入場券・確かめた日。Google マップのレビューの数は選ぶ時だけに使い、ここには出さない。

const MOSS = '#4f6b3a';
const ROLE: Record<string, { en: string; ja: string }> = {
  arrive: { en: 'Arrive', ja: '着く' }, stop: { en: 'On the way', ja: '途中で' }, spot: { en: 'The spot', ja: '名所' },
  meal: { en: 'Eat', ja: '食べる' }, onsen: { en: 'Hot spring', ja: '温泉' }, cafe: { en: 'Café', ja: 'ひと休み' }, leave: { en: 'Leave', ja: '帰る' },
};
const MODE: Record<string, { en: string; ja: string }> = {
  walk: { en: 'walk', ja: '歩いて' }, bus: { en: 'bus', ja: 'バス' }, train: { en: 'train', ja: '電車' }, taxi: { en: 'taxi', ja: 'タクシー' },
  car: { en: 'car', ja: '車' }, boat: { en: 'boat', ja: '船' },
};
const KIND: Record<string, { en: string; ja: string }> = {
  sight: { en: 'Sight', ja: '見どころ' }, food: { en: 'Food', ja: 'ごはん' }, cafe: { en: 'Café', ja: '喫茶' }, sweets: { en: 'Sweets', ja: '甘味' }, craft: { en: 'Craft', ja: '工芸' },
};

export function generateStaticParams() {
  return HIDDEN.map((s) => ({ city: 'japan', spot: s.slug }));
}

const months = (ms: number[], ja: boolean) => {
  // 続く月はまとめる（4・5月 → 4〜5月）
  const a = [...ms].sort((x, y) => x - y);
  if (!a.length) return '';
  const runs: number[][] = [];
  for (const m of a) { const r = runs.at(-1); if (r && m === r[r.length - 1] + 1) r.push(m); else runs.push([m]); }
  return runs.map((r) => (r.length > 1 ? `${monthLabel(r[0], ja)}${ja ? '〜' : '–'}${monthLabel(r.at(-1)!, ja)}` : monthLabel(r[0], ja))).join(ja ? '・' : ', ');
};

function words(s: HiddenSpot, ja: boolean) {
  const best = months(s.peakMonths, ja);
  return ja
    ? { title: `${s.name}（${s.prefectureJa}）`, lead: `${s.what}${s.seasonal && best ? ` 見頃は例年${best}。` : ''}` }
    : { title: `${s.nameEn}, ${s.prefecture}`, lead: `${s.whatEn}${s.seasonal && best ? ` Best in ${best} in a usual year.` : ''}` };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; city: string; spot: string }> }): Promise<Metadata> {
  const { locale, city, spot } = await params;
  const s = city === 'japan' ? getHidden(spot) : undefined;
  if (!s) return { title: 'LATITUDE — VUAL' };
  const ja = locale === 'ja';
  const w = words(s, ja);
  const path = `/latitude/places/japan/spot/${s.slug}`;
  const title = ja ? `${s.name}への1日 — ${s.prefectureJa}の地元の名所、行き方と見頃 | LATITUDE` : `${s.nameEn} — a day trip, when to go and how to get there | LATITUDE`;
  return {
    title,
    description: `${w.lead} ${ja ? '行き方、1日のおすすめコース、近くのごはんと温泉。編集部が2026年の営業を確かめました。' : 'How to get there, a day around it, food and hot springs nearby. Checked by the editors for 2026.'}`,
    alternates: { canonical: `/${ja ? 'ja' : 'en'}${path}`, languages: { en: `/en${path}`, ja: `/ja${path}`, 'x-default': `/en${path}` } },
    openGraph: { type: 'article', siteName: 'VUAL', title, url: `https://vual.jp/${ja ? 'ja' : 'en'}${path}`, images: s.banner ? [latAssetAbs(`hidden/${s.slug}/${s.banner.file}`)] : undefined },
  };
}

// Google マップの道案内（コースの地点を順に通る）。車の無い人向けは公共交通、無理な所は車
function directions(s: HiddenSpot) {
  const st = s.course?.stops ?? [];
  if (st.length < 2) return null;
  const q = st.map((x) => `${x.coords[0]},${x.coords[1]}`);
  const u = new URLSearchParams({ api: '1', origin: q[0], destination: q[q.length - 1], travelmode: s.course!.carFree ? 'transit' : 'driving' });
  if (q.length > 2) u.set('waypoints', q.slice(1, -1).join('|'));
  return `https://www.google.com/maps/dir/?${u.toString()}`;
}

export default async function HiddenSpotPage({ params }: { params: Promise<{ locale: string; city: string; spot: string }> }) {
  const { locale, city, spot } = await params;
  const s = city === 'japan' ? getHidden(spot) : undefined;
  if (!s) notFound();
  const ja = locale === 'ja';
  const w = words(s, ja);
  const town = s.townSlug ? getCity(s.townSlug) : undefined;
  const stops: RouteStop[] = (s.course?.stops ?? []).map((x, k) => ({
    n: k + 1, lat: x.coords[0], lon: x.coords[1], name: ja ? x.name : x.nameEn, place: ja ? x.name : x.nameEn, time: x.time, what: ja ? x.what : x.whatEn,
    photo: x.role === 'spot' && s.banner ? latAsset(`hidden/${s.slug}/${s.banner.file}`) : undefined,
  }));
  const dir = directions(s);
  const now = new Date().getMonth() + 1;
  const path = `/latitude/places/japan/spot/${s.slug}`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'TouristAttraction', name: ja ? s.name : s.nameEn, alternateName: ja ? s.nameEn : s.name,
    description: ja ? s.what : s.whatEn, url: `https://vual.jp/${ja ? 'ja' : 'en'}${path}`, sameAs: s.url,
    geo: { '@type': 'GeoCoordinates', latitude: s.coords[0], longitude: s.coords[1] },
    address: { '@type': 'PostalAddress', addressRegion: ja ? s.prefectureJa : s.prefecture, addressCountry: 'JP' },
    ...(s.banner ? { image: latAssetAbs(`hidden/${s.slug}/${s.banner.file}`) } : {}),
  };

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <JsonLd data={ld} />
      <JsonLd data={breadcrumbJsonLd(ja, [[ja ? '場所' : 'Places', '/latitude/places'], [ja ? '日本' : 'Japan', '/latitude/places/japan'], [ja ? s.name : s.nameEn, path]])} />
      <IssueStrip locale={locale} />

      <header className="mx-auto max-w-6xl px-4 pb-8 pt-16 md:px-8 md:pb-12 md:pt-24">
        <nav aria-label={ja ? '道しるべ' : 'Breadcrumb'} className="text-[11px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>
          <Link href={`/${locale}/latitude/places`} className="underline-offset-4 hover:underline" style={{ color: MUTE }}>{ja ? '場所' : 'Places'}</Link>
          <span className="mx-2">›</span>
          <Link href={`/${locale}/latitude/places/japan`} className="underline-offset-4 hover:underline" style={{ color: MUTE }}>{ja ? '日本' : 'Japan'}</Link>
          <span className="mx-2">›</span>
          <span style={{ color: MOSS }}>{ja ? '地元の名所' : 'Hidden spot'}</span>
        </nav>
        <p className="mt-6 text-[11px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>
          {ja ? `${s.prefectureJa} · ${s.townJa}から` : `${s.prefecture} · from ${s.town}`}
        </p>
        <h1 className="mt-3 text-[40px] leading-[1.02] md:text-[72px]" style={{ fontFamily: SERIF, fontWeight: 400, textWrap: 'balance' }}>
          {ja ? s.name : s.nameEn}
        </h1>
        {ja ? <p className="mt-2 text-[13px] tracking-[0.15em]" style={{ color: MUTE }}>{s.nameEn}</p> : <p className="mt-2 text-[14px]" style={{ color: MUTE }}>{s.name}</p>}
        <p className="mt-6 max-w-2xl text-[17px] leading-relaxed md:text-[20px]" style={{ fontFamily: SERIF }}>{w.lead}</p>
      </header>

      {s.banner && (
        <figure className="mx-auto max-w-6xl px-4 md:px-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={latAsset(`hidden/${s.slug}/${s.banner.file}`)} alt={ja ? s.name : s.nameEn} className="block aspect-[16/9] w-full object-cover md:aspect-[21/9]"
            style={{ objectPosition: `50% ${s.banner.y ?? 50}%` }} />
          <figcaption className="mt-2 text-[10px] leading-relaxed" style={{ color: MUTE }}>
            {ja ? '写真' : 'Photo'}: {s.banner.author || 'Wikimedia Commons'} ·{' '}
            <a href={s.banner.licenseUrl || s.banner.page} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: MUTE }}>{s.banner.license}</a> ·{' '}
            <a href={s.banner.page} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: MUTE }}>Wikimedia Commons</a>
          </figcaption>
        </figure>
      )}

      {/* いつ行くか：12か月のおすすめ度 */}
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-12 md:px-8 md:pb-20">
        <SectionLabel>{ja ? 'いつ行くか' : 'When to go'}</SectionLabel>
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
          <div>
            <Strip score={s.monthScore} at={now} big />
            <p className="mt-4 text-[14px] leading-relaxed">{ja ? s.peakNoteJa : s.peakNote}</p>
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: MUTE }}>
              {ja ? `棒の高さは、その月のおすすめ度（0〜5）。例年の見頃で、年によって1〜2週ずれます。濃い棒は今月（${now}月）。` : `Bar height is how much we recommend each month (0–5), for a usual year; seasons can shift by a week or two. The dark bar is this month.`}
            </p>
          </div>
          <ul className="flex flex-col gap-2 text-[13px]">
            {s.monthScore.map((v, i) => {
              const n = s.monthNote[String(i + 1)];
              if (!n && v > 0 && v < 4) return null;
              return (
                <li key={i} className="flex items-baseline gap-3">
                  <Link href={`/${locale}/latitude/places/japan/${MONTHS[i]}`} className="w-14 shrink-0 tabular-nums underline-offset-4 hover:underline" style={{ color: MUTE }}>{monthLabel(i + 1, ja)}</Link>
                  <Dots n={v} />
                  <span>{v === 0 ? (ja ? '行けない月' : 'Closed') : n ? (ja ? n.ja : n.en) : ''}</span>
                </li>
              );
            })}
          </ul>
        </div>
        {(ja ? s.ticketJa : s.ticket) && (
          <p className="mt-8 max-w-2xl border-l-2 pl-4 text-[13px] leading-relaxed" style={{ borderColor: MOSS }}>
            <span className="mr-2 text-[10px] uppercase tracking-[0.3em]" style={{ color: MOSS }}>{ja ? '入場・予約' : 'Tickets'}</span>
            {ja ? s.ticketJa : s.ticket}
          </p>
        )}
      </section>

      {/* 1日のおすすめコース */}
      {s.course && stops.length >= 2 && (
        <section className="px-4 pb-16 md:px-8 md:pb-24">
          <div className="mx-auto max-w-6xl">
            <SectionLabel>{ja ? `1日のおすすめ — ${s.course.titleJa}` : `A day there — ${s.course.titleEn}`}</SectionLabel>
            <p className="-mt-4 mb-8 max-w-2xl text-[14px] leading-relaxed" style={{ color: MUTE }}>
              {ja ? s.course.noteJa : s.course.noteEn}
              {' '}{s.course.carFree ? (ja ? '車がなくても回れる順です。' : 'You can do it without a car.') : (ja ? '公共の交通では回りにくいので、車の順にしています。' : 'Hard by public transport, so this is planned by car.')}
            </p>
            {s.baseMap && <CityRouteMap src={`/latitude/citymaps/spot-${s.slug}.json`} stops={stops} ja={ja} walk={s.walk ?? null} />}
            <ol className="mt-10 flex flex-col">
              {s.course.stops.map((x, k) => (
                <li key={k} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 border-t py-5 md:grid-cols-[5rem_8rem_minmax(0,1fr)]" style={{ borderColor: 'rgba(30,29,27,0.14)' }}>
                  <span className="text-[20px] tabular-nums leading-none md:text-[24px]" style={{ fontFamily: SERIF, color: x.role === 'spot' ? MOSS : INK }}>{x.time}</span>
                  <span className="hidden pt-1 text-[10px] uppercase tracking-[0.3em] md:block" style={{ color: x.role === 'spot' ? MOSS : MUTE }}>{ja ? ROLE[x.role]?.ja : ROLE[x.role]?.en}</span>
                  <div className="min-w-0 flow-root">
                    {/* 2026-11-14 ユーザー決定：店・温泉の公式サイトのシェア用の写真（og:image）を右に小さく。保存せず公式サイトの写真をそのまま出し、押すと公式サイトへ */}
                    {x.photo && (x.photoCredit || x.url) && (
                      <a href={x.photoCredit ? x.photoCredit.page : x.url} target="_blank" rel="noopener noreferrer" className="float-right mb-2 ml-4 block w-[112px] md:w-[168px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={x.photo} alt={ja ? x.name : x.nameEn} loading="lazy" referrerPolicy="no-referrer"
                          className="block aspect-[4/3] w-full object-cover" style={{ background: 'rgba(30,29,27,0.06)' }} />
                        <span className="mt-1 block text-[9px] leading-snug tracking-[0.1em]" style={{ color: MUTE }}>
                          {x.photoCredit
                            ? `${ja ? '写真' : 'Photo'}: ${x.photoCredit.author} · ${x.photoCredit.license} · Wikimedia Commons`
                            : ja ? '写真：公式サイトより' : 'Photo: official website'}
                        </span>
                      </a>
                    )}
                    <p className="text-[17px] leading-snug" style={{ fontFamily: SERIF }}>
                      <span className="mr-2 text-[12px] tabular-nums" style={{ color: MUTE }}>{k + 1}</span>
                      {x.url ? <a href={x.url} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">{ja ? x.name : x.nameEn}</a> : (ja ? x.name : x.nameEn)}
                    </p>
                    <p className="mt-1 text-[14px] leading-relaxed">{ja ? x.what : x.whatEn}</p>
                    {x.move && k < s.course!.stops.length - 1 && (
                      <p className="mt-2 text-[11px] tracking-[0.05em]" style={{ color: MUTE }}>
                        ↓ {ja ? `${MODE[x.move.mode]?.ja ?? x.move.mode} 約${x.move.min}分 · ${x.move.note}` : `${MODE[x.move.mode]?.en ?? x.move.mode}, about ${x.move.min} min · ${x.move.noteEn}`}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              {dir && (
                <a href={dir} target="_blank" rel="noopener noreferrer" className="inline-flex w-max items-center gap-3 px-5 py-3 text-[11px] uppercase tracking-[0.3em] hover:bg-[rgba(30,29,27,0.06)]" style={{ border: `1px solid ${INK}`, color: INK }}>
                  {ja ? 'Google マップで、この順に開く' : 'Open this day in Google Maps'}&nbsp;↗
                </a>
              )}
              <p className="max-w-md text-[11px] leading-relaxed md:text-right" style={{ color: MUTE }}>
                {ja ? '時刻は目安です。バスや電車の時刻・お店の休みは、出かける前に公式で確かめてください。' : 'Times are a guide. Check bus and train times and closing days on the official sites before you go.'}
                {s.baseMap && (ja ? ' 地図データ © OpenStreetMap contributors（道の計算 FOSSGIS OSRM）' : ' Map data © OpenStreetMap contributors (routes: FOSSGIS OSRM)')}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 近くの見どころ（2026年の営業を確かめた所） */}
      {s.nearby.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 md:px-8 md:pb-24">
          <SectionLabel>{ja ? '近くで、あわせて' : 'Nearby'}</SectionLabel>
          <ul className="grid gap-x-10 gap-y-6 md:grid-cols-2">
            {s.nearby.map((n) => (
              <li key={n.name} className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>{ja ? KIND[n.kind]?.ja ?? n.kind : KIND[n.kind]?.en ?? n.kind}</p>
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-[18px] underline-offset-4 hover:underline" style={{ fontFamily: SERIF }}>{ja ? n.name : n.nameEn}</a>
                <p className="mt-1 text-[14px] leading-relaxed">{ja ? n.what : n.whatEn}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-24 md:px-8">
        <p className="text-[12px] leading-relaxed" style={{ color: MUTE }}>
          {ja ? `公式：` : 'Official: '}
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: INK }}>{s.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>
          {ja ? ` · 編集部が${s.verifiedAt.replace(/-/g, '.')}に、公式のページで2026年の営業を確かめました。` : ` · The editors checked on the official page that it is open in 2026 (${s.verifiedAt}).`}
        </p>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-[10px] uppercase tracking-[0.3em]">
          {town && <Link href={`/${locale}/latitude/places/${town.slug}`} className="underline-offset-4 hover:underline">{ja ? `${town.nameJa}の街の案内 →` : `${town.name} city guide →`}</Link>}
          <Link href={`/${locale}/latitude/places/japan/${MONTHS[(s.peakMonths[0] ?? now) - 1]}`} className="underline-offset-4 hover:underline">
            {ja ? `${monthLabel(s.peakMonths[0] ?? now, true)}の地元の名所 →` : `Hidden spots in ${monthLabel(s.peakMonths[0] ?? now, false)} →`}
          </Link>
          <Link href={`/${locale}/latitude/places/japan`} className="underline-offset-4 hover:underline">{ja ? '日本の地図へ →' : 'Back to the map of Japan →'}</Link>
        </div>
      </section>

      <footer className="pb-28">
        <PublishedBy locale={locale} />
      </footer>
    </div>
  );
}

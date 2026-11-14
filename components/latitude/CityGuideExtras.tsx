import { INK, MUTE, SERIF, SectionLabel } from '@/components/latitude/Latitude';
import { slugify, type CityPlace, type LatitudeCity } from '@/lib/latitude-places';
import { latAsset } from '@/lib/latitude-assets';
import HScroller from '@/components/latitude/HScroller';
import { CARD_W } from '@/lib/latitude-card';
import CityRouteMap, { ShowRouteStop, type RouteStop } from '@/components/latitude/CityRouteMap';
import { getWalk } from '@/lib/latitude-routes';
import { km, mins } from '@/lib/latitude-routes/format';
import { ReelPlayer } from '@/components/latitude/ReelPlayer';
import { reelSources } from '@/components/latitude/Latitude';
import { getIssue, isLive } from '@/lib/latitude';
import Link from 'next/link';

// 2026-10-30 街のページの「この季節に何を着るか」と「旅人の1日の回り方」。AI のチャットにない、VUAL の旅の服と、その日を丸ごと真似できる順番を見せる。
// 回り方の店は「近くの、旅人のおすすめ」。旅人がその店に行ったとは書かない（行ったのは号の場面の場所だけ）。

export const placeAnchor = (x: CityPlace) => `place-${slugify(x.nameEn)}`;

export function CityWear({ c, ja, who }: { c: LatitudeCity; ja: boolean; who: string }) {
  const w = c.wear;
  if (!w) return null;
  const city = ja ? c.nameJa : c.name;
  return (
    <section className="px-4 pb-20 md:px-8 md:pb-28">
      <div className="mx-auto max-w-6xl">
        <SectionLabel>{ja ? `${w.seasonJa}の${city}で、何を着るか` : `What to wear in ${city}, ${w.season.toLowerCase()}`}</SectionLabel>
        <ul className="mb-10 flex max-w-2xl flex-col gap-1 text-[15px] leading-relaxed" style={{ color: MUTE }}>
          {w.facts.map((f) => <li key={f.en}>{ja ? f.ja : f.en}</li>)}
        </ul>
        {/* スマホでは横に流す（縦長の写真を3枚縦に積むと長すぎる）。広い画面では3列 */}
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0" style={{ scrollbarWidth: 'thin' }}>
          {w.looks.map((l) => (
            <figure key={l.time} className="flex w-[68vw] min-w-0 shrink-0 snap-start flex-col gap-3 sm:w-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* 服が頭から靴まで見えるように、号の絵の縦長のまま（切ると顔や足が切れる） */}
              <img src={latAsset(`places/${c.slug}/${l.image}`)} alt={ja ? l.itemsJa : l.items} loading="lazy" className="w-full object-cover" style={{ aspectRatio: '9 / 16' }} />
              <figcaption className="flex flex-col gap-2">
                <span className="lat-label tabular-nums" style={{ color: MUTE }}>{l.time}</span>
                <span className="text-[15px] leading-relaxed">{ja ? l.itemsJa : l.items}</span>
                <span className="text-[16px] leading-relaxed" style={{ fontFamily: SERIF }}>
                  <span className="mr-2 text-[12px] uppercase tracking-[0.18em] [&:lang(ja)]:tracking-[0.08em]" style={{ color: MUTE }}>{who}</span>
                  {ja ? l.noteJa : l.note}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        {/* 実在ブランドの服で撮った号（vualOriginals: false）は出さない。ブランド名も書かない */}
        {w.vualOriginals !== false && <p className="mt-8 text-[13px]" style={{ color: MUTE }}>{ja ? '服はすべて VUAL のオリジナルです。' : 'All clothes are VUAL originals.'}</p>}
      </div>
    </section>
  );
}

// 地図に点のある時刻（coords あり）に、1からの番号を付ける。地図・カード・Google マップで同じ番号
const routeNumbers = (c: LatitudeCity) => {
  let k = 0;
  return (c.route || []).map((r) => (r.coords ? ++k : 0));
};

// withMap：上に「凛の1日の道」の地図がある時。カードに番号と「地図で見る」を付け、写真を押すと地図のその点へ。bare：外の section を付けない
export function CityRoute({ c, ja, who, withMap = false, bare = false }: { c: LatitudeCity; ja: boolean; who: string; withMap?: boolean; bare?: boolean }) {
  if (!c.route?.length) return null;
  const byName = new Map(c.places.map((x) => [x.name, x]));
  const nums = routeNumbers(c);
  // 2026-11-11 ユーザー「縦スクロールが多すぎる」→ 1つの時刻＝1枚のカードを横に流す（上に写真 4:5、下に時刻・場所・一文・近くのおすすめ）
  const list = (
        <HScroller count={c.route.length} label={ja ? `${who}の1日の回り方` : `${who}'s day, in order`} ja={ja}
          head={<p className="lat-label" style={{ color: MUTE }}>{ja ? `${who}の1日の回り方` : `${who}'s day, in order`}</p>}>
          {c.route.map((r, k) => {
            const num = withMap ? nums[k] : 0;
            const near = (r.near || []).map((n) => byName.get(n)).filter(Boolean) as CityPlace[];
            return (
              <li key={r.time} id={num ? `route-stop-${num}` : undefined} className={`${CARD_W} shrink-0 snap-start`}>
                {r.image && num > 0 ? (
                  <ShowRouteStop n={num} label={ja ? `${num}. ${r.placeJa}を地図で見る` : `${num}. ${r.place} on the map`} className="block w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={latAsset(`places/${c.slug}/${r.image}`)} alt={ja ? r.whatJa : r.what} loading="lazy" className="block w-full object-cover" style={{ aspectRatio: '4 / 5' }} />
                  </ShowRouteStop>
                ) : r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={latAsset(`places/${c.slug}/${r.image}`)} alt={ja ? r.whatJa : r.what} loading="lazy" className="block w-full object-cover" style={{ aspectRatio: '4 / 5' }} />
                ) : (
                  // 写真の無い時刻は、紙に時刻だけ（店や場面の写真を作らない）
                  <div className="flex w-full items-end p-5" style={{ aspectRatio: '4 / 5', border: '1px solid rgba(30,29,27,0.14)' }}>
                    <span className="text-[44px] leading-none tabular-nums" style={{ fontFamily: SERIF, color: MUTE }}>{r.time}</span>
                  </div>
                )}
                <p className="mt-4 flex items-baseline justify-between gap-4 text-[12px] uppercase tabular-nums tracking-[0.2em]" style={{ color: MUTE }}>
                  <span>
                    {num > 0 && <span className="mr-2 text-[17px] normal-case tracking-normal" style={{ fontFamily: SERIF, color: INK }}>{num}</span>}
                    {r.time}
                  </span>
                  {num > 0 && <span className="text-[12px] tracking-[0.18em] [&:lang(ja)]:tracking-[0.08em]"><ShowRouteStop n={num} label={ja ? '地図で見る ↑' : 'On the map ↑'} className="-my-[13px] inline-flex min-h-[44px] items-center underline-offset-4 hover:underline" /></span>}
                </p>
                <p className="mt-1 text-[20px] leading-snug" style={{ fontFamily: SERIF }}>{ja ? r.placeJa : r.place}</p>
                <p className="mt-1 text-[15px] leading-relaxed">{ja ? r.whatJa : r.what}</p>
                {near.length > 0 && (
                  <p className="mt-3 text-[13px] leading-relaxed" style={{ color: MUTE }}>
                    {ja ? `近くの、${who}のおすすめ：` : `Nearby, ${who} would go to: `}
                    {near.map((x, k) => (
                      <span key={x.name}>
                        {k > 0 && (ja ? '、' : ', ')}
                        <a href={`#${placeAnchor(x)}`} className="underline underline-offset-4" style={{ color: INK }}>{ja ? x.name : x.nameEn}</a>
                      </span>
                    ))}
                  </p>
                )}
              </li>
            );
          })}
        </HScroller>
  );
  if (bare) return list;
  return (
    <section className="px-4 pb-20 md:px-8 md:pb-28">
      <div className="mx-auto max-w-6xl">{list}</div>
    </section>
  );
}

// 2026-11-11 試作（金沢）：「凛の1日を映像で見て、その道を地図でたどり、Google マップで開く」。ユーザーの考え：
// ほかのサイトのモデルコースは文字と写真だけ。LATITUDE は、先に凛の映像でその1日を見て、同じ道を歩ける。
// ①号のリール（Cloudflare Stream）②点線が時刻の順に伸びる地図（CityRouteMap）③地点を順に通る Google マップの道案内 ④下に1日の回り方のカード（番号で地図と行き来）。
// 位置（coords）のある時刻が2つ以上ある街だけ。無い街は今までどおり CityRoute だけを出す。
export function hasDayRoute(c: LatitudeCity) {
  return (c.route || []).filter((r) => r.coords).length >= 2;
}

// Google マップの道案内（歩き）。地点の名前＋街の名前で、時刻の順に通る。https://developers.google.com/maps/documentation/urls/get-started#directions-action
export function googleDirectionsUrl(c: LatitudeCity) {
  const q = (c.route || []).filter((r) => r.coords).map((r) => r.gmaps ?? `${r.placeJa} ${c.nameJa}`);
  const u = new URLSearchParams({ api: '1', origin: q[0], destination: q[q.length - 1], travelmode: 'walking' });
  if (q.length > 2) u.set('waypoints', q.slice(1, -1).join('|'));
  return `https://www.google.com/maps/dir/?${u.toString()}`;
}

export function CityDayRoute({ c, ja, who, locale }: { c: LatitudeCity; ja: boolean; who: string; locale: string }) {
  if (!hasDayRoute(c)) return null;
  const issue = getIssue(c.issue ?? c.slug);
  const reel = issue && isLive(issue) && issue.streamId ? reelSources(issue) : null;
  const nums = routeNumbers(c);
  const stops: RouteStop[] = (c.route || []).flatMap((r, k) => (r.coords ? [{
    n: nums[k],
    lat: r.coords[0],
    lon: r.coords[1],
    name: (ja ? r.shortJa : r.short) ?? (ja ? r.placeJa : r.place),
    place: ja ? r.placeJa : r.place,
    time: r.time,
    what: ja ? r.whatJa : r.what,
    photo: r.image ? latAsset(`places/${c.slug}/${r.image}`) : undefined,
  }] : []));
  // 号の章の番号（I・II・III・IV）は、地図に出さない時刻の名前からは外す
  const offMap = (c.route || []).filter((r) => !r.coords).map((r) => ({ place: r.place.replace(/^[IVX]+ /, ''), placeJa: r.placeJa.replace(/^[IVX]+ /, '') }));
  // 歩く道の線（OpenStreetMap の歩行者ルートで一度だけ計算した物）。無い街・地点を直した後は、地点の間をゆるい曲線でつなぐ
  const walk = getWalk(c.slug, stops.map((s) => [s.lat, s.lon]));
  const city = ja ? c.nameJa : c.name;
  return (
    <section className="px-4 pb-16 md:px-8 md:pb-24">
      <div className="mx-auto max-w-6xl">
        {/* 2026-11-11 下の店の地図に「自分でルートを組む」がある街は、こちらが「凛のルートをなぞる」と分かる見出しに */}
        <SectionLabel>
          {c.routeBuilder
            ? (ja ? `${who}のルートをなぞる——${city}の1日を見て、同じ道を歩く` : `Follow ${who}'s route — watch the day in ${city}, then walk it`)
            : (ja ? `${who}の${city}の1日を見て、同じ道を歩く` : `Watch ${who}'s day in ${city}, then walk it`)}
        </SectionLabel>
        <p className="-mt-4 mb-8 max-w-xl text-[15px] leading-relaxed" style={{ color: MUTE }}>
          {ja
            ? `先に映像で1日を見て、地図で同じ順をたどれます。最後は Google マップで、そのまま歩く道案内に。`
            : `See the day first, then follow the same order on the map, and open it as walking directions in Google Maps.`}
        </p>
        <div className="flex flex-col gap-8 md:grid md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:items-stretch md:gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          {reel && (
            <div>
              <p className="lat-label mb-3" style={{ color: MUTE }}>{ja ? '① この1日を見る' : '1 · Watch the day'}</p>
              <div className="relative mx-auto w-[72vw] max-w-[320px] overflow-hidden bg-black md:w-full md:max-w-none" style={{ aspectRatio: '9 / 16' }}>
                <ReelPlayer src={reel.src} poster={reel.poster} title={reel.title} />
              </div>
              <p className="mt-3 text-center text-[12px] uppercase tracking-[0.2em] [&:lang(ja)]:tracking-[0.08em] md:text-left" style={{ color: MUTE }}>
                {ja ? '押すと音が出ます' : 'Tap for sound'}
                {issue && (
                  <>
                    &nbsp;&nbsp;·&nbsp;&nbsp;
                    <Link href={`/${locale}/latitude/${issue.slug}`} className="-my-[13px] inline-flex min-h-[44px] items-center underline-offset-4 hover:underline" style={{ color: INK }}>{ja ? '号を読む →' : 'Read the issue →'}</Link>
                  </>
                )}
              </p>
            </div>
          )}
          <div className="flex min-w-0 flex-col">
            <p className="lat-label mb-3" style={{ color: MUTE }}>{ja ? '② 同じ道を、地図で' : '2 · The same day, on the map'}</p>
            <div className="min-h-0 flex-1">
              <CityRouteMap src={`/latitude/citymaps/${c.slug}.json`} stops={stops} ja={ja} walk={walk} />
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-4 md:mt-6 md:flex-row md:items-start md:justify-between md:gap-10">
          <div>
            <p className="lat-label mb-3" style={{ color: MUTE }}>{ja ? '③ 歩く' : '3 · Walk it'}</p>
            <a href={googleDirectionsUrl(c)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-5 py-3 text-[12px] uppercase tracking-[0.2em] [&:lang(ja)]:tracking-[0.08em] transition-colors hover:bg-[rgba(30,29,27,0.06)]"
              style={{ border: `1px solid ${INK}`, color: INK }}>
              {ja ? `Google マップで、この道を開く` : 'Open this walk in Google Maps'}&nbsp;↗
            </a>
          </div>
          <p className="max-w-md text-[13px] leading-relaxed md:pt-7 md:text-right" style={{ color: MUTE }}>
            {walk && (
              <span className="mb-1 block tabular-nums" style={{ color: INK }}>
                {ja ? `歩くと約${km(walk.distance)}・${mins(walk.duration, true)}（寄り道なし）` : `About ${km(walk.distance)} on foot, ${mins(walk.duration, false)} without stops`}
              </span>
            )}
            {walk
              ? (ja
                ? `点線は、歩いた場合の目安の道です（OpenStreetMap の歩行者ルート）。Google マップの案内とは、細い道が違うことがあります。`
                : `The dotted line is a likely walking route (OpenStreetMap). Google Maps may choose different side streets.`)
              : (ja ? '地図の点線は回る順の目安で、実際の道ではありません。' : 'The dotted line shows the order, not the actual streets.')}
            {ja
              ? `${offMap.length ? `${offMap.map((r) => r.placeJa).join('・')}は地図に出していません。` : ''}地図データ © OpenStreetMap contributors${walk ? '（道の計算 FOSSGIS OSRM）' : ''}`
              : `${offMap.length ? ` ${offMap.map((r) => r.place).join(', ')} is not on the map.` : ''} Map data © OpenStreetMap contributors${walk ? ' (route: FOSSGIS OSRM)' : ''}`}
          </p>
        </div>
        <div className="mt-14">
          <CityRoute c={c} ja={ja} who={who} withMap bare />
        </div>
      </div>
    </section>
  );
}

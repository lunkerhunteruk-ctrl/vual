// 2026-11-11 試作：「場所から探す」ページ（/latitude/places）のデータ。国ごとに、街の案内がある街を並べる。
// 地図の形は public/latitude/placesmap.json（scripts/latitude-places-map.py）、点の位置は lib/latitude-map.ts と同じ図法。
// 号のある街は「行った街」。号を予定していてまだ公開していない街は「これから行く街」として
// 別の印で出せる作り。ただし SHOW_UPCOMING が false の間は、地図にも一覧にも出さない。
// 2026-11-11 号を予定していない「街の案内」だけの町（scripts/latitude-import-city.py で足す町）は、案内の町としてそのまま出す。

import { CITIES, type LatitudeCity } from '@/lib/latitude-places';
import { PLACES, project } from '@/lib/latitude-map';
import { assetUrl, getIssue, getPerson, isLive, type LatitudeIssue } from '@/lib/latitude';
import { regionOf } from '@/lib/latitude-regions';
import { getThumbnailUrl } from '@/lib/cloudflare-stream';

export const SHOW_UPCOMING = false;

// slug は国のページの URL（/latitude/places/<slug>）。街の slug と同じ物は作らない（下の確かめで止まる）
export const COUNTRY_NAMES: Record<string, { en: string; ja: string; slug: string }> = {
  JP: { en: 'Japan', ja: '日本', slug: 'japan' },
  GB: { en: 'United Kingdom', ja: 'イギリス', slug: 'united-kingdom' },
  DK: { en: 'Denmark', ja: 'デンマーク', slug: 'denmark' },
  IT: { en: 'Italy', ja: 'イタリア', slug: 'italy' },
  IS: { en: 'Iceland', ja: 'アイスランド', slug: 'iceland' },
  AT: { en: 'Austria', ja: 'オーストリア', slug: 'austria' },
  SE: { en: 'Sweden', ja: 'スウェーデン', slug: 'sweden' },
};
// 2026-11-11 国のページは街のページと同じ /latitude/places/<slug>（app/[locale]/latitude/places/[city]/page.tsx で分ける）。
// 国と街の slug が重なると片方のページが見えなくなるので、重なったら作る時に止める
{
  const clash = CITIES.filter((c) => Object.values(COUNTRY_NAMES).some((n) => n.slug === c.slug)).map((c) => c.slug);
  if (clash.length) throw new Error(`LATITUDE: city slug(s) equal a country slug: ${clash.join(', ')}`);
}
// 2026-11-11 世界の地図で国の点に重ねた時に出す号の写真。ふだんは、その国のいちばん新しい号から始めて、ほかの号へ切り替える。
// 国ごとに最初に見せたい1枚を決める時だけ、ここに 国コード → 号の slug を書く（例 GB: 'haworth'）。書いた号が先頭、あとは新しい順
export const COUNTRY_PHOTO_PIN: Record<string, string> = {};

// 2026-11-11 その写真は、号の表紙（大きな緯度の数字が入る）ではなく、リールの途中の字の無いコマ（Cloudflare Stream のサムネイル）。
// t＝リールの何秒目か、y＝丸く切る時の縦の位置（%。0＝上・50＝まん中。縦長のコマの顔は上の方にあるので既定は30）。
// 表に無い号は PHOTO_DEFAULT_T 秒（25秒前後のリールの約4割）。冒頭と終わりは題字が入るので使わない。streamId の無い号は表紙のまま。
// 下の秒は 2026-11-11 にリールの30〜55%のコマを並べて見て、人物の顔か姿が分かるコマを選んだ（人のいない景色・手元だけ・空撮のコマを外した）
export const ISSUE_PHOTO_FRAME: Record<string, { t: number; y?: number }> = {
  iceland: { t: 10.0, y: 20 }, // 22.2秒のうち・港で立つ（4割の 8.9秒は人のいない浜）
  copenhagen: { t: 9.6 }, // 21.3秒・腰かける
  london: { t: 10.1 }, // 22.5秒・腰かける
  edinburgh: { t: 15.0 }, // 37.5秒・顔
  milan: { t: 12.5 }, // 27.8秒・食卓の顔
  faro: { t: 13.4 }, // 33.5秒・石に腰かける
  kanazawa: { t: 13.5 }, // 24.5秒・顔（4割の 9.8秒は人のいない茶屋街）
  vienna: { t: 12.1 }, // 30.4秒・フードの顔と赤い電車
  haworth: { t: 11.0 }, // 24.5秒・顔（4割の 9.8秒は本と手元）
  reggio: { t: 10.2 }, // 25.5秒・バールの中
  morioka: { t: 13.0 }, // 26.0秒・カウンターの顔（4割の 10.4秒は暗い戸口）
  tottori: { t: 14.3 }, // 25.9秒・顔（4割の 10.4秒は足元）
};
const PHOTO_DEFAULT_T = 10;
export type CountryPhoto = { slug: string; src: string; y: number };
function issuePhoto(i: LatitudeIssue): Omit<CountryPhoto, 'slug'> {
  if (!i.streamId) return { src: assetUrl(i, 'cover.jpg'), y: 50 };
  const f = ISSUE_PHOTO_FRAME[i.slug];
  // 丸は80px。画面の細かい端末でもぼけないよう、高さ480（幅は270）で取る
  return { src: getThumbnailUrl(i.streamId, { time: `${f?.t ?? PHOTO_DEFAULT_T}s`, height: 480 }), y: f?.y ?? 30 };
}

// 国の並び（凛の日本が先、あとは北から）
const ORDER = ['JP', 'IS', 'SE', 'DK', 'GB', 'AT', 'IT'];

export type PlaceCity = {
  slug: string;
  name: string;
  nameJa: string;
  latitude: string;
  lat: number;
  lon: number;
  x: number; // 世界の地図の上の位置（lib/latitude-map.ts の project）
  y: number;
  person?: { slug: string; name: string };
  issue?: { slug: string; cover: string; month?: string; no: number }; // 公開ずみの号（no は号の番号。大きいほど新しい）
  upcoming: boolean; // 号がまだ無い（これから行く街）
  region?: string; // 国の中の地方（lib/latitude-regions.ts。いまは日本だけ）。地図で地方ごとにまとめる
  preview?: boolean; // 2026-11-11 試しの町（?preview=50 の時だけ地図に足す。街のページは無い）
};
// issues：その国の公開ずみの号の写真（リールの途中のコマ。COUNTRY_PHOTO_PIN の号が先頭、あとは新しい順）。世界の地図で国の点に重ねた時に出す
export type PlaceCountry = { code: string; slug: string; name: { en: string; ja: string }; cities: PlaceCity[]; issues: CountryPhoto[] };

function pointOf(c: LatitudeCity): [number, number] | undefined {
  return c.coords ?? PLACES[c.issue ?? c.slug];
}

export function placeCountries(now: number = Date.now()): PlaceCountry[] {
  const m = new Map<string, PlaceCity[]>();
  for (const c of CITIES) {
    const at = pointOf(c);
    if (!at) continue;
    const i = getIssue(c.issue ?? c.slug);
    const live = !!i && isLive(i, now);
    // 2026-11-11 号を予定していない町（号のない「街の案内」だけの町。萩・高山・函館…）は、ふつうの案内の町として出す（地方の数字の丸の中・小さな点）。
    // 号を予定していて、まだ公開していない町だけが「これから」（upcoming）
    const planned = !!c.issue || !!i;
    if (!live && planned && !SHOW_UPCOMING) continue;
    const p = getPerson(c.person);
    const code = c.countryCode ?? 'JP';
    const city: PlaceCity = {
      slug: c.slug,
      name: c.name,
      nameJa: c.nameJa,
      latitude: c.latitude,
      lat: at[0],
      lon: at[1],
      ...project(at[0], at[1]),
      person: p ? { slug: p.slug, name: p.name } : undefined,
      issue: live && i ? { slug: i.slug, cover: assetUrl(i, 'cover.jpg'), month: i.month, no: i.no } : undefined,
      upcoming: !live && planned,
      // 日本の町の countryJa は県名
      region: regionOf(code, c.countryJa, at[0], at[1]),
    };
    m.set(code, [...(m.get(code) ?? []), city]);
  }
  const codes = [...m.keys()].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
  return codes.map((code) => {
    const pin = COUNTRY_PHOTO_PIN[code];
    const issues = m.get(code)!.flatMap((q) => (q.issue ? [q.issue] : []))
      .sort((a, b) => Number(b.slug === pin) - Number(a.slug === pin) || b.no - a.no)
      .map(({ slug }) => ({ slug, ...issuePhoto(getIssue(slug)!) }));
    return {
      code,
      slug: COUNTRY_NAMES[code]?.slug ?? code.toLowerCase(),
      name: { en: COUNTRY_NAMES[code]?.en ?? code, ja: COUNTRY_NAMES[code]?.ja ?? code },
      // 国の中は北から
      cities: m.get(code)!.sort((a, b) => b.lat - a.lat),
      issues,
    };
  });
}

export const getPlaceCountry = (slug: string, now: number = Date.now()) => placeCountries(now).find((c) => c.slug === slug);
export const countryOfCity = (citySlug: string, now: number = Date.now()) => placeCountries(now).find((c) => c.cities.some((q) => q.slug === citySlug));

// 検索エンジン向け：街の一覧（ItemList of City）
export function citiesJsonLd(countries: PlaceCountry[], ja: boolean, name: string) {
  const site = `https://vual.jp/${ja ? 'ja' : 'en'}/latitude`;
  let n = 0;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: countries.flatMap((c) => c.cities.map((q) => ({
      '@type': 'ListItem',
      position: ++n,
      item: {
        '@type': 'City',
        name: ja ? q.nameJa : q.name,
        url: `${site}/places/${q.slug}`,
        geo: { '@type': 'GeoCoordinates', latitude: q.lat, longitude: q.lon },
        containedInPlace: { '@type': 'Country', name: ja ? c.name.ja : c.name.en, identifier: c.code, url: `${site}/places/${c.slug}` },
        ...(q.issue ? { subjectOf: { '@type': 'CreativeWork', name: `LATITUDE ${q.latitude} ${q.name}`, url: `${site}/${q.issue.slug}` } } : {}),
      },
    }))),
  };
}

// 道しるべ（BreadcrumbList）。items は [名前, パス（/latitude から下）]
export function breadcrumbJsonLd(ja: boolean, items: [string, string][]) {
  const site = `https://vual.jp/${ja ? 'ja' : 'en'}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${site}${path}` })),
  };
}

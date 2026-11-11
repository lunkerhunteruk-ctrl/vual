// 2026-11-11 試作：「場所から探す」ページ（/latitude/places）のデータ。国ごとに、街の案内がある街を並べる。
// 地図の形は public/latitude/placesmap.json（scripts/latitude-places-map.py）、点の位置は lib/latitude-map.ts と同じ図法。
// 号のある街（いまは全部）は「行った街」。号がまだ無い街（店のデータだけ先に作った街）は「これから行く街」として
// 別の印で出せる作り。ただし SHOW_UPCOMING が false の間は、地図にも一覧にも出さない。

import { CITIES, type LatitudeCity } from '@/lib/latitude-places';
import { PLACES, project } from '@/lib/latitude-map';
import { assetUrl, getIssue, getPerson, isLive } from '@/lib/latitude';
import { regionOf } from '@/lib/latitude-regions';

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
// issues：その国の公開ずみの号の写真（COUNTRY_PHOTO_PIN の号が先頭、あとは新しい順）。世界の地図で国の点に重ねた時に出す
export type PlaceCountry = { code: string; slug: string; name: { en: string; ja: string }; cities: PlaceCity[]; issues: { slug: string; cover: string }[] };

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
    if (!live && !SHOW_UPCOMING) continue;
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
      upcoming: !live,
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
      .map(({ slug, cover }) => ({ slug, cover }));
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

// 2026-11-11 試作：「場所から探す」ページ（/latitude/places）のデータ。国ごとに、街の案内がある街を並べる。
// 地図の形は public/latitude/placesmap.json（scripts/latitude-places-map.py）、点の位置は lib/latitude-map.ts と同じ図法。
// 号のある街（いまは全部）は「行った街」。号がまだ無い街（店のデータだけ先に作った街）は「これから行く街」として
// 別の印で出せる作り。ただし SHOW_UPCOMING が false の間は、地図にも一覧にも出さない。

import { CITIES, type LatitudeCity } from '@/lib/latitude-places';
import { PLACES, project } from '@/lib/latitude-map';
import { assetUrl, getIssue, getPerson, isLive } from '@/lib/latitude';

export const SHOW_UPCOMING = false;

export const COUNTRY_NAMES: Record<string, { en: string; ja: string }> = {
  JP: { en: 'Japan', ja: '日本' },
  GB: { en: 'United Kingdom', ja: 'イギリス' },
  DK: { en: 'Denmark', ja: 'デンマーク' },
  IT: { en: 'Italy', ja: 'イタリア' },
  IS: { en: 'Iceland', ja: 'アイスランド' },
  AT: { en: 'Austria', ja: 'オーストリア' },
  SE: { en: 'Sweden', ja: 'スウェーデン' },
};
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
  issue?: { slug: string; cover: string; month?: string }; // 公開ずみの号
  upcoming: boolean; // 号がまだ無い（これから行く街）
};
export type PlaceCountry = { code: string; name: { en: string; ja: string }; cities: PlaceCity[] };

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
      issue: live && i ? { slug: i.slug, cover: assetUrl(i, 'cover.jpg'), month: i.month } : undefined,
      upcoming: !live,
    };
    m.set(code, [...(m.get(code) ?? []), city]);
  }
  const codes = [...m.keys()].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
  return codes.map((code) => ({
    code,
    name: COUNTRY_NAMES[code] ?? { en: code, ja: code },
    // 国の中は北から
    cities: m.get(code)!.sort((a, b) => b.lat - a.lat),
  }));
}

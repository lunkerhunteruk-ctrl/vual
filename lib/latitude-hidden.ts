// 2026-11-14 穴場（hidden spots）。地元では有名でも、外国から来た人には見つけにくい1か所（例 北九州の河内藤園）。
// ユーザーの決定（vault の memory latitude-publishing-and-site.md）：
//  - Google マップのレビュー500件以上・星4.0以上の所だけ（穴場すぎて、着いてがっかり、を避ける。数は選ぶ時だけに使い、ページには出さない）。
//  - 町の案内（店8軒以上）に吸収しない。「場所から探す」の日本の地図に、町とは色の違う点で出す。
//  - 訪ねる月を選ぶと、その月のおすすめ度（monthScore 0〜5）で点が大きく・濃くなる。0 の月（行けない月）は消える。
//  - 穴場ごとに1日のおすすめコース（着く → 穴場がいちばん良い時間 → 近くのごはん → 温泉があれば → 帰る）と、動く地図。
//  - 月ごとのページ（/latitude/places/japan/may など）。
// データは lib/latitude-hidden/spots.json（vault の /tmp/claude-501/hidden-spots/build_site.py で作る。2026年の営業は公式のページの文で確かめた所だけ）。
// 画面側（地図）からも読むので、軽い形（HiddenDot）も出す。

import spotsJson from './latitude-hidden/spots.json';
import { latAsset } from './latitude-assets';
import type { RouteWalk } from './latitude-routes/format';

export type HiddenStop = {
  role: 'arrive' | 'stop' | 'spot' | 'meal' | 'onsen' | 'cafe' | 'leave';
  name: string;
  nameEn: string;
  coords: [number, number];
  time: string;
  what: string;
  whatEn: string;
  url?: string;
  move?: { mode: string; min: number; note: string; noteEn: string }; // 次の地点への移り方
  photo?: string; // 2026-11-14 公式サイトのシェア用の写真（og:image）の住所。写真と確かめた物だけ。保存しない
  photoCredit?: { author: string; license: string; licenseUrl: string; page: string }; // 写真がウィキメディア・コモンズの時（駅など）。作者と条件
};

export type HiddenSpot = {
  slug: string;
  name: string;
  nameEn: string;
  prefecture: string;
  prefectureJa: string;
  region: string; // lib/latitude-regions.ts の地方の key
  town: string; // 起点の町（英字）
  townJa: string;
  townSlug?: string; // 町の案内がある時だけ
  kind: string;
  coords: [number, number];
  what: string;
  whatEn: string;
  seasonal: boolean;
  peakMonths: number[];
  openMonths: number[];
  monthScore: number[]; // 1〜12月の0〜5（0＝行けない月）
  monthNote: Record<string, { en: string; ja: string }>;
  peakNote: string;
  peakNoteJa: string;
  ticket: string;
  ticketJa: string;
  url: string; // 運営する所の公式
  verifiedAt: string;
  banner?: { file: string; author: string; license: string; licenseUrl: string; page: string; y?: number };
  course?: { titleJa: string; titleEn: string; carFree: boolean; noteJa: string; noteEn: string; stops: HiddenStop[] };
  nearby: { name: string; nameEn: string; kind: string; what: string; whatEn: string; coords: [number, number]; url: string }[];
  baseMap?: boolean; // public/latitude/citymaps/spot-<slug>.json がある時
  walk?: RouteWalk; // コースの道の線（歩く区間は歩行者ルート、ほかは車のルート。FOSSGIS OSRM で一度だけ計算）
};

export const HIDDEN: HiddenSpot[] = spotsJson as unknown as HiddenSpot[];
export const getHidden = (slug: string) => HIDDEN.find((s) => s.slug === slug);

export const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'] as const;
export const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthOf = (slug: string) => (MONTHS as readonly string[]).indexOf(slug) + 1; // 0＝月ではない
export const monthLabel = (m: number, ja: boolean) => (ja ? `${m}月` : MONTH_EN[m - 1]);

// 地図の点（画面側に渡す軽い形）
export type HiddenDot = {
  slug: string; name: string; nameEn: string; prefectureJa: string; prefecture: string; region: string;
  lat: number; lon: number; score: number[]; note: Record<string, { en: string; ja: string }>;
  peakNote: string; peakNoteJa: string; banner?: string; bannerY?: number; seasonal: boolean;
};
export const hiddenDots = (): HiddenDot[] => HIDDEN.map((s) => ({
  slug: s.slug, name: s.name, nameEn: s.nameEn, prefectureJa: s.prefectureJa, prefecture: s.prefecture, region: s.region,
  lat: s.coords[0], lon: s.coords[1], score: s.monthScore, note: s.monthNote, peakNote: s.peakNote, peakNoteJa: s.peakNoteJa,
  banner: s.banner ? latAsset(`hidden/${s.slug}/${s.banner.file}`) : undefined, bannerY: s.banner?.y, seasonal: s.seasonal,
}));

// その月のおすすめ順（点の高い順 → 季節の所を先に → 北から）
export function forMonth(m: number) {
  return HIDDEN.filter((s) => s.monthScore[m - 1] >= 4)
    .sort((a, b) => b.monthScore[m - 1] - a.monthScore[m - 1] || Number(b.seasonal) - Number(a.seasonal) || b.coords[0] - a.coords[0]);
}

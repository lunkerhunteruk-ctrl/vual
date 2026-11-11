import type { RouteWalk } from './format';
import kanazawa from './kanazawa.json';
import morioka from './morioka.json';

// 2026-11-11 街のページ「凛の1日の道」の、歩く道の線（scripts/latitude-route.py が OpenStreetMap の歩行者ルートで一度だけ計算した物）。
// 地点（stops）が lib/latitude-places.ts の route の coords と同じ時だけ使う（地点を直したら、台本を回し直す）
const WALKS: Record<string, RouteWalk & { stops: number[][]; source: string; computed: string }> = {
  kanazawa: kanazawa as unknown as RouteWalk & { stops: number[][]; source: string; computed: string },
  morioka: morioka as unknown as RouteWalk & { stops: number[][]; source: string; computed: string },
};

export function getWalk(slug: string, stops: [number, number][]) {
  const w = WALKS[slug];
  if (!w || w.stops.length !== stops.length) return null;
  const same = w.stops.every(([a, b], k) => Math.abs(a - stops[k][0]) < 1e-5 && Math.abs(b - stops[k][1]) < 1e-5);
  return same ? w : null;
}

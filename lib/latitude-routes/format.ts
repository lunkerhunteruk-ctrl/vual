// 2026-11-11 歩く道の線の型と、距離・歩く時間の書き方（サーバーと 'use client' の地図の両方から使う）

// 距離と歩く時間の書き方（1.1 km／約1時間25分）
export const km = (m: number) => `${(m / 1000).toFixed(1)} km`;
export const mins = (sec: number, ja: boolean) => {
  const m = Math.round(sec / 60 / 5) * 5, h = Math.floor(m / 60), r = m % 60;
  if (ja) return `約${h ? `${h}時間` : ''}${r ? `${r}分` : ''}`;
  return `about ${h ? `${h} hr ` : ''}${r ? `${r} min` : ''}`.trim();
};

// 歩く道の線（区間ごと。[緯度, 経度] の列。区間 k は地点 k → k+1）。distance はメートル
export type RouteWalk = { distance: number; duration: number; legs: { distance: number; duration: number; line: [number, number][] }[] };

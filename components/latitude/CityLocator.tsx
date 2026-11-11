import { COUNTRY_SHAPES } from '@/lib/latitude-locator-shapes';

// 2026-11-11 ユーザー：外国の人が「その街がどこか」すぐ分かるように、国の形の小さな図に街の点1つと、短い一文。
// 地名は書かない（題字が街の名前なので）。国の輪郭は国コードで選ぶ（lib/latitude-locator-shapes.ts。足すのは scripts/latitude-locator.py）。
// 色は紙の地図の描き方（陸は薄い砂色・ふちは道の灰）、点は動く地図の点線と同じ暗い赤（号の色は砂色の上で見えなかった）。

const LAND = '#e3ddd1';
const EDGE = '#aca8a0';
const PAPER = '#f2eee7';
const RED = '#7a241e'; // 号の動く地図の道すじの赤（vault routemap/reel_overlays2.py の RED）

export function CityLocator({ country, at, dot = RED, text, label, className }: {
  country: string; // ISO 3166-1（例 'JP'）
  at: [number, number]; // [緯度, 経度]
  dot?: string;
  text: string;
  label: string; // 図の説明（読み上げ用）
  className?: string;
}) {
  const s = COUNTRY_SHAPES[country];
  if (!s) return null;
  const x = (at[1] - s.west) * s.kx;
  const y = (s.north - at[0]) * s.ky;
  return (
    <div className={`flex items-center gap-5 ${className ?? ''}`}>
      <svg viewBox={`-2 -2 ${s.w + 4} ${s.h + 4}`} className="w-[120px] shrink-0 md:w-[150px]" role="img" aria-label={label}>
        <path d={s.d} fill={LAND} stroke={EDGE} strokeWidth={0.6} strokeLinejoin="round" />
        <circle cx={x} cy={y} r={10.5} fill="none" stroke={dot} strokeWidth={0.8} opacity={0.6} />
        <circle cx={x} cy={y} r={5.4} fill={dot} stroke={PAPER} strokeWidth={1.2} />
      </svg>
      <p className="max-w-[16rem] text-[10px] uppercase leading-[1.9] tracking-[0.28em]">{text}</p>
    </div>
  );
}

import type { CSSProperties } from 'react';

// 2026-11-11 店の地図の印の形（地図の丸・種類のスイッチ・名前から選ぶ で同じ形）。
//  店 ＝ 種類の色の丸／凛の1日の地点 ＝ 黒いひし形／名所 ＝ 白抜きの四角／アート ＝ 白抜きの四角の中に小さな四角（額の形）
//  名所とアートは店ではなく「目印」なので、色でなく形で分ける。組んだ道に入ると、番号の入った形になる（店は色の丸、目印は黒い四角）
export type MarkKind = 'shop' | 'stop' | 'art' | 'sight';

const INK = '#1e1d1b';
const PAPER = '#f2eee7';

export function markStyle(kind: MarkKind, size: number, color: string, numbered = false, outer?: string): CSSProperties {
  const join = (inner?: string) => [inner, outer].filter(Boolean).join(', ') || undefined;
  const base: CSSProperties = { width: size, height: size };
  if (kind === 'shop') return { ...base, borderRadius: 999, background: color, boxShadow: join() };
  if (kind === 'stop') {
    if (numbered) return { ...base, borderRadius: 999, background: INK, boxShadow: join() };
    return { ...base, borderRadius: 1, background: INK, transform: 'rotate(45deg)', boxShadow: join() };
  }
  if (numbered) return { ...base, borderRadius: 2, background: INK, boxShadow: join() };
  const r = Math.max(1.2, size * 0.13);
  if (kind === 'sight') return { ...base, borderRadius: 1, background: PAPER, boxShadow: join(`inset 0 0 0 ${r}px ${INK}`) };
  return { ...base, borderRadius: 1, background: PAPER, boxShadow: join(`inset 0 0 0 ${r}px ${INK}, inset 0 0 0 ${r * 2}px ${PAPER}, inset 0 0 0 ${r * 3}px ${INK}`) };
}

export const isSightKind = (k: string): k is 'art' | 'sight' => k === 'art' || k === 'sight';

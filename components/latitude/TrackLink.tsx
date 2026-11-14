'use client';
import { track } from '@/lib/latitude-track';
import { ACTION, ACTION_MAIN, INK } from '@/lib/latitude-theme';

// 店の「公式サイト」「地図」のリンク。押された店と種類を記録する（のちに店へ連絡する時の材料）
// 2026-11-14 押せる高さを 44px に（ACTION）。main：いちばん押すもの（Google マップ）は枠つき
export default function TrackLink({ href, label, shop, kind, person, main = false }: { href: string; label: string; shop: string; kind: 'site' | 'map'; person: string; main?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => track('link', { shop, kind, person })}
      className={main ? ACTION_MAIN : ACTION} style={main ? { color: INK, borderColor: INK } : { color: INK }}>
      {label}
    </a>
  );
}

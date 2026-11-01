'use client';
import { track } from '@/lib/latitude-track';

// 店の「公式サイト」「地図」のリンク。押された店と種類を記録する（のちに店へ連絡する時の材料）
export default function TrackLink({ href, label, shop, kind, person }: { href: string; label: string; shop: string; kind: 'site' | 'map'; person: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => track('link', { shop, kind, person })}
      className="underline-offset-4 hover:underline" style={{ color: '#1e1d1b' }}>
      {label}
    </a>
  );
}

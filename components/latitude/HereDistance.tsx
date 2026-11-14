'use client';
import { useSyncExternalStore } from 'react';
import { INK } from '@/lib/latitude-theme';
import { hereLabel, hereServerSnapshot, hereSnapshot, metersBetween, subscribeHere } from '@/lib/latitude-here';

// 2026-11-14 ③-1 店のカードの「ここから約350m」。「現在地」を押して位置が取れた時だけ出る（それまでは何も描かない＝サーバーの HTML も形も変わらない）。
// まっすぐの距離で「約」。位置はこの画面の中だけ（lib/latitude-here.ts）

export const useHere = () => useSyncExternalStore(subscribeHere, hereSnapshot, hereServerSnapshot);

export default function HereDistance({ city, lat, lon, ja, className = 'mt-2' }: { city: string; lat: number; lon: number; ja: boolean; className?: string }) {
  const h = useHere();
  if (h.status !== 'on' || h.city !== city) return null;
  return <p className={`${className} text-[13px] leading-snug tabular-nums`} style={{ color: INK }}>{hereLabel(metersBetween(h, { lat, lon }), ja)}</p>;
}

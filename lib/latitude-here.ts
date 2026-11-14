// 2026-11-14 ③-1 現在地（街のページの地図の「現在地」を押した時だけ聞く。ページを開いただけでは聞かない）。
// 位置はこの画面の中（このファイルの変数）だけに持つ。localStorage にも入れず、サーバーにも送らない。地図が画面から消えたら忘れる（forgetHere）。
// その街から 20km 以上離れている時は位置を持たず「この街の近くにいるときに使えます」。取れない・断られた・対応していない時は「使えませんでした」。
// 地図（CityShopMap）・店のカードの距離（HereDistance）・近い順の一覧が、同じ状態を useSyncExternalStore で読む。このファイルは 'use client' を付けない

export type HereState =
  | { status: 'idle' }
  | { status: 'asking'; city: string }
  | { status: 'on'; city: string; lat: number; lon: number }
  | { status: 'far'; city: string }
  | { status: 'error'; city: string };

const IDLE: HereState = { status: 'idle' };
let state: HereState = IDLE;
const subs = new Set<() => void>();
const set = (s: HereState) => { state = s; subs.forEach((f) => f()); };

export const hereSnapshot = () => state;
export const hereServerSnapshot = () => IDLE;
export function subscribeHere(cb: () => void) { subs.add(cb); return () => { subs.delete(cb); }; }

export const FAR_KM = 20;

// 2点の間のまっすぐの距離（メートル）。道の距離は計算しない
export function metersBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// 「ここから約350m」「ここから約1.2km」（1km 未満は 50m 刻み、1km 以上は 0.1km 刻み）
export function hereLabel(m: number, ja: boolean) {
  const r50 = Math.max(50, Math.round(m / 50) * 50);
  if (r50 < 1000) return ja ? `ここから約${r50}m` : `About ${r50} m from you`;
  const km = (Math.round(m / 100) / 10).toFixed(1);
  return ja ? `ここから約${km}km` : `About ${km} km from you`;
}

// 押した時だけ位置を聞く。center：その街のまん中（20km の判定に使う）
export function askHere(city: string, center: { lat: number; lon: number }) {
  if (typeof window === 'undefined') return;
  if (!window.isSecureContext || !navigator.geolocation) { set({ status: 'error', city }); return; }
  set({ status: 'asking', city });
  navigator.geolocation.getCurrentPosition(
    (p) => {
      if (state.status !== 'asking' || state.city !== city) return; // 待つ間に消した・ほかの街へ移った
      const here = { lat: p.coords.latitude, lon: p.coords.longitude };
      if (metersBetween(here, center) > FAR_KM * 1000) set({ status: 'far', city });
      else set({ status: 'on', city, ...here });
    },
    () => { if (state.status === 'asking' && state.city === city) set({ status: 'error', city }); },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }, // 歩いて回るので、古い位置は使わない
  );
}

export const forgetHere = () => { if (state.status !== 'idle') set(IDLE); };

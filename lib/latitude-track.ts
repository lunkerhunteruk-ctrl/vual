// 2026-10-30 街のページと旅人の会話の記録を送る（/api/latitude/track）。ページを離れる時も届くように sendBeacon。
// Google アナリティクスにも同じ名前で送る（あれば）。会話の中身は送らない。
export type TrackEvent = 'ask_open' | 'ask_shop' | 'msg' | 'link';

export function track(e: TrackEvent, data: { person?: string; page?: string; shop?: string; kind?: string; mode?: string } = {}) {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({ e, page: location.pathname, ...data });
  try {
    if (!navigator.sendBeacon?.('/api/latitude/track', new Blob([body], { type: 'application/json' })))
      fetch('/api/latitude/track', { method: 'POST', body, keepalive: true }).catch(() => {});
  } catch { /* 記録できなくても画面は止めない */ }
  const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  g?.('event', `latitude_${e}`, { person: data.person, shop: data.shop, link_kind: data.kind, mode: data.mode });
}

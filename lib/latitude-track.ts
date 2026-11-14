// 2026-10-30 街のページと旅人の会話の記録を送る（/api/latitude/track）。ページを離れる時も届くように sendBeacon。
// Google アナリティクスにも同じ名前で送る（あれば）。会話の中身は送らない。
// 2026-11-14 ③ saved＝店を保存した／shared＝保存した一覧を共有した／locate＝「現在地」を押した（回数だけ。店の名前・位置は送らない）
export type TrackEvent = 'ask_open' | 'ask_shop' | 'msg' | 'link' | 'saved' | 'shared' | 'locate';

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

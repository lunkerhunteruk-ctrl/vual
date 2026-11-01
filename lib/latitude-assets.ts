// 2026-11-01 LATITUDE の写真・ページの動画の置き場（R2 の vual-media バケットの latitude/）。
// 号が増えても git に写真をためないため。上げるのは scripts/latitude-assets-upload.mjs（public/latitude と同じ並び）。
// NEXT_PUBLIC_LATITUDE_ASSETS で替えられる（例 '/latitude' にすると手元の public から読む。のちに img.vual.jp へ移す時もここだけ）
export const LAT_ASSETS = (process.env.NEXT_PUBLIC_LATITUDE_ASSETS || 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/latitude').replace(/\/$/, '');

// public/latitude の中の並びのまま渡す（例 'people/rin.jpg'）
export const latAsset = (p: string) => `${LAT_ASSETS}/${p.replace(/^\//, '')}`;

// 検索エンジン・SNS 向けの絶対アドレス（LAT_ASSETS が '/latitude' の時はサイトのアドレスを前に付ける）
export const latAssetAbs = (p: string, site = 'https://vual.jp') => {
  const u = latAsset(p);
  return u.startsWith('/') ? `${site}${u}` : u;
};

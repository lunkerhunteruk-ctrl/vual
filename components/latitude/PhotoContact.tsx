import { shopPhoto } from '@/components/latitude/CityPlaces';
import { TAP_INLINE } from '@/lib/latitude-theme';
import type { CityPlace, LatitudeCity } from '@/lib/latitude-places';

// 2026-11-14 ③-5 店の写真を出しているページの下の注意書きに足す、店からの連絡先の1文（オーナー確認の文言とアドレス）。
// 写真を1枚も出していないページには出さない。外す手順は scripts/latitude-photo-takedown.mjs、記録は docs/latitude-photo-takedowns.md。
// アドレスは mailto。押せる高さは 44px、行の高さは変えない（TAP_INLINE）。字はサーバーで描く
export const showsShopPhoto = (c: LatitudeCity, places: CityPlace[]) => places.some((x) => !!shopPhoto(c, x));

const MAIL = 'editor@vual.jp';

export function PhotoContact({ ja }: { ja: boolean }) {
  const a = <a href={`mailto:${MAIL}`} className={`${TAP_INLINE} underline underline-offset-4`} style={{ color: 'inherit' }}>{MAIL}</a>;
  return ja
    ? <>写真の掲載を止めたいお店の方は、{a} までご連絡ください。すぐに外します。</>
    : <> If you are the shop and would like a photo removed, write to {a} and we will take it down at once.</>;
}

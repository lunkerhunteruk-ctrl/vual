import { NextResponse } from 'next/server';
import { CATEGORY_LABEL, getCity, slugify } from '@/lib/latitude-places';
import { placeCountries } from '@/lib/latitude-places-index';
import type { SearchIndex } from '@/lib/latitude-search';

// 2026-11-14 ③-3 「場所から探す」の検索欄が読む、街と店の名前の一覧（lib/latitude-search.ts の SearchIndex）。
// ビルドの時に作る静的な JSON。入力欄に初めて触った時だけ読む（ページを開いただけでは読まない）。
// 街は「場所から探す」に並ぶ街だけ（公開前の号の街は出さない）。号の公開予約で街が増えるよう、一覧ページと同じく数分ごとに作り直す。
// 店は編集部の順（街の案内のカードと同じ順）。

export const dynamic = 'force-static';
export const revalidate = 300;

export function GET() {
  const labels: SearchIndex['labels'] = [];
  const at = new Map<string, number>();
  const label = (en: string, ja: string) => {
    const k = `${en}\u0000${ja}`;
    if (!at.has(k)) { at.set(k, labels.length); labels.push([en, ja]); }
    return at.get(k)!;
  };
  const towns: SearchIndex['towns'] = [];
  const shops: SearchIndex['shops'] = [];
  for (const country of placeCountries()) {
    for (const q of country.cities) {
      const c = getCity(q.slug);
      if (!c) continue;
      const t = towns.length;
      towns.push([c.slug, c.name, c.nameJa, c.country, c.countryJa]);
      for (const x of c.places) {
        // その街ならではの仕事の店は、種類の代わりに仕事の名前（金箔など。店の地図のカードと同じ）
        const ind = x.category === 'local' ? c.industries?.find((i) => i.key === x.industry) : undefined;
        const cat = ind ? label(ind.en, ind.ja) : label(CATEGORY_LABEL[x.category].en, CATEGORY_LABEL[x.category].ja);
        // カードの id は components/latitude/CityGuideExtras.tsx の placeAnchor と同じ形（place-<英語の店名の slug>）
        shops.push([t, x.name, x.nameEn === x.name ? '' : x.nameEn, cat, label(x.areaEn, x.area), `place-${slugify(x.nameEn)}`]);
      }
    }
  }
  const body: SearchIndex = { v: 1, labels, towns, shops };
  return NextResponse.json(body);
}

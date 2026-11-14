import { CATEGORY_LABEL, CITIES, placeAnchor, type CityPlace } from '@/lib/latitude-places';

// 2026-11-14 ③-2 保存した店の一覧に出す、店の id → 1行の中身（店名・日本語の店名・種類と地区・住所）。街ごと。
// 自分の一覧（ブラウザで描く）は /api/latitude/saved-index/<ja|en> から読み（どの店を保存したかは送らない。全部の一覧を取るだけ）、
// 共有されたリンクはサーバーでこれを使って描く
// 2026-11-15 facts：時間割（open）のある店だけ、その店の営業時間・休み・予約・現金のみ・時間割。cc：街の国（時間割の時刻をその町の時刻で見るため）
export type SavedRowData = { name: string; nameJa?: string; label: string; address: string; facts?: Pick<CityPlace, 'hours' | 'closed' | 'reserve' | 'cashOnly' | 'open'> };
export type SavedIndexData = Record<string, { name: string; cc?: string; rows: Record<string, SavedRowData> }>;

export function savedIndex(ja: boolean): SavedIndexData {
  const out: SavedIndexData = {};
  for (const c of CITIES) {
    const rows: Record<string, SavedRowData> = {};
    for (const x of c.places) {
      const ind = x.category === 'local' ? c.industries?.find((i) => i.key === x.industry) : undefined;
      const cat = ind ? (ja ? ind.ja : ind.en) : (ja ? CATEGORY_LABEL[x.category].ja : CATEGORY_LABEL[x.category].en);
      rows[placeAnchor(x)] = {
        name: ja ? x.name : x.nameEn,
        ...(!ja && x.name !== x.nameEn ? { nameJa: x.name } : {}),
        label: `${cat}  ·  ${ja ? x.area : x.areaEn}`,
        address: x.address,
        // 時間割（open）のある店だけ（無い店の行は前と同じ。手で書いた営業時間の字だけの店にも、ここでは足さない）
        ...(x.open ? { facts: { hours: x.hours, closed: x.closed, reserve: x.reserve, cashOnly: x.cashOnly, open: x.open } } : {}),
      };
    }
    out[c.slug] = { name: ja ? c.nameJa : c.name, ...(c.countryCode ? { cc: c.countryCode } : {}), rows };
  }
  return out;
}

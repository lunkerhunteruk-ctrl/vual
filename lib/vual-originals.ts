// VUAL オリジナルの一覧（スタイリスト用ページ /stylist で使う）。2026-11-02
// 中身は R2 の originals/index.json（scripts/vual-originals-publish.mjs が VAULT のカタログから書く）。服を足してもデプロイはいらない。
export const ORIGINALS_BASE =
  process.env.NEXT_PUBLIC_ORIGINALS_BASE || 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/originals';

export type OriginalGroup = 'outer' | 'tops' | 'cardigan' | 'dress' | 'bottoms' | 'shoes' | 'bag' | 'accessory';

export interface OriginalItem {
  id: string;
  name: string;
  category: string;
  group: OriginalGroup;
  color: string;
  family: string;
  card: string;
  large: string;
}

export const GROUP_ORDER: OriginalGroup[] = ['outer', 'tops', 'cardigan', 'dress', 'bottoms', 'shoes', 'bag', 'accessory'];

export const GROUP_LABEL: Record<OriginalGroup, { ja: string; en: string }> = {
  outer: { ja: 'アウター', en: 'Outerwear' },
  tops: { ja: 'トップス', en: 'Tops' },
  cardigan: { ja: 'カーディガン', en: 'Cardigans' },
  dress: { ja: 'ワンピース', en: 'Dresses' },
  bottoms: { ja: 'ボトム', en: 'Trousers & skirts' },
  shoes: { ja: '靴', en: 'Shoes' },
  bag: { ja: 'バッグ', en: 'Bags' },
  accessory: { ja: '小物', en: 'Accessories' },
};

export const originalImage = (rel: string) => `${ORIGINALS_BASE}/${rel}`;

// サーバー側で一覧を読む（送られてきた番号が本当にある服かを確かめる時に使う）
export async function fetchOriginals(): Promise<OriginalItem[]> {
  const res = await fetch(`${ORIGINALS_BASE}/index.json`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error('VUAL オリジナルの一覧を読めませんでした');
  const data = (await res.json()) as { items: OriginalItem[] };
  return data.items;
}

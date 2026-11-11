// 2026-11-11 試作：「場所から探す」の地図で、町が40〜50に増えても見やすいように、国の中を地方にまとめる（いまは日本だけ）。
// 国の段階：地方ごとの数字の丸（例「九州 8」）。号のある町だけは写真の丸＋名前のまま。
// 地方の段階：数字の丸を押すと、その地方へ寄って、町が小さな点と名前で全部出る（components/latitude/PlacesMap.tsx）。
// 町の地方は県から決める（LatitudeCity の countryJa が日本の町では県名。lib/latitude-places-index.ts）。
// 画面側（client）からも読むので、町のデータ（lib/latitude-places.ts）とは別の小さなファイルにしてある。

export type PlaceRegion = {
  key: string;
  en: string;
  ja: string;
  // 寄った時に見せる範囲（西・南・東・北の経度・緯度）。町がはみ出す時は、町も入るように広げる
  box: [number, number, number, number];
  // 国の段階の数字の丸を置く所（緯度・経度）。近い丸どうし・号の町の丸とは、画面の上で押し合わせて重ならないようにする
  at: [number, number];
  // 地図の小さな枠（日本の沖縄）に入れて描く地方
  inset?: boolean;
};

// 並びは北から（スマホの地図の下の一覧もこの順）
export const REGIONS: Record<string, PlaceRegion[]> = {
  JP: [
    { key: 'hokkaido', en: 'Hokkaido', ja: '北海道', box: [139.3, 41.3, 145.9, 45.6], at: [43.4, 142.8] },
    { key: 'tohoku', en: 'Tohoku', ja: '東北', box: [139.2, 36.9, 142.1, 41.6], at: [38.7, 140.5] },
    { key: 'kanto', en: 'Kanto', ja: '関東', box: [138.4, 34.9, 140.9, 37.1], at: [35.9, 140.3] },
    { key: 'chubu', en: 'Chubu', ja: '中部', box: [135.9, 34.5, 139.9, 38.5], at: [35.9, 137.9] },
    { key: 'kinki', en: 'Kinki', ja: '近畿', box: [134.3, 33.4, 136.9, 35.8], at: [34.6, 135.7] },
    { key: 'chugoku', en: 'Chugoku', ja: '中国', box: [130.9, 33.9, 134.5, 35.7], at: [35.0, 132.9] },
    { key: 'shikoku', en: 'Shikoku', ja: '四国', box: [132.0, 32.7, 134.8, 34.5], at: [33.6, 133.5] },
    { key: 'kyushu', en: 'Kyushu', ja: '九州', box: [129.4, 30.9, 132.1, 34.0], at: [32.6, 130.8] },
    { key: 'okinawa', en: 'Okinawa', ja: '沖縄', box: [122.8, 24.0, 131.4, 28.8], at: [26.4, 127.8], inset: true },
  ],
};

const PREF: Record<string, string[]> = {
  hokkaido: ['北海道'],
  tohoku: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
  kanto: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
  chubu: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'],
  kinki: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
  chugoku: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'],
  shikoku: ['徳島県', '香川県', '愛媛県', '高知県'],
  kyushu: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県'],
  okinawa: ['沖縄県'],
};
const PREF_REGION: Record<string, string> = Object.fromEntries(Object.entries(PREF).flatMap(([k, ps]) => ps.map((p) => [p, k])));

// 町の地方：県名（日本語）から。県名が無い・分からない時は、いちばん近い数字の丸の地方（境目の町は間違えるので、県名を入れる）
export function regionOf(code: string, prefectureJa: string | undefined, lat: number, lon: number): string | undefined {
  const rs = REGIONS[code];
  if (!rs) return undefined;
  const byPref = prefectureJa ? PREF_REGION[prefectureJa.trim()] : undefined;
  if (byPref) return byPref;
  let best: string | undefined, bd = Infinity;
  for (const r of rs) {
    const d = Math.hypot(r.at[0] - lat, (r.at[1] - lon) * Math.cos((lat * Math.PI) / 180));
    if (d < bd) { bd = d; best = r.key; }
  }
  return best;
}

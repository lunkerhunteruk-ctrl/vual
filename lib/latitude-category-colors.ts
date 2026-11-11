// 2026-11-11 店の種類ごとの色（店の地図の丸・一覧の見出しの点）。紙の上で見分けられる、くすんだ色。
// 画面側（client）からも読むので、店のデータ（lib/latitude-places.ts）とは別の小さなファイルにしてある
export const CATEGORY_COLOR: Record<string, string> = {
  local: '#a47e2c', // この街の仕事
  matcha: '#5d7547', // 抹茶
  sweets: '#b4616e', // 甘味
  food: '#8f3a2c', // ごはん
  coffee: '#5b4030', // コーヒー
  craft: '#3f5d78', // 器
};

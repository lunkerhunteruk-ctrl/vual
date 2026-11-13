// 2026-11-11 店の種類ごとの色（店の地図の丸・一覧の見出しの点）。紙の上で見分けられる、くすんだ色。
// 画面側（client）からも読むので、店のデータ（lib/latitude-places.ts）とは別の小さなファイルにしてある
// 2026-11-11 ユーザー確認：種類は5つ（前の 抹茶・コーヒー → 喫茶、器 → 工芸）
export const CATEGORY_COLOR: Record<string, string> = {
  local: '#a47e2c', // この街の仕事
  craft: '#3f5d78', // 工芸
  wear: '#5f6b4a', // 服と布（2026-11-13・くすんだ苔の緑）
  sweets: '#b4616e', // 甘味
  food: '#8f3a2c', // ごはん
  cafe: '#5b4030', // 喫茶
};

// 見る所（アート・名所）は色でなく形で分ける：白抜きの四角（名所）と、中に小さな四角のある額の形（アート）
export const SIGHT_KINDS = ['art', 'sight'] as const;

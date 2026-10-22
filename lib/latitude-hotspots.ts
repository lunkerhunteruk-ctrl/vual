// LATITUDE の仕掛け（2026-10-22 ユーザー指定）：拡大写真の目印を押すと、写真に写っていない物が線で描かれ、一言が出る。
// 座標はページの画像（1080×1440）の上。paths は順番に描く線（dur 秒・gap は線と線の間の秒）。14枚目は上空写真の橋脚の位置から、9枚目は右の柱に沿って計算して作った。
export type Hotspot = { x: number; y: number; color: string; width: number; gap: number; paths: { d: string; dur: number }[]; note: { x: number; y: number; color: string; text: string } };
// 2026-10-22 ロンドン9・14の仕掛けは、見開きに組み直して絵の位置が変わったので外した（ユーザー評価でも捨てる側）
export const HOTSPOTS: Record<string, Record<number, Hotspot>> = {};

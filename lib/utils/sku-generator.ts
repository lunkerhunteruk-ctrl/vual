/**
 * SKU auto-generation utility
 *
 * Format: BRAND-CATEGORY-COLOR-SIZE-NNN
 * Example: TODS-BAGS-BLK-M-001
 */

import { parseCategoryPath } from '@/lib/data/categories';

// Common color name → 3-letter abbreviation map
// Covers Japanese and English color names
const COLOR_ABBR: Record<string, string> = {
  // Japanese colors
  'ブラック': 'BLK',
  '黒': 'BLK',
  'ホワイト': 'WHT',
  '白': 'WHT',
  'レッド': 'RED',
  '赤': 'RED',
  'ブルー': 'BLU',
  '青': 'BLU',
  'ネイビー': 'NVY',
  '紺': 'NVY',
  'グリーン': 'GRN',
  '緑': 'GRN',
  'イエロー': 'YLW',
  '黄': 'YLW',
  'オレンジ': 'ORG',
  'パープル': 'PPL',
  '紫': 'PPL',
  'ピンク': 'PNK',
  'グレー': 'GRY',
  'グレイ': 'GRY',
  'ブラウン': 'BRN',
  '茶': 'BRN',
  'ベージュ': 'BGE',
  'アイボリー': 'IVR',
  'カーキ': 'KHK',
  'ボルドー': 'BRD',
  'ワイン': 'WIN',
  'キャメル': 'CML',
  'シルバー': 'SLV',
  'ゴールド': 'GLD',
  'マルチ': 'MLT',
  'クリーム': 'CRM',
  'カラシ': 'MST',
  'マスタード': 'MST',
  'ライトブルー': 'LBL',
  '水色': 'LBL',
  'ラベンダー': 'LVD',
  'オリーブ': 'OLV',
  'ターコイズ': 'TRQ',
  'コーラル': 'CRL',
  'サーモン': 'SMN',
  'モカ': 'MOC',
  'チャコール': 'CHR',
  'デニム': 'DNM',
  'インディゴ': 'IDG',
  // English colors
  'black': 'BLK',
  'white': 'WHT',
  'red': 'RED',
  'blue': 'BLU',
  'navy': 'NVY',
  'green': 'GRN',
  'yellow': 'YLW',
  'orange': 'ORG',
  'purple': 'PPL',
  'pink': 'PNK',
  'grey': 'GRY',
  'gray': 'GRY',
  'brown': 'BRN',
  'beige': 'BGE',
  'ivory': 'IVR',
  'khaki': 'KHK',
  'bordeaux': 'BRD',
  'wine': 'WIN',
  'camel': 'CML',
  'silver': 'SLV',
  'gold': 'GLD',
  'multi': 'MLT',
  'cream': 'CRM',
  'mustard': 'MST',
  'light blue': 'LBL',
  'lavender': 'LVD',
  'olive': 'OLV',
  'turquoise': 'TRQ',
  'coral': 'CRL',
  'charcoal': 'CHR',
  'denim': 'DNM',
  'indigo': 'IDG',
};

/**
 * Get 3-letter color abbreviation from color name (Japanese or English).
 * Falls back to first 3 uppercase ASCII chars, or 'COL' if non-ASCII only.
 */
export function colorToAbbr(color: string): string {
  const trimmed = color.trim();
  const mapped = COLOR_ABBR[trimmed] || COLOR_ABBR[trimmed.toLowerCase()];
  if (mapped) return mapped;

  // Fallback: take first 3 uppercase ASCII letters
  const ascii = trimmed.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return ascii.slice(0, 3) || 'COL';
}

/**
 * Extract short category code from category path.
 * e.g. "womens-goods-bags" → "BAGS", "mens-wear-tops" → "TOPS"
 */
export function categoryToCode(categoryPath: string): string {
  const parsed = parseCategoryPath(categoryPath);
  if (parsed) {
    return parsed.category.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'ITEM';
  }
  return categoryPath.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'ITEM';
}

/**
 * Normalize size string for SKU.
 * e.g. "Free Size" → "FREE", "M" → "M", "38" → "38"
 */
function sizeToCode(size: string): string {
  const s = size.trim().toUpperCase().replace(/\s+/g, '');
  // Common Japanese size labels
  if (s === 'フリー' || s === 'フリーサイズ' || s === 'FREE' || s === 'FREESIZE') return 'FREE';
  return s.slice(0, 4);
}

/**
 * Generate a brand prefix from brand slug.
 * e.g. "tods" → "TODS", "louis-vuitton" → "LV" (takes initials if multi-word)
 */
export function brandToPrefix(brandSlug: string): string {
  if (!brandSlug) return '';
  const parts = brandSlug.split('-').filter(Boolean);
  if (parts.length === 1) {
    return parts[0].toUpperCase().slice(0, 4);
  }
  // Multi-word: take initials (max 4)
  return parts.map(p => p[0]).join('').toUpperCase().slice(0, 4);
}

export interface SkuGenerateParams {
  brandSlug: string;
  category: string;
  color: string | null;
  size: string | null;
  index: number; // 0-based variant index for sequence number
}

/**
 * Generate a SKU string.
 * Format: BRAND-CATEGORY-COLOR-SIZE-NNN
 */
export function generateSku(params: SkuGenerateParams): string {
  const { brandSlug, category, color, size, index } = params;

  const parts: string[] = [];

  const brand = brandToPrefix(brandSlug);
  if (brand) parts.push(brand);

  const cat = categoryToCode(category);
  if (cat) parts.push(cat);

  if (color) parts.push(colorToAbbr(color));
  if (size) parts.push(sizeToCode(size));

  // Sequence number (1-based, zero-padded to 3 digits)
  parts.push(String(index + 1).padStart(3, '0'));

  return parts.join('-');
}

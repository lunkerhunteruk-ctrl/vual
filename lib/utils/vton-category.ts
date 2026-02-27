import { parseCategoryPath } from '@/lib/data/categories';

export type VTONCategory = 'upper_body' | 'lower_body' | 'dresses' | 'footwear' | 'bags';

// Product sub-category → VTON category mapping
const CATEGORY_MAP: Record<string, VTONCategory> = {
  tops: 'upper_body',
  outer: 'upper_body',
  pants: 'lower_body',
  skirts: 'lower_body',
  dresses: 'dresses',
  setup: 'upper_body', // セットアップはupper_bodyとして扱う
  shoes: 'footwear',
  bags: 'bags',
};

// Reverse mapping: VTON slot → product sub-categories
const SLOT_TO_CATEGORIES: Record<VTONCategory, string[]> = {
  upper_body: ['tops', 'outer'],
  lower_body: ['pants', 'skirts'],
  dresses: ['dresses'],
  footwear: ['shoes'],
  bags: ['bags'],
};

export interface VTONSlotInfo {
  id: VTONCategory;
  labelJa: string;
  labelEn: string;
}

export const VTON_SLOTS: VTONSlotInfo[] = [
  { id: 'upper_body', labelJa: 'トップス', labelEn: 'Tops' },
  { id: 'lower_body', labelJa: 'ボトムス', labelEn: 'Bottoms' },
  { id: 'footwear', labelJa: 'シューズ', labelEn: 'Shoes' },
  { id: 'bags', labelJa: 'バッグ', labelEn: 'Bags' },
];

/**
 * Map a product category path (e.g. "mens-wear-tops") to a VTON category.
 * Returns null if the product is not try-on compatible.
 */
export function mapToVtonCategory(productCategory: string): VTONCategory | null {
  const parsed = parseCategoryPath(productCategory);
  if (!parsed) return null;
  return CATEGORY_MAP[parsed.category] || null;
}

/**
 * Get the product sub-categories that belong to a VTON slot.
 * Used for filtering store products when building an outfit.
 */
export function getProductCategoriesForSlot(slot: VTONCategory): string[] {
  return SLOT_TO_CATEGORIES[slot] || [];
}

/**
 * Check if a product category string contains one of the given sub-categories.
 * e.g. matchesSubCategories("mens-wear-tops", ["tops", "outer"]) → true
 */
export function matchesSubCategories(productCategory: string, subCategories: string[]): boolean {
  const parsed = parseCategoryPath(productCategory);
  if (!parsed) return false;
  return subCategories.includes(parsed.category);
}

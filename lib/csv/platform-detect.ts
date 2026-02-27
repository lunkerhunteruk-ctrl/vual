/**
 * Platform detection and column mapping configuration
 * for CSV product import from Shopify, BASE, STORES.jp
 */

export type PlatformType = 'shopify' | 'base' | 'stores_jp' | 'unknown';

// VUAL target field keys
export type VualField =
  | 'name'
  | 'nameEn'
  | 'description'
  | 'category'
  | 'price'
  | 'compareAtPrice'
  | 'sku'
  | 'color'
  | 'size'
  | 'stock'
  | 'imageUrl'
  | 'tags'
  | 'status'
  | 'brand'
  | 'materials'
  | 'care'
  | '_skip'; // Special: ignore this column

export const VUAL_FIELD_OPTIONS: { value: VualField; labelKey: string }[] = [
  { value: '_skip', labelKey: 'csvImport.unmapped' },
  { value: 'name', labelKey: 'csvImport.fields.name' },
  { value: 'nameEn', labelKey: 'csvImport.fields.nameEn' },
  { value: 'description', labelKey: 'csvImport.fields.description' },
  { value: 'category', labelKey: 'csvImport.fields.category' },
  { value: 'price', labelKey: 'csvImport.fields.price' },
  { value: 'compareAtPrice', labelKey: 'csvImport.fields.compareAtPrice' },
  { value: 'sku', labelKey: 'csvImport.fields.sku' },
  { value: 'color', labelKey: 'csvImport.fields.color' },
  { value: 'size', labelKey: 'csvImport.fields.size' },
  { value: 'stock', labelKey: 'csvImport.fields.stock' },
  { value: 'imageUrl', labelKey: 'csvImport.fields.imageUrl' },
  { value: 'tags', labelKey: 'csvImport.fields.tags' },
  { value: 'status', labelKey: 'csvImport.fields.status' },
  { value: 'brand', labelKey: 'csvImport.fields.brand' },
  { value: 'materials', labelKey: 'csvImport.fields.materials' },
  { value: 'care', labelKey: 'csvImport.fields.care' },
];

export interface PlatformConfig {
  name: PlatformType;
  displayName: string;
  headerPatterns: string[]; // Unique headers that identify this platform
  variantGrouping: 'multi_row' | 'column_based' | 'none';
  groupByColumn?: string; // Column to group rows by (e.g., 'Handle' for Shopify)
  defaultFieldMap: Record<string, VualField>; // CSV header → VUAL field
}

const SHOPIFY_CONFIG: PlatformConfig = {
  name: 'shopify',
  displayName: 'Shopify',
  headerPatterns: ['Handle', 'Title', 'Body (HTML)', 'Vendor', 'Variant SKU', 'Variant Price', 'Variant Inventory Qty', 'Option1 Name', 'Option1 Value', 'Image Src'],
  variantGrouping: 'multi_row',
  groupByColumn: 'Handle',
  defaultFieldMap: {
    'Title': 'name',
    'Body (HTML)': 'description',
    'Vendor': 'brand',
    'Type': 'category',
    'Tags': 'tags',
    'Variant SKU': 'sku',
    'Variant Price': 'price',
    'Variant Compare At Price': 'compareAtPrice',
    'Variant Inventory Qty': 'stock',
    'Option1 Value': 'color',
    'Option2 Value': 'size',
    'Image Src': 'imageUrl',
    'Published': 'status',
  },
};

const BASE_CONFIG: PlatformConfig = {
  name: 'base',
  displayName: 'BASE',
  headerPatterns: ['商品名', '商品コード', '販売価格', '税率', '在庫数', '種類名', '種類在庫数', '公開状態', '商品説明'],
  variantGrouping: 'column_based',
  defaultFieldMap: {
    '商品名': 'name',
    '商品コード': 'sku',
    '販売価格': 'price',
    '在庫数': 'stock',
    '種類名': 'color', // May contain "color:size" — handled in transformer
    '商品説明': 'description',
    '画像URL': 'imageUrl',
    '公開状態': 'status',
  },
};

const STORES_JP_CONFIG: PlatformConfig = {
  name: 'stores_jp',
  displayName: 'STORES.jp',
  headerPatterns: ['アイテム名', 'アイテムコード', '販売価格', '割引価格', '公開/非公開', 'アイテム説明', 'バリエーション'],
  variantGrouping: 'column_based',
  defaultFieldMap: {
    'アイテム名': 'name',
    'アイテムコード': 'sku',
    '販売価格': 'price',
    '割引価格': 'compareAtPrice',
    '在庫数': 'stock',
    'アイテム説明': 'description',
    '公開/非公開': 'status',
  },
};

export const PLATFORM_CONFIGS: Record<PlatformType, PlatformConfig | null> = {
  shopify: SHOPIFY_CONFIG,
  base: BASE_CONFIG,
  stores_jp: STORES_JP_CONFIG,
  unknown: null,
};

/**
 * Detect platform from CSV headers by matching known header patterns.
 * Returns the platform with the highest match ratio.
 */
export function detectPlatform(headers: string[]): PlatformType {
  const headerSet = new Set(headers.map(h => h.trim()));

  let bestPlatform: PlatformType = 'unknown';
  let bestScore = 0;

  for (const config of [SHOPIFY_CONFIG, BASE_CONFIG, STORES_JP_CONFIG]) {
    const matchCount = config.headerPatterns.filter(p => headerSet.has(p)).length;
    const score = matchCount / config.headerPatterns.length;

    // Require at least 3 matching headers and > 30% match ratio
    if (matchCount >= 3 && score > bestScore) {
      bestScore = score;
      bestPlatform = config.name;
    }
  }

  return bestPlatform;
}

/**
 * Get default field mapping for a detected platform.
 * Returns a map from CSV header name → VualField.
 */
export function getDefaultFieldMap(platform: PlatformType, headers: string[]): Record<string, VualField> {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) {
    // Unknown platform: return empty map, user must manually map
    return {};
  }

  const result: Record<string, VualField> = {};
  for (const header of headers) {
    const trimmed = header.trim();
    if (config.defaultFieldMap[trimmed]) {
      result[trimmed] = config.defaultFieldMap[trimmed];
    }
  }

  return result;
}

/**
 * Get the group-by column for multi-row variant platforms (e.g., Shopify's "Handle").
 */
export function getGroupByColumn(platform: PlatformType): string | null {
  const config = PLATFORM_CONFIGS[platform];
  return config?.groupByColumn ?? null;
}

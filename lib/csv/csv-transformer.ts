/**
 * Transform parsed CSV rows into VUAL product format.
 * Handles variant grouping for different platforms.
 */

import { PlatformType, VualField, getGroupByColumn } from './platform-detect';

export interface VualProductImage {
  url: string;
  color: string | null;
}

export interface VualProductVariant {
  color: string | null;
  size: string | null;
  sku: string;
  stock: number;
  priceOverride: number | null;
}

export interface VualProduct {
  name: string;
  nameEn?: string;
  description?: string;
  category: string;
  price: number;
  currency: string;
  brandName?: string;
  tags?: string[];
  status: 'draft' | 'published';
  images: VualProductImage[];
  variants: VualProductVariant[];
}

export interface TransformError {
  row: number;
  field: string;
  message: string;
}

export interface TransformResult {
  products: VualProduct[];
  errors: TransformError[];
  warnings: TransformError[];
}

export interface TransformOptions {
  defaultCategory: string;
  defaultCurrency: string;
}

/**
 * Strip HTML tags and decode common HTML entities.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Parse price string to number.
 */
function parsePrice(value: string): number | null {
  if (!value) return null;
  // Remove currency symbols, commas, spaces
  const cleaned = value.replace(/[¥$€£,\s]/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) || num < 0 ? null : num;
}

/**
 * Parse stock string to number.
 */
function parseStock(value: string): number {
  if (!value) return 0;
  const num = parseInt(value.replace(/[,\s]/g, ''), 10);
  return isNaN(num) || num < 0 ? 0 : num;
}

/**
 * Parse status value from various platforms.
 */
function parseStatus(value: string): 'draft' | 'published' {
  const v = value.trim().toLowerCase();
  // Shopify: "true" = published
  if (v === 'true' || v === '1') return 'published';
  // BASE: "公開" = published
  if (v === '公開' || v === 'published') return 'published';
  // STORES: "公開" = published
  if (v.includes('公開')) return 'published';
  return 'draft';
}

/**
 * Get value from a row using field mapping.
 */
function getField(row: Record<string, string>, fieldMap: Record<string, VualField>, field: VualField): string {
  const entry = Object.entries(fieldMap).find(([, f]) => f === field);
  if (!entry) return '';
  return (row[entry[0]] || '').trim();
}

/**
 * Transform CSV rows into VUAL products.
 */
export function transformCSVToProducts(
  rows: Record<string, string>[],
  fieldMap: Record<string, VualField>,
  platform: PlatformType,
  options: TransformOptions,
): TransformResult {
  const groupByCol = getGroupByColumn(platform);

  if (groupByCol && platform === 'shopify') {
    return transformShopifyRows(rows, fieldMap, groupByCol, options);
  }

  return transformFlatRows(rows, fieldMap, platform, options);
}

/**
 * Transform Shopify multi-row format.
 * Consecutive rows with the same Handle value belong to the same product.
 */
function transformShopifyRows(
  rows: Record<string, string>[],
  fieldMap: Record<string, VualField>,
  groupByCol: string,
  options: TransformOptions,
): TransformResult {
  const products: VualProduct[] = [];
  const errors: TransformError[] = [];
  const warnings: TransformError[] = [];
  const seenSkus = new Set<string>();

  // Group rows by Handle
  const groups: Record<string, { rows: Record<string, string>[]; firstRowIdx: number }> = {};
  const groupOrder: string[] = [];

  rows.forEach((row, idx) => {
    const handle = row[groupByCol]?.trim();
    if (!handle) return;
    if (!groups[handle]) {
      groups[handle] = { rows: [], firstRowIdx: idx + 2 }; // +2 for 1-based + header row
      groupOrder.push(handle);
    }
    groups[handle].rows.push(row);
  });

  for (const handle of groupOrder) {
    const { rows: groupRows, firstRowIdx } = groups[handle];
    const firstRow = groupRows[0];

    // Product-level data from first row
    const name = getField(firstRow, fieldMap, 'name');
    if (!name) {
      errors.push({ row: firstRowIdx, field: 'name', message: '商品名が必須です' });
      continue;
    }

    const priceStr = getField(firstRow, fieldMap, 'price');
    const price = parsePrice(priceStr);
    if (price === null) {
      errors.push({ row: firstRowIdx, field: 'price', message: `価格が不正: ${priceStr}` });
      continue;
    }

    const description = getField(firstRow, fieldMap, 'description');
    const brandName = getField(firstRow, fieldMap, 'brand');
    const tags = getField(firstRow, fieldMap, 'tags');
    const statusStr = getField(firstRow, fieldMap, 'status');
    const category = getField(firstRow, fieldMap, 'category') || options.defaultCategory;

    const product: VualProduct = {
      name,
      description: description ? stripHtml(description) : undefined,
      category,
      price,
      currency: options.defaultCurrency,
      brandName: brandName || undefined,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      status: statusStr ? parseStatus(statusStr) : 'draft',
      images: [],
      variants: [],
    };

    // Process each row as a variant
    for (let i = 0; i < groupRows.length; i++) {
      const row = groupRows[i];
      const rowIdx = firstRowIdx + i;

      const imageUrl = getField(row, fieldMap, 'imageUrl');
      const color = getField(row, fieldMap, 'color') || null;
      const size = getField(row, fieldMap, 'size') || null;
      const variantPriceStr = getField(row, fieldMap, 'price');
      const variantPrice = parsePrice(variantPriceStr);
      let sku = getField(row, fieldMap, 'sku');
      const stock = parseStock(getField(row, fieldMap, 'stock'));

      // Add image if present and not duplicate
      if (imageUrl && !product.images.some(img => img.url === imageUrl)) {
        product.images.push({ url: imageUrl, color });
      }

      // Check if this is an image-only row (no variant data)
      const hasVariantData = color || size || sku || (i === 0);
      if (!hasVariantData && i > 0) continue;

      // Handle duplicate SKU
      if (sku && seenSkus.has(sku)) {
        let suffix = 2;
        while (seenSkus.has(`${sku}-${suffix}`)) suffix++;
        const newSku = `${sku}-${suffix}`;
        warnings.push({ row: rowIdx, field: 'sku', message: `重複SKU: ${sku} → ${newSku}` });
        sku = newSku;
      }
      if (sku) seenSkus.add(sku);

      const priceOverride = variantPrice !== null && variantPrice !== price ? variantPrice : null;

      product.variants.push({
        color,
        size,
        sku: sku || '',
        stock,
        priceOverride,
      });
    }

    // If no variants were created, add a default one
    if (product.variants.length === 0) {
      product.variants.push({
        color: null,
        size: null,
        sku: '',
        stock: 0,
        priceOverride: null,
      });
    }

    products.push(product);
  }

  return { products, errors, warnings };
}

/**
 * Transform flat (one row per product) format — for BASE, STORES.jp, and unknown.
 */
function transformFlatRows(
  rows: Record<string, string>[],
  fieldMap: Record<string, VualField>,
  _platform: PlatformType,
  options: TransformOptions,
): TransformResult {
  const products: VualProduct[] = [];
  const errors: TransformError[] = [];
  const warnings: TransformError[] = [];
  const seenSkus = new Set<string>();

  rows.forEach((row, idx) => {
    const rowIdx = idx + 2; // 1-based + header

    const name = getField(row, fieldMap, 'name');
    if (!name) {
      errors.push({ row: rowIdx, field: 'name', message: '商品名が必須です' });
      return;
    }

    const priceStr = getField(row, fieldMap, 'price');
    const price = parsePrice(priceStr);
    if (price === null) {
      errors.push({ row: rowIdx, field: 'price', message: `価格が不正: ${priceStr}` });
      return;
    }

    const description = getField(row, fieldMap, 'description');
    const brandName = getField(row, fieldMap, 'brand');
    const tags = getField(row, fieldMap, 'tags');
    const statusStr = getField(row, fieldMap, 'status');
    const category = getField(row, fieldMap, 'category') || options.defaultCategory;
    const imageUrl = getField(row, fieldMap, 'imageUrl');
    const color = getField(row, fieldMap, 'color') || null;
    const size = getField(row, fieldMap, 'size') || null;
    let sku = getField(row, fieldMap, 'sku');
    const stock = parseStock(getField(row, fieldMap, 'stock'));

    // Handle duplicate SKU
    if (sku && seenSkus.has(sku)) {
      let suffix = 2;
      while (seenSkus.has(`${sku}-${suffix}`)) suffix++;
      const newSku = `${sku}-${suffix}`;
      warnings.push({ row: rowIdx, field: 'sku', message: `重複SKU: ${sku} → ${newSku}` });
      sku = newSku;
    }
    if (sku) seenSkus.add(sku);

    const images: VualProductImage[] = [];
    if (imageUrl) {
      // Support multiple image URLs separated by comma or semicolon
      const urls = imageUrl.split(/[,;]/).map(u => u.trim()).filter(Boolean);
      urls.forEach(url => {
        images.push({ url, color });
      });
    }

    const product: VualProduct = {
      name,
      description: description ? stripHtml(description) : undefined,
      category,
      price,
      currency: options.defaultCurrency,
      brandName: brandName || undefined,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      status: statusStr ? parseStatus(statusStr) : 'draft',
      images,
      variants: [{
        color,
        size,
        sku: sku || '',
        stock,
        priceOverride: null,
      }],
    };

    products.push(product);
  });

  return { products, errors, warnings };
}

import { useState, useEffect, useMemo } from 'react';

/**
 * Category slug format: "{gender}-{type}-{detail}"
 * e.g. "womens-wear-tops", "womens-goods-bags", "mens-wear-pants"
 */

export interface CategoryTree {
  gender: string;       // "womens" | "mens" | "kids"
  genderLabel: string;  // "Women" | "Men" | "Kids"
  types: {
    type: string;       // "wear" | "goods"
    typeLabel: string;   // "ウェア" | "グッズ" / "Wear" | "Goods"
    details: {
      slug: string;     // full slug "womens-wear-tops"
      detail: string;   // "tops"
      label: string;    // "Tops"
    }[];
  }[];
}

const GENDER_LABELS: Record<string, { ja: string; en: string }> = {
  womens: { ja: 'Women', en: 'Women' },
  mens: { ja: 'Men', en: 'Men' },
  kids: { ja: 'Kids', en: 'Kids' },
};

const TYPE_LABELS: Record<string, { ja: string; en: string }> = {
  wear: { ja: 'ウェア', en: 'Wear' },
  goods: { ja: 'グッズ', en: 'Goods' },
};

const DETAIL_LABELS: Record<string, { ja: string; en: string }> = {
  tops: { ja: 'トップス', en: 'Tops' },
  pants: { ja: 'パンツ', en: 'Pants' },
  skirts: { ja: 'スカート', en: 'Skirts' },
  dresses: { ja: 'ワンピース', en: 'Dresses' },
  outer: { ja: 'アウター', en: 'Outerwear' },
  knitwear: { ja: 'ニット', en: 'Knitwear' },
  shirts: { ja: 'シャツ', en: 'Shirts' },
  denim: { ja: 'デニム', en: 'Denim' },
  bags: { ja: 'バッグ', en: 'Bags' },
  shoes: { ja: 'シューズ', en: 'Shoes' },
  accessories: { ja: 'アクセサリー', en: 'Accessories' },
  beauty: { ja: 'ビューティー', en: 'Beauty' },
  hats: { ja: '帽子', en: 'Hats' },
  jewelry: { ja: 'ジュエリー', en: 'Jewelry' },
  watches: { ja: '時計', en: 'Watches' },
  wallets: { ja: '財布', en: 'Wallets' },
  innerwear: { ja: 'インナーウェア', en: 'Innerwear' },
  loungewear: { ja: 'ラウンジウェア', en: 'Loungewear' },
  sportswear: { ja: 'スポーツウェア', en: 'Sportswear' },
  swimwear: { ja: '水着', en: 'Swimwear' },
};

function getLabel(map: Record<string, { ja: string; en: string }>, key: string, locale: string): string {
  const entry = map[key];
  if (entry) return locale === 'ja' ? entry.ja : entry.en;
  // Fallback: capitalize
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function parseCategorySlug(slug: string): { gender: string; type: string; detail: string } | null {
  const parts = slug.split('-');
  if (parts.length < 3) return null;
  return {
    gender: parts[0],
    type: parts[1],
    detail: parts.slice(2).join('-'),
  };
}

export function buildCategoryTree(slugs: string[], locale: string): CategoryTree[] {
  const genderMap = new Map<string, Map<string, { slug: string; detail: string; label: string }[]>>();

  for (const slug of slugs) {
    const parsed = parseCategorySlug(slug);
    if (!parsed) continue;

    if (!genderMap.has(parsed.gender)) {
      genderMap.set(parsed.gender, new Map());
    }
    const typeMap = genderMap.get(parsed.gender)!;
    if (!typeMap.has(parsed.type)) {
      typeMap.set(parsed.type, []);
    }
    typeMap.get(parsed.type)!.push({
      slug,
      detail: parsed.detail,
      label: getLabel(DETAIL_LABELS, parsed.detail, locale),
    });
  }

  // Sort: womens first, then mens, then kids
  const genderOrder = ['womens', 'mens', 'kids'];
  const typeOrder = ['wear', 'goods'];

  return genderOrder
    .filter((g) => genderMap.has(g))
    .map((gender) => {
      const typeMap = genderMap.get(gender)!;
      return {
        gender,
        genderLabel: getLabel(GENDER_LABELS, gender, locale),
        types: typeOrder
          .filter((t) => typeMap.has(t))
          .map((type) => ({
            type,
            typeLabel: getLabel(TYPE_LABELS, type, locale),
            details: typeMap.get(type)!.sort((a, b) => a.label.localeCompare(b.label)),
          })),
      };
    });
}

/** Flat list for category tabs (detail level) */
export function buildFlatCategories(slugs: string[], locale: string): { key: string; label: string }[] {
  const seen = new Set<string>();
  const result: { key: string; label: string }[] = [];

  for (const slug of slugs) {
    const parsed = parseCategorySlug(slug);
    if (!parsed || seen.has(parsed.detail)) continue;
    seen.add(parsed.detail);
    result.push({
      key: slug,
      label: getLabel(DETAIL_LABELS, parsed.detail, locale),
    });
  }

  return result;
}

export function useProductCategories() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products/categories')
      .then((res) => res.json())
      .then((data) => {
        setSlugs(data.categories || []);
      })
      .catch(() => {
        setSlugs([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return { slugs, isLoading };
}

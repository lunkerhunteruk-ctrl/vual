// Product Category Hierarchy
// Structure: Gender > Type (Wear/Goods) > Category

export type GenderType = 'mens' | 'womens';
export type ProductType = 'wear' | 'goods';

export interface CategoryItem {
  id: string;
  labelKey: string; // Translation key
}

export interface CategoryStructure {
  genders: CategoryItem[];
  types: CategoryItem[];
  categories: {
    mens: {
      wear: CategoryItem[];
      goods: CategoryItem[];
    };
    womens: {
      wear: CategoryItem[];
      goods: CategoryItem[];
    };
  };
}

export const categoryStructure: CategoryStructure = {
  genders: [
    { id: 'mens', labelKey: 'categories.genders.mens' },
    { id: 'womens', labelKey: 'categories.genders.womens' },
  ],
  types: [
    { id: 'wear', labelKey: 'categories.types.wear' },
    { id: 'goods', labelKey: 'categories.types.goods' },
  ],
  categories: {
    mens: {
      wear: [
        { id: 'tops', labelKey: 'categories.wear.tops' },
        { id: 'outer', labelKey: 'categories.wear.outer' },
        { id: 'pants', labelKey: 'categories.wear.pants' },
        { id: 'setup', labelKey: 'categories.wear.setup' },
        { id: 'suits', labelKey: 'categories.wear.suits' },
        { id: 'underwear', labelKey: 'categories.wear.underwear' },
      ],
      goods: [
        { id: 'neckties', labelKey: 'categories.goods.neckties' },
        { id: 'bags', labelKey: 'categories.goods.bags' },
        { id: 'shoes', labelKey: 'categories.goods.shoes' },
        { id: 'wallets', labelKey: 'categories.goods.wallets' },
        { id: 'watches', labelKey: 'categories.goods.watches' },
        { id: 'eyewear', labelKey: 'categories.goods.eyewear' },
        { id: 'jewelry', labelKey: 'categories.goods.jewelry' },
        { id: 'legwear', labelKey: 'categories.goods.legwear' },
        { id: 'hats', labelKey: 'categories.goods.hats' },
        { id: 'belts', labelKey: 'categories.goods.belts' },
        { id: 'smallItems', labelKey: 'categories.goods.smallItems' },
        { id: 'umbrellas', labelKey: 'categories.goods.umbrellas' },
        { id: 'stoles', labelKey: 'categories.goods.stoles' },
      ],
    },
    womens: {
      wear: [
        { id: 'tops', labelKey: 'categories.wear.tops' },
        { id: 'outer', labelKey: 'categories.wear.outer' },
        { id: 'pants', labelKey: 'categories.wear.pants' },
        { id: 'skirts', labelKey: 'categories.wear.skirts' },
        { id: 'dresses', labelKey: 'categories.wear.dresses' },
        { id: 'setup', labelKey: 'categories.wear.setup' },
        { id: 'underwear', labelKey: 'categories.wear.underwear' },
      ],
      goods: [
        { id: 'bags', labelKey: 'categories.goods.bags' },
        { id: 'shoes', labelKey: 'categories.goods.shoes' },
        { id: 'wallets', labelKey: 'categories.goods.wallets' },
        { id: 'watches', labelKey: 'categories.goods.watches' },
        { id: 'eyewear', labelKey: 'categories.goods.eyewear' },
        { id: 'jewelry', labelKey: 'categories.goods.jewelry' },
        { id: 'legwear', labelKey: 'categories.goods.legwear' },
        { id: 'hats', labelKey: 'categories.goods.hats' },
        { id: 'belts', labelKey: 'categories.goods.belts' },
        { id: 'smallItems', labelKey: 'categories.goods.smallItems' },
        { id: 'umbrellas', labelKey: 'categories.goods.umbrellas' },
        { id: 'stoles', labelKey: 'categories.goods.stoles' },
      ],
    },
  },
};

// Helper to get full category path (e.g., "mens-wear-tops")
export function getCategoryPath(gender: GenderType, type: ProductType, categoryId: string): string {
  return `${gender}-${type}-${categoryId}`;
}

// Helper to parse category path back to components
export function parseCategoryPath(path: string): { gender: GenderType; type: ProductType; category: string } | null {
  const parts = path.split('-');
  if (parts.length < 3) return null;

  const gender = parts[0] as GenderType;
  const type = parts[1] as ProductType;
  const category = parts.slice(2).join('-');

  if (!['mens', 'womens'].includes(gender)) return null;
  if (!['wear', 'goods'].includes(type)) return null;

  return { gender, type, category };
}

// Get categories for a specific gender and type
export function getCategoriesForSelection(gender: GenderType, type: ProductType): CategoryItem[] {
  return categoryStructure.categories[gender][type];
}

// Get all flat categories for filtering/search
export function getAllCategories(): { id: string; gender: GenderType; type: ProductType; categoryId: string }[] {
  const result: { id: string; gender: GenderType; type: ProductType; categoryId: string }[] = [];

  for (const gender of ['mens', 'womens'] as GenderType[]) {
    for (const type of ['wear', 'goods'] as ProductType[]) {
      for (const cat of categoryStructure.categories[gender][type]) {
        result.push({
          id: getCategoryPath(gender, type, cat.id),
          gender,
          type,
          categoryId: cat.id,
        });
      }
    }
  }

  return result;
}

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, Check, Sparkles, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils/currency';

interface Product {
  id: string;
  name: string;
  name_en?: string;
  base_price: number;
  currency: string;
  category: string;
  product_images?: { id: string; url: string; is_primary: boolean }[];
}

// Category mapping for AI suggestions
const categoryPairs: Record<string, string[]> = {
  'tops': ['bottoms', 'pants'],
  'apparel': ['bottoms', 'pants', 'bag'],
  'outer': ['tops', 'bottoms', 'pants'],
  'knitwear': ['bottoms', 'pants'],
  'bottoms': ['tops', 'knitwear', 'outer'],
  'pants': ['tops', 'knitwear', 'outer'],
  'dress': ['bag', 'accessories'],
  'bag': ['tops', 'bottoms', 'dress'],
  'shoes': ['tops', 'bottoms', 'dress'],
  'accessories': ['tops', 'bottoms', 'dress'],
};

// Category display names
const categoryNames: Record<string, { en: string; ja: string }> = {
  'apparel': { en: 'Apparel', ja: 'アパレル' },
  'tops': { en: 'Tops', ja: 'トップス' },
  'outer': { en: 'Outer', ja: 'アウター' },
  'knitwear': { en: 'Knitwear', ja: 'ニット' },
  'bottoms': { en: 'Bottoms', ja: 'ボトムス' },
  'pants': { en: 'Pants', ja: 'パンツ' },
  'dress': { en: 'Dress', ja: 'ワンピース' },
  'bag': { en: 'Bag', ja: 'バッグ' },
  'shoes': { en: 'Shoes', ja: 'シューズ' },
  'accessories': { en: 'Accessories', ja: 'アクセサリー' },
};

export interface ItemSelection {
  keyItem: string | null;
  subItem: string | null;
  manualSubItem: boolean;
}

interface ItemSelectorProps {
  selection: ItemSelection;
  onSelectionChange: (selection: ItemSelection) => void;
}

export function ItemSelector({ selection, onSelectionChange }: ItemSelectorProps) {
  const t = useTranslations('admin.studio');
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/products?status=published&limit=100');
        const data = await response.json();
        if (data.products) {
          setProducts(data.products);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter(product => {
    const name = locale === 'ja' ? product.name : (product.name_en || product.name);
    const category = product.category || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get key item details
  const keyItemProduct = products.find(p => p.id === selection.keyItem);

  // Get suggested categories for sub-items
  const suggestedCategories = useMemo(() => {
    if (!keyItemProduct) return [];
    const category = (keyItemProduct.category || '').toLowerCase();
    return categoryPairs[category] || [];
  }, [keyItemProduct]);

  // Filter products for sub-item selection (different category than key item)
  const subItemProducts = useMemo(() => {
    if (!keyItemProduct) return [];
    return filteredProducts.filter(p =>
      suggestedCategories.includes((p.category || '').toLowerCase()) && p.id !== selection.keyItem
    );
  }, [filteredProducts, keyItemProduct, suggestedCategories, selection.keyItem]);

  const selectKeyItem = (id: string) => {
    onSelectionChange({
      ...selection,
      keyItem: selection.keyItem === id ? null : id,
      subItem: null, // Reset sub-item when key item changes
    });
  };

  const selectSubItem = (id: string) => {
    onSelectionChange({
      ...selection,
      subItem: selection.subItem === id ? null : id,
    });
  };

  const toggleManualSubItem = () => {
    onSelectionChange({
      ...selection,
      manualSubItem: !selection.manualSubItem,
      subItem: null, // Reset sub-item when toggling
    });
  };

  const getProductName = (product: Product) =>
    locale === 'ja' ? product.name : (product.name_en || product.name);

  const getProductCategory = (product: Product) => {
    const category = (product.category || '').toLowerCase();
    const names = categoryNames[category];
    return names ? (locale === 'ja' ? names.ja : names.en) : product.category;
  };

  const getProductImage = (product: Product) => {
    if (!product.product_images || product.product_images.length === 0) return null;
    const primary = product.product_images.find(img => img.is_primary);
    return primary?.url || product.product_images[0]?.url;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5 h-full flex flex-col"
    >
      {/* Header */}
      <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-4">
        {locale === 'ja' ? 'キーアイテムを選択' : 'Select Key Item'}
      </h3>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchProducts')}
          className="w-full h-10 pl-9 pr-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      {/* Key Item Selection */}
      <div className="flex-1 overflow-y-auto mb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-[var(--color-text-label)]">
              {locale === 'ja' ? '商品がありません' : 'No products found'}
            </p>
            <p className="text-xs text-[var(--color-text-placeholder)] mt-1">
              {locale === 'ja' ? '公開中の商品を追加してください' : 'Add published products first'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => {
              const isKeyItem = selection.keyItem === product.id;
              const imageUrl = getProductImage(product);

              return (
                <motion.button
                  key={product.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectKeyItem(product.id)}
                  className={`relative p-2 rounded-[var(--radius-md)] text-left transition-all ${
                    isKeyItem
                      ? 'bg-[var(--color-accent)]/10 ring-2 ring-[var(--color-accent)]'
                      : 'bg-white border border-[var(--color-line)] hover:border-[var(--color-accent)]'
                  }`}
                >
                  {/* Key Item indicator */}
                  {isKeyItem && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-[var(--color-accent)] rounded-full flex items-center justify-center z-10">
                      <Star size={12} className="text-white fill-white" />
                    </div>
                  )}

                  {/* Product Image */}
                  <div className="aspect-square bg-[var(--color-bg-element)] rounded-[var(--radius-sm)] mb-2 overflow-hidden">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={getProductName(product)}
                        width={120}
                        height={120}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)] flex items-center justify-center text-xs text-[var(--color-text-label)]">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <p className="text-xs font-medium text-[var(--color-title-active)] truncate">
                    {getProductName(product)}
                  </p>
                  <p className="text-xs text-[var(--color-text-label)]">
                    {getProductCategory(product)}
                  </p>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sub-Item Section */}
      {selection.keyItem && suggestedCategories.length > 0 && (
        <div className="border-t border-[var(--color-line)] pt-4">
          {/* Toggle */}
          <button
            onClick={toggleManualSubItem}
            className="flex items-center gap-2 w-full mb-3 p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
          >
            {selection.manualSubItem ? (
              <ToggleRight size={24} className="text-[var(--color-accent)]" />
            ) : (
              <ToggleLeft size={24} className="text-[var(--color-text-label)]" />
            )}
            <span className="text-sm font-medium text-[var(--color-text-body)]">
              {locale === 'ja' ? 'サブアイテムを手動で選ぶ' : 'Select sub-item manually'}
            </span>
          </button>

          <AnimatePresence>
            {selection.manualSubItem ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <h4 className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wide mb-2">
                  {locale === 'ja' ? 'サブアイテムを選択' : 'Select Sub-Item'}
                </h4>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                  {subItemProducts.map((product) => {
                    const isSubItem = selection.subItem === product.id;
                    const imageUrl = getProductImage(product);

                    return (
                      <motion.button
                        key={product.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => selectSubItem(product.id)}
                        className={`relative p-2 rounded-[var(--radius-md)] text-left transition-all ${
                          isSubItem
                            ? 'bg-[var(--color-bg-element)] ring-2 ring-[var(--color-secondary)]'
                            : 'bg-white border border-[var(--color-line)] hover:border-[var(--color-secondary)]'
                        }`}
                      >
                        {isSubItem && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[var(--color-secondary)] rounded-full flex items-center justify-center z-10">
                            <Check size={10} className="text-white" />
                          </div>
                        )}

                        <div className="aspect-square bg-[var(--color-bg-element)] rounded-[var(--radius-sm)] mb-1.5 overflow-hidden">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={getProductName(product)}
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)]" />
                          )}
                        </div>
                        <p className="text-[10px] font-medium text-[var(--color-title-active)] truncate">
                          {getProductName(product)}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 p-3 bg-[var(--color-bg-element)] rounded-[var(--radius-md)]"
              >
                <Sparkles size={16} className="text-[var(--color-accent)]" />
                <span className="text-xs text-[var(--color-text-body)]">
                  {locale === 'ja'
                    ? `AIが最適な${suggestedCategories.map(c => {
                        const names = categoryNames[c];
                        return names ? names.ja : c;
                      }).join('/')}を提案します`
                    : `AI will suggest the best ${suggestedCategories.map(c => {
                        const names = categoryNames[c];
                        return names ? names.en : c;
                      }).join('/')}`
                  }
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Selection Summary */}
      {selection.keyItem && keyItemProduct && (
        <div className="mt-4 p-3 bg-[var(--color-bg-element)] rounded-[var(--radius-md)]">
          <div className="flex items-center gap-2 text-sm">
            <Star size={14} className="text-[var(--color-accent)]" />
            <span className="font-medium text-[var(--color-title-active)]">
              {getProductName(keyItemProduct)}
            </span>
          </div>
          {selection.subItem && (
            <div className="flex items-center gap-2 text-sm mt-1">
              <Check size={14} className="text-[var(--color-secondary)]" />
              <span className="text-[var(--color-text-body)]">
                {getProductName(products.find(p => p.id === selection.subItem)!)}
              </span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default ItemSelector;

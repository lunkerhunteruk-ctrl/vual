'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ImageIcon, X, Check } from 'lucide-react';
import { categoryStructure, parseCategoryPath } from '@/lib/data/categories';
import type { GenderType, ProductType } from '@/lib/data/categories';

interface CategoryStats {
  [categoryPath: string]: {
    count: number;
    iconUrl: string | null;
  };
}

interface CategoriesGridProps {
  onCategorySelect?: (categoryPath: string) => void;
  selectedCategory?: string;
}

export function CategoriesGrid({ onCategorySelect, selectedCategory }: CategoriesGridProps) {
  const t = useTranslations();
  const [stats, setStats] = useState<CategoryStats>({});
  const [loading, setLoading] = useState(true);
  const [activeGender, setActiveGender] = useState<GenderType>('womens');
  const [iconPickerCategory, setIconPickerCategory] = useState<string | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<{ id: string; imageUrl: string; name: string }[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [updatingIcon, setUpdatingIcon] = useState(false);

  // Fetch category stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/categories/stats');
        const data = await res.json();
        if (data.success) {
          setStats(data.stats || {});
        }
      } catch (err) {
        console.error('Failed to fetch category stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Group stats by gender and type
  const groupedCategories = useMemo(() => {
    const result: Record<GenderType, Record<ProductType, { path: string; categoryId: string; count: number; iconUrl: string | null }[]>> = {
      mens: { wear: [], goods: [] },
      womens: { wear: [], goods: [] },
    };

    for (const [path, data] of Object.entries(stats)) {
      const parsed = parseCategoryPath(path);
      if (!parsed) continue;
      if (data.count === 0) continue;

      const { gender, type, category } = parsed;
      if (result[gender]?.[type]) {
        result[gender][type].push({
          path,
          categoryId: category,
          count: data.count,
          iconUrl: data.iconUrl,
        });
      }
    }

    // Sort by category order from categoryStructure
    for (const gender of ['mens', 'womens'] as GenderType[]) {
      for (const type of ['wear', 'goods'] as ProductType[]) {
        const order = categoryStructure.categories[gender][type].map(c => c.id);
        result[gender][type].sort((a, b) => order.indexOf(a.categoryId) - order.indexOf(b.categoryId));
      }
    }

    return result;
  }, [stats]);

  // Get category label from translations
  const getCategoryLabel = (categoryId: string, type: ProductType): string => {
    try {
      return t(`categories.${type}.${categoryId}`);
    } catch {
      return categoryId;
    }
  };

  // Open icon picker: fetch products in that category
  const openIconPicker = async (categoryPath: string) => {
    setIconPickerCategory(categoryPath);
    setLoadingProducts(true);
    try {
      const res = await fetch(`/api/products?category=${categoryPath}&limit=50`);
      const data = await res.json();
      const rawProducts = data.products || data || [];
      if (Array.isArray(rawProducts)) {
        const products = rawProducts
          .filter((p: any) => {
            const images = p.product_images || p.images || [];
            return images.length > 0 && (images[0]?.url || images[0]?.image_url);
          })
          .map((p: any) => {
            const images = p.product_images || p.images || [];
            const primaryImg = images.find((img: any) => img.is_primary) || images[0];
            return {
              id: p.id,
              imageUrl: primaryImg?.url || primaryImg?.image_url,
              name: p.name,
            };
          });
        setCategoryProducts(products);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Update icon
  const updateIcon = async (iconUrl: string) => {
    if (!iconPickerCategory) return;
    setUpdatingIcon(true);
    try {
      const res = await fetch('/api/categories/stats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryPath: iconPickerCategory, iconUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setStats(prev => ({
          ...prev,
          [iconPickerCategory]: {
            ...prev[iconPickerCategory],
            iconUrl,
          },
        }));
        setIconPickerCategory(null);
      }
    } catch (err) {
      console.error('Failed to update icon:', err);
    } finally {
      setUpdatingIcon(false);
    }
  };

  const genderTabs: { id: GenderType; label: string }[] = [
    { id: 'womens', label: t('categories.genders.womens') },
    { id: 'mens', label: t('categories.genders.mens') },
  ];

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-8"
      >
        <div className="flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
        </div>
      </motion.div>
    );
  }

  const currentData = groupedCategories[activeGender];
  const hasWear = currentData.wear.length > 0;
  const hasGoods = currentData.goods.length > 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
      >
        {/* Gender Tabs */}
        <div className="flex items-center gap-2 mb-5">
          {genderTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveGender(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors ${
                activeGender === tab.id
                  ? 'bg-[var(--color-title-active)] text-white'
                  : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] border border-[var(--color-line)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {!hasWear && !hasGoods ? (
          <div className="text-center py-12">
            <p className="text-sm text-[var(--color-text-label)]">
              商品がありません
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Wear Section */}
            {hasWear && (
              <div>
                <h3 className="text-xs font-semibold text-[var(--color-text-label)] uppercase tracking-wide mb-3">
                  {t('categories.types.wear')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {currentData.wear.map(cat => (
                    <CategoryCard
                      key={cat.path}
                      path={cat.path}
                      label={getCategoryLabel(cat.categoryId, 'wear')}
                      count={cat.count}
                      iconUrl={cat.iconUrl}
                      isSelected={selectedCategory === cat.path}
                      onSelect={() => onCategorySelect?.(cat.path)}
                      onIconClick={() => openIconPicker(cat.path)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Goods Section */}
            {hasGoods && (
              <div>
                <h3 className="text-xs font-semibold text-[var(--color-text-label)] uppercase tracking-wide mb-3">
                  {t('categories.types.goods')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {currentData.goods.map(cat => (
                    <CategoryCard
                      key={cat.path}
                      path={cat.path}
                      label={getCategoryLabel(cat.categoryId, 'goods')}
                      count={cat.count}
                      iconUrl={cat.iconUrl}
                      isSelected={selectedCategory === cat.path}
                      onSelect={() => onCategorySelect?.(cat.path)}
                      onIconClick={() => openIconPicker(cat.path)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Icon Picker Modal */}
      <AnimatePresence>
        {iconPickerCategory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIconPickerCategory(null)}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-lg max-w-md w-full max-h-[70vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-[var(--color-line)]">
                <h3 className="text-sm font-semibold text-[var(--color-title-active)]">
                  アイコン画像を選択
                </h3>
                <button
                  onClick={() => setIconPickerCategory(null)}
                  className="p-1 hover:bg-[var(--color-bg-element)] rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto max-h-[calc(70vh-60px)]">
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-[var(--color-text-label)]" />
                  </div>
                ) : categoryProducts.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-label)] text-center py-8">
                    画像付きの商品がありません
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {categoryProducts.map(product => {
                      const isCurrentIcon = stats[iconPickerCategory]?.iconUrl === product.imageUrl;
                      return (
                        <button
                          key={product.id}
                          onClick={() => updateIcon(product.imageUrl)}
                          disabled={updatingIcon}
                          className={`relative aspect-square rounded-[var(--radius-sm)] overflow-hidden border-2 transition-all ${
                            isCurrentIcon
                              ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
                              : 'border-[var(--color-line)] hover:border-[var(--color-accent)]/50'
                          }`}
                        >
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                          {isCurrentIcon && (
                            <div className="absolute top-1 right-1 w-5 h-5 bg-[var(--color-accent)] rounded-full flex items-center justify-center">
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                          {updatingIcon && (
                            <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                              <Loader2 size={16} className="animate-spin" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Individual category card
function CategoryCard({
  path,
  label,
  count,
  iconUrl,
  isSelected,
  onSelect,
  onIconClick,
}: {
  path: string;
  label: string;
  count: number;
  iconUrl: string | null;
  isSelected: boolean;
  onSelect: () => void;
  onIconClick: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group relative flex flex-col items-center p-3 rounded-[var(--radius-md)] border transition-all text-center ${
        isSelected
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 shadow-sm'
          : 'border-[var(--color-line)] hover:bg-[var(--color-bg-element)] hover:border-[var(--color-text-label)]'
      }`}
    >
      {/* Icon */}
      <div
        onClick={e => {
          e.stopPropagation();
          onIconClick();
        }}
        className="w-14 h-14 rounded-[var(--radius-md)] overflow-hidden bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)] mb-2 cursor-pointer hover:ring-2 hover:ring-[var(--color-accent)]/30 transition-all"
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={label}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={20} className="text-[var(--color-text-placeholder)]" />
          </div>
        )}
      </div>

      {/* Label */}
      <p className="text-xs font-medium text-[var(--color-title-active)] leading-tight">
        {label}
      </p>

      {/* Count */}
      <p className="text-[10px] text-[var(--color-text-label)] mt-0.5">
        {count}点
      </p>
    </button>
  );
}

export default CategoriesGrid;

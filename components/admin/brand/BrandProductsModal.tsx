'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ExternalLink } from 'lucide-react';
import { parseCategoryPath } from '@/lib/data/categories';

// Category label map (Japanese)
const categoryLabels: Record<string, string> = {
  tops: 'トップス',
  outer: 'アウター',
  pants: 'パンツ',
  skirts: 'スカート',
  dresses: 'ワンピース',
  setup: 'セットアップ',
  suits: 'スーツ',
  underwear: 'アンダーウェア',
  neckties: 'ネクタイ',
  bags: 'バッグ',
  shoes: 'シューズ',
  wallets: '財布',
  watches: '腕時計',
  eyewear: 'アイウェア',
  jewelry: 'ジュエリー',
  legwear: 'レッグウェア',
  hats: '帽子',
  belts: 'ベルト',
  smallItems: '小物',
  umbrellas: '傘',
  stoles: 'ストール',
};

interface Product {
  id: string;
  name: string;
  category: string;
  base_price: number;
  status: string;
  product_images: { id: string; url: string; is_primary: boolean; position: number }[];
}

interface BrandProductsModalProps {
  brand: { id: string; name: string; productCount: number; thumbnailUrl: string | null } | null;
  onClose: () => void;
}

function getCategoryLabel(categoryPath: string): string {
  const parsed = parseCategoryPath(categoryPath);
  if (!parsed) return categoryPath;
  return categoryLabels[parsed.category] || parsed.category;
}

function getPrimaryImage(product: Product): string | null {
  if (!product.product_images?.length) return null;
  const primary = product.product_images.find(img => img.is_primary);
  return primary?.url || product.product_images[0]?.url || null;
}

export function BrandProductsModal({ brand, onClose }: BrandProductsModalProps) {
  const locale = useLocale();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!brand) return;
    setIsLoading(true);
    setSelectedCategory(null);
    fetch(`/api/products?brand_id=${brand.id}&limit=100`)
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
      })
      .catch(err => console.error('Failed to fetch brand products:', err))
      .finally(() => setIsLoading(false));
  }, [brand]);

  // Extract unique categories from products
  const categories = useMemo(() => {
    const catMap = new Map<string, number>();
    products.forEach(p => {
      if (p.category) {
        catMap.set(p.category, (catMap.get(p.category) || 0) + 1);
      }
    });
    return Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([path, count]) => ({ path, label: getCategoryLabel(path), count }));
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const handleProductClick = (productId: string) => {
    router.push(`/${locale}/admin/products/edit/${productId}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {brand && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-[var(--radius-lg)] w-full max-w-3xl max-h-[80vh] flex flex-col shadow-lg"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-line)] flex-shrink-0">
              <div className="flex items-center gap-3">
                {brand.thumbnailUrl && (
                  <img src={brand.thumbnailUrl} alt={brand.name} className="w-8 h-8 rounded-full object-cover" />
                )}
                <div>
                  <h3 className="text-base font-semibold text-[var(--color-title-active)]">
                    {brand.name}
                  </h3>
                  <p className="text-xs text-[var(--color-text-label)]">
                    {brand.productCount}点の商品
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-element)] transition-colors"
              >
                <X size={18} className="text-[var(--color-text-label)]" />
              </button>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="px-6 py-3 border-b border-[var(--color-line)] flex-shrink-0 overflow-x-auto">
                <div className="flex items-center gap-2 min-w-max">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      !selectedCategory
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-input)]'
                    }`}
                  >
                    すべて ({products.length})
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.path}
                      onClick={() => setSelectedCategory(cat.path === selectedCategory ? null : cat.path)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        selectedCategory === cat.path
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-input)]'
                      }`}
                    >
                      {cat.label} ({cat.count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-sm text-[var(--color-text-label)]">商品がありません</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredProducts.map(product => {
                    const imgUrl = getPrimaryImage(product);
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleProductClick(product.id)}
                        className="group text-left rounded-[var(--radius-md)] border border-[var(--color-line)] overflow-hidden hover:border-[var(--color-accent)]/50 hover:shadow-sm transition-all"
                      >
                        {/* Image */}
                        <div className="aspect-[3/4] bg-[var(--color-bg-element)] relative overflow-hidden">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-placeholder)]">
                              <span className="text-2xl">{product.name.charAt(0)}</span>
                            </div>
                          )}
                          {/* Status badge */}
                          {product.status === 'draft' && (
                            <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded">
                              下書き
                            </span>
                          )}
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <ExternalLink size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                          </div>
                        </div>
                        {/* Info */}
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-[var(--color-title-active)] line-clamp-2 leading-relaxed">
                            {product.name}
                          </p>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-xs text-[var(--color-text-label)]">
                              {getCategoryLabel(product.category)}
                            </span>
                            <span className="text-xs font-medium text-[var(--color-text-body)]">
                              ¥{product.base_price?.toLocaleString()}
                            </span>
                          </div>
                        </div>
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
  );
}

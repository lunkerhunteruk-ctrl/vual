'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, GripVertical, Search, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';

interface CastProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  imageUrl?: string;
}

interface ProductCastingProps {
  products: CastProduct[];
  onProductsChange: (products: CastProduct[]) => void;
  disabled?: boolean;
}

export function ProductCasting({ products, onProductsChange, disabled = false }: ProductCastingProps) {
  const t = useTranslations('admin.live');
  const locale = useLocale();
  const [showPicker, setShowPicker] = useState(false);

  const removeProduct = (id: string) => {
    onProductsChange(products.filter(p => p.id !== id));
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'jpy') {
      return `¥${price.toLocaleString()}`;
    }
    return `$${price.toLocaleString()}`;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
            {t('productCastingArea')}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setShowPicker(true)}
            disabled={disabled}
          >
            {t('addProduct')}
          </Button>
        </div>

        <p className="text-xs text-[var(--color-text-label)] mb-4">
          {t('productsToFeature')}
        </p>

        {/* Product List */}
        <div className="space-y-2">
          <AnimatePresence>
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3 p-3 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] group"
              >
                <button className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" disabled={disabled}>
                  <GripVertical size={16} className="text-[var(--color-text-label)]" />
                </button>

                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded-[var(--radius-sm)]"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--color-bg-input)] to-[var(--color-line)] rounded-[var(--radius-sm)] flex items-center justify-center">
                    <Package size={16} className="text-[var(--color-text-label)]" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-title-active)] truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-[var(--color-accent)]">
                    {formatPrice(product.price, product.currency)}
                  </p>
                </div>

                <span className="text-xs text-[var(--color-text-label)] px-2 py-1 bg-white rounded-full">
                  #{index + 1}
                </span>

                {!disabled && (
                  <button
                    onClick={() => removeProduct(product.id)}
                    className="p-1 rounded-full hover:bg-[var(--color-bg-input)] transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} className="text-[var(--color-text-label)]" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {products.length === 0 && (
            <div className="py-8 text-center">
              <Package size={24} className="mx-auto mb-2 text-[var(--color-text-label)] opacity-50" />
              <p className="text-sm text-[var(--color-text-label)]">
                {locale === 'ja' ? '商品が追加されていません' : 'No products added yet'}
              </p>
              <p className="text-xs text-[var(--color-text-label)] opacity-70 mt-1">
                {locale === 'ja' ? '「商品追加」から商品を選択してください' : 'Click "Add Product" to select products'}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Product Picker Modal */}
      <ProductPickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(product) => {
          if (!products.find(p => p.id === product.id)) {
            onProductsChange([...products, product]);
          }
        }}
        selectedIds={products.map(p => p.id)}
      />
    </>
  );
}

// ─── Product Picker Modal ────────────────────────────────────

interface ProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: CastProduct) => void;
  selectedIds: string[];
}

function ProductPickerModal({ isOpen, onClose, onSelect, selectedIds }: ProductPickerModalProps) {
  const locale = useLocale();
  const [search, setSearch] = useState('');
  const [allProducts, setAllProducts] = useState<CastProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ status: 'published', limit: '50' });
      if (search.trim()) {
        params.set('search', search.trim());
      }
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (data.products) {
        setAllProducts(data.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.base_price || 0,
          currency: p.currency || 'jpy',
          imageUrl: p.product_images?.find((img: any) => img.is_primary)?.url
            || p.product_images?.[0]?.url
            || undefined,
        })));
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen, fetchProducts]);

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'jpy') {
      return `¥${price.toLocaleString()}`;
    }
    return `$${price.toLocaleString()}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={locale === 'ja' ? '商品を選択' : 'Select Products'}
      size="lg"
    >
      <div className="p-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-label)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ja' ? '商品名で検索...' : 'Search products...'}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-[var(--color-line)] rounded-[var(--radius-md)] bg-white focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        {/* Product List */}
        <div className="max-h-[400px] overflow-y-auto space-y-1">
          {isLoading ? (
            <div className="py-10 text-center">
              <Loader2 size={20} className="animate-spin mx-auto text-[var(--color-text-label)]" />
            </div>
          ) : allProducts.length === 0 ? (
            <div className="py-10 text-center">
              <Package size={24} className="mx-auto mb-2 text-[var(--color-text-label)] opacity-50" />
              <p className="text-sm text-[var(--color-text-label)]">
                {locale === 'ja' ? '商品が見つかりません' : 'No products found'}
              </p>
            </div>
          ) : (
            allProducts.map((product) => {
              const isSelected = selectedIds.includes(product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => {
                    if (!isSelected) {
                      onSelect(product);
                    }
                  }}
                  disabled={isSelected}
                  className={`w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)] text-left transition-colors ${
                    isSelected
                      ? 'bg-[var(--color-accent)]/5 opacity-60 cursor-default'
                      : 'hover:bg-[var(--color-bg-element)]'
                  }`}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded-[var(--radius-sm)]"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-[var(--color-bg-element)] rounded-[var(--radius-sm)] flex items-center justify-center">
                      <Package size={16} className="text-[var(--color-text-label)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-title-active)] truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-body)]">
                      {formatPrice(product.price, product.currency)}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="text-xs text-[var(--color-accent)] font-medium px-2 py-1 bg-[var(--color-accent)]/10 rounded-full">
                      {locale === 'ja' ? '追加済み' : 'Added'}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}

export default ProductCasting;

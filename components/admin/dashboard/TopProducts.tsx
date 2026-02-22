'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useProducts } from '@/lib/hooks/useProducts';
import { formatPrice } from '@/lib/utils/currency';

export function TopProducts() {
  const t = useTranslations('admin.dashboard');
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch products - in a real app, you'd sort by sales/orders
  const { products: firestoreProducts, isLoading } = useProducts({ limit: 4 });

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!firestoreProducts) return [];
    if (!searchQuery.trim()) return firestoreProducts;

    const query = searchQuery.toLowerCase();
    return firestoreProducts.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.brand?.toLowerCase().includes(query)
    );
  }, [firestoreProducts, searchQuery]);

  const formatCurrency = (price: number, currency: string = 'USD') => {
    return formatPrice(price, currency, locale, false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
          {t('topProducts')}
        </h3>
      </div>

      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full h-9 pl-9 pr-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 size={20} className="animate-spin mx-auto text-[var(--color-text-label)]" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--color-text-label)]">
            No products found
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-3 p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] flex items-center justify-center overflow-hidden">
                {product.images?.[0]?.url ? (
                  <Image
                    src={product.images[0].url}
                    alt={product.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[var(--color-bg-input)] to-[var(--color-bg-element)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-title-active)] truncate">
                  {product.name}
                </p>
                <p className="text-sm text-[var(--color-accent)]">{formatCurrency(product.price, product.currency)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--color-text-label)]">{product.stockQuantity} in stock</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--color-line)]">
        <button className="w-full py-2 text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors">
          {t('allProduct')} →
        </button>
      </div>
    </motion.div>
  );
}

export default TopProducts;

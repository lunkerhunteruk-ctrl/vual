'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Plus, Filter, MoreHorizontal, Edit2, Trash2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useProducts } from '@/lib/hooks/useProducts';
import { formatPrice } from '@/lib/utils/currency';

type TabFilter = 'all' | 'published' | 'draft' | 'outOfStock';

export function ProductsTable() {
  const t = useTranslations('admin.products');
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch products from Firestore
  const { products: firestoreProducts, isLoading, hasMore, loadMore } = useProducts({
    limit: 20,
  });

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    if (!firestoreProducts) return { all: 0, published: 0, draft: 0, outOfStock: 0 };
    return {
      all: firestoreProducts.length,
      published: firestoreProducts.filter(p => p.isPublished).length,
      draft: firestoreProducts.filter(p => !p.isPublished).length,
      outOfStock: firestoreProducts.filter(p => p.stockStatus === 'out_of_stock').length,
    };
  }, [firestoreProducts]);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: t('allProducts'), count: tabCounts.all },
    { key: 'published', label: t('published'), count: tabCounts.published },
    { key: 'draft', label: t('draft'), count: tabCounts.draft },
    { key: 'outOfStock', label: t('outOfStock'), count: tabCounts.outOfStock },
  ];

  const filteredProducts = useMemo(() => {
    if (!firestoreProducts) return [];

    let result = firestoreProducts;

    if (activeTab === 'published') {
      result = result.filter(p => p.isPublished);
    } else if (activeTab === 'draft') {
      result = result.filter(p => !p.isPublished);
    } else if (activeTab === 'outOfStock') {
      result = result.filter(p => p.stockStatus === 'out_of_stock');
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [firestoreProducts, activeTab, searchQuery]);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const formatProductPrice = (price: number, currency: string = 'USD') => {
    return formatPrice(price, currency, locale, false);
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'text-emerald-600';
      case 'low_stock': return 'text-amber-600';
      case 'out_of_stock': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)]"
    >
      {/* Tabs and Search */}
      <div className="p-4 border-b border-[var(--color-line)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[var(--color-title-active)] text-white'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)]'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-[var(--radius-md)] border border-[var(--color-line)] hover:bg-[var(--color-bg-element)] transition-colors">
              <Filter size={16} className="text-[var(--color-text-label)]" />
            </button>
            <button className="p-2 rounded-[var(--radius-md)] border border-[var(--color-line)] hover:bg-[var(--color-bg-element)] transition-colors">
              <Plus size={16} className="text-[var(--color-text-label)]" />
            </button>
            <button className="p-2 rounded-[var(--radius-md)] border border-[var(--color-line)] hover:bg-[var(--color-bg-element)] transition-colors">
              <MoreHorizontal size={16} className="text-[var(--color-text-label)]" />
            </button>
          </div>
        </div>

        <div className="relative max-w-md">
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
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-[var(--color-text-label)]">{t('noProducts')}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-line)] bg-[var(--color-bg-element)]">
                <th className="w-12 py-3 px-4">
                  <input type="checkbox" className="w-4 h-4 rounded border-[var(--color-line)]" />
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('product')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  SKU
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('price')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('stock')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('created')}
                </th>
                <th className="w-24 py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors"
                >
                  <td className="py-3 px-4">
                    <input type="checkbox" className="w-4 h-4 rounded border-[var(--color-line)]" />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] overflow-hidden flex-shrink-0">
                        {product.images?.[0]?.url ? (
                          <Image
                            src={product.images[0].url}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)]" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--color-title-active)]">
                          {product.name}
                        </p>
                        {product.brand && (
                          <p className="text-xs text-[var(--color-text-label)]">{product.brand}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)] font-mono">
                    {product.sku || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-[var(--color-title-active)]">
                    {formatProductPrice(product.price, product.currency)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-medium ${getStockStatusColor(product.stockStatus)}`}>
                      {product.stockQuantity} {product.stockStatus === 'in_stock' ? 'In Stock' : product.stockStatus === 'low_stock' ? 'Low' : 'Out'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {formatDate(product.createdAt)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors">
                        <Edit2 size={14} className="text-[var(--color-text-label)]" />
                      </button>
                      <button className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors">
                        <Trash2 size={14} className="text-[var(--color-text-label)]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="p-4 border-t border-[var(--color-line)]">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="w-full py-2 text-sm text-[var(--color-text-body)] border border-[var(--color-line)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default ProductsTable;

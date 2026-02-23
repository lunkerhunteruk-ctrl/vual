'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Plus, Filter, MoreHorizontal, Edit2, Trash2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils/currency';

interface Product {
  id: string;
  name: string;
  name_en?: string;
  category: string;
  base_price: number;
  discounted_price?: number;
  currency: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  product_images?: { id: string; url: string; is_primary: boolean }[];
  product_variants?: { id: string; stock: number }[];
}

type TabFilter = 'all' | 'published' | 'draft';

export function ProductsTable() {
  const t = useTranslations('admin.products');
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch products from Supabase API
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/products?status=all&limit=100');
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

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    return {
      all: products.length,
      published: products.filter(p => p.status === 'published').length,
      draft: products.filter(p => p.status === 'draft').length,
    };
  }, [products]);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: t('allProducts'), count: tabCounts.all },
    { key: 'published', label: t('published'), count: tabCounts.published },
    { key: 'draft', label: t('draft'), count: tabCounts.draft },
  ];

  const filteredProducts = useMemo(() => {
    let result = products;

    if (activeTab === 'published') {
      result = result.filter(p => p.status === 'published');
    } else if (activeTab === 'draft') {
      result = result.filter(p => p.status === 'draft');
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.name_en?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [products, activeTab, searchQuery]);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const formatProductPrice = (price: number, currency: string = 'jpy') => {
    return formatPrice(price, currency.toUpperCase(), locale, false);
  };

  const getTotalStock = (product: Product) => {
    if (!product.product_variants || product.product_variants.length === 0) {
      return 0;
    }
    return product.product_variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  };

  const getPrimaryImage = (product: Product) => {
    if (!product.product_images || product.product_images.length === 0) {
      return null;
    }
    const primary = product.product_images.find(img => img.is_primary);
    return primary?.url || product.product_images[0]?.url;
  };

  const handleDelete = async (productId: string) => {
    if (!confirm(locale === 'ja' ? 'この商品を削除しますか？' : 'Delete this product?')) {
      return;
    }

    try {
      const response = await fetch(`/api/products?id=${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProducts(prev => prev.filter(p => p.id !== productId));
      } else {
        alert(locale === 'ja' ? '削除に失敗しました' : 'Failed to delete');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(locale === 'ja' ? '削除に失敗しました' : 'Failed to delete');
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
            <Link href={`/${locale}/admin/products/add`}>
              <button className="p-2 rounded-[var(--radius-md)] border border-[var(--color-line)] hover:bg-[var(--color-bg-element)] transition-colors">
                <Plus size={16} className="text-[var(--color-text-label)]" />
              </button>
            </Link>
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
            <p className="text-sm text-[var(--color-text-label)]">{t('noProducts') || '商品がありません'}</p>
            <Link href={`/${locale}/admin/products/add`} className="mt-4">
              <button className="px-4 py-2 text-sm bg-[var(--color-accent)] text-white rounded-[var(--radius-md)]">
                {t('addProduct')}
              </button>
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-line)] bg-[var(--color-bg-element)]">
                <th className="w-12 py-3 px-4">
                  <input type="checkbox" className="w-4 h-4 rounded border-[var(--color-line)]" />
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('product') || '商品'}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('category') || 'カテゴリー'}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('price')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('status') || 'ステータス'}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('created') || '作成日'}
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
                        {getPrimaryImage(product) ? (
                          <Image
                            src={getPrimaryImage(product)!}
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
                        {product.name_en && (
                          <p className="text-xs text-[var(--color-text-label)]">{product.name_en}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {product.category || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-[var(--color-title-active)]">
                    {formatProductPrice(product.base_price, product.currency)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      product.status === 'published'
                        ? 'bg-emerald-100 text-emerald-700'
                        : product.status === 'draft'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {product.status === 'published' ? (locale === 'ja' ? '公開中' : 'Published') :
                       product.status === 'draft' ? (locale === 'ja' ? '下書き' : 'Draft') :
                       (locale === 'ja' ? 'アーカイブ' : 'Archived')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {formatDate(product.created_at)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors">
                        <Edit2 size={14} className="text-[var(--color-text-label)]" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-1.5 rounded-[var(--radius-sm)] hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} className="text-[var(--color-text-label)] hover:text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}

export default ProductsTable;

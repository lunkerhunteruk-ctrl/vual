'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowLeft, Grid3X3, List, Package } from 'lucide-react';
import { ProductGrid } from '@/components/customer/home';
import { Button } from '@/components/ui';
import { useProducts } from '@/lib/hooks/useProducts';
import { getTaxInclusivePrice, formatPriceWithTax } from '@/lib/utils/currency';

interface Brand {
  id: string;
  name: string;
  name_en?: string;
  slug: string;
  logo_url?: string;
  description?: string;
}

export default function BrandPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [brand, setBrand] = useState<Brand | null>(null);
  const [brandLoading, setBrandLoading] = useState(true);

  const brandSlug = typeof params.slug === 'string' ? params.slug : '';

  // Fetch brand info by slug
  useEffect(() => {
    async function fetchBrand() {
      try {
        const res = await fetch('/api/brands');
        const data = await res.json();
        const found = data.brands?.find((b: any) => b.slug === brandSlug);
        setBrand(found || null);
      } catch {
        setBrand(null);
      } finally {
        setBrandLoading(false);
      }
    }
    if (brandSlug) fetchBrand();
  }, [brandSlug]);

  // Fetch products filtered by brand (only when brand is loaded)
  const { products: rawProducts, isLoading: productsLoading, hasMore, loadMore } = useProducts(
    brand ? { brandId: brand.id, limit: 20 } : { limit: 0 }
  );

  const isLoading = brandLoading || (brand && productsLoading);

  const products = useMemo(() => {
    if (!brand || !rawProducts?.length) return [];
    return rawProducts.map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand || '',
      price: formatPriceWithTax(
        getTaxInclusivePrice(p.price || p.base_price || 0, p.tax_included ?? true, p.currency || 'jpy'),
        p.currency || 'jpy',
        locale === 'ja' ? 'ja-JP' : undefined
      ),
      image: p.images?.[0]?.url,
    }));
  }, [rawProducts, brand, locale]);

  const brandDisplayName = brand
    ? (locale === 'ja' ? brand.name : (brand.name_en || brand.name))
    : brandSlug;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-14 z-10 bg-white border-b border-[var(--color-line)]">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ArrowLeft size={20} className="text-[var(--color-title-active)]" />
          </button>
          <div className="flex items-center gap-2">
            {brand?.logo_url && (
              <img src={brand.logo_url} alt={brandDisplayName} className="h-6 w-auto object-contain" />
            )}
            <span className="text-sm font-medium text-[var(--color-title-active)]">
              {isLoading ? '...' : `${products.length} ${brandDisplayName.toUpperCase()}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-[var(--color-bg-element)]' : ''}`}
            >
              <Grid3X3 size={18} className="text-[var(--color-text-body)]" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-[var(--color-bg-element)]' : ''}`}
            >
              <List size={18} className="text-[var(--color-text-body)]" />
            </button>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="py-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 px-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-gray-200 rounded-lg mb-2" />
                <div className="h-3 bg-gray-200 rounded w-16 mb-1" />
                <div className="h-4 bg-gray-200 rounded w-full mb-1" />
                <div className="h-4 bg-gray-200 rounded w-12" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="w-16 h-16 mb-4 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center mx-auto">
                <Package size={24} className="text-[var(--color-text-label)]" />
              </div>
              <p className="text-sm text-[var(--color-text-body)] mb-4">
                {locale === 'ja' ? 'このブランドの商品はまだありません' : 'No products found for this brand yet.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ArrowLeft size={14} />}
                onClick={() => router.push(`/${locale}`)}
              >
                {locale === 'ja' ? '全ての商品を見る' : 'Browse All Products'}
              </Button>
            </motion.div>
          </div>
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="px-4 py-4 flex justify-center">
          <button
            onClick={loadMore}
            className="px-6 py-2 border border-[var(--color-line)] rounded-[var(--radius-md)] text-sm text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] transition-colors"
          >
            {locale === 'ja' ? 'もっと見る' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}

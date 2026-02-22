'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowLeft, Grid3X3, List, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { ProductGrid } from '@/components/customer/home';
import { Pagination } from '@/components/ui';
import { useProducts } from '@/lib/hooks/useProducts';

// Fallback products
const fallbackProducts = [
  { id: '1', name: 'Oversized Wool Blazer', brand: 'MOHAN', price: '$299' },
  { id: '2', name: 'Silk Slip Dress', brand: 'LAMEREI', price: '$189' },
  { id: '3', name: 'Cashmere Cardigan', brand: 'KORIN', price: '$249' },
  { id: '4', name: 'Leather Tote Bag', brand: 'MERAKI', price: '$399' },
];

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('customer.category');

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  const categorySlug = typeof params.slug === 'string' ? params.slug : '';
  const categoryName = categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1);

  // Fetch real products from Firestore
  const { products: firestoreProducts, isLoading, hasMore, loadMore } = useProducts({
    category: categorySlug,
    limit: 12,
  });

  // Transform products for display
  const products = useMemo(() => {
    if (firestoreProducts && firestoreProducts.length > 0) {
      return firestoreProducts.map(p => ({
        id: p.id,
        name: p.name,
        brand: p.brand || '',
        price: `$${p.price}`,
        image: p.images?.[0]?.url,
      }));
    }
    return fallbackProducts;
  }, [firestoreProducts]);

  const productCount = firestoreProducts?.length || fallbackProducts.length;

  // Active filters based on category
  const [activeFilters, setActiveFilters] = useState<string[]>([categoryName]);

  const removeFilter = (filter: string) => {
    setActiveFilters(prev => prev.filter(f => f !== filter));
    // If category filter removed, go back
    if (filter === categoryName) {
      router.back();
    }
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-14 z-10 bg-white border-b border-[var(--color-line)]">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-1 -ml-1"
          >
            <ArrowLeft size={20} className="text-[var(--color-title-active)]" />
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-[var(--color-title-active)]">
              {isLoading ? '...' : productCount} {categoryName.toUpperCase()}
            </span>
            <div className="flex items-center gap-1 border-l border-[var(--color-line)] pl-4">
              <button className="flex items-center gap-1 text-sm text-[var(--color-text-body)]">
                New
                <ChevronDown size={14} />
              </button>
            </div>
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

        {/* Filter Tags */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {activeFilters.map(filter => (
            <motion.button
              key={filter}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => removeFilter(filter)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-bg-element)] rounded-full text-xs text-[var(--color-text-body)] whitespace-nowrap"
            >
              {filter}
              <X size={12} />
            </motion.button>
          ))}
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--color-line)] rounded-full text-xs text-[var(--color-text-body)] whitespace-nowrap">
            <SlidersHorizontal size={12} />
            Filter
          </button>
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
            <p className="text-sm text-[var(--color-text-label)] text-center">
              No products found in this category.
            </p>
          </div>
        )}
      </div>

      {/* Load More / Pagination */}
      {hasMore && (
        <div className="px-4 py-4 flex justify-center">
          <button
            onClick={loadMore}
            className="px-6 py-2 border border-[var(--color-line)] rounded-[var(--radius-md)] text-sm text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

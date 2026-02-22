'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';
import {
  HeroSection,
  CategoryTabs,
  ProductGrid,
  CollectionBanner,
} from '@/components/customer/home';
import { useProducts } from '@/lib/hooks/useProducts';
import { useHasCollections } from '@/lib/hooks';

export default function HomePage() {
  const t = useTranslations('customer.home');
  const [activeCategory, setActiveCategory] = useState('all');

  // Fetch real products from Firestore
  const { products: firestoreProducts, isLoading } = useProducts({
    category: activeCategory === 'all' ? undefined : activeCategory,
    limit: 8,
  });

  // Check if collections exist
  const { hasCollections } = useHasCollections();

  // Transform Firestore products to display format
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
    return [];
  }, [firestoreProducts]);

  // Check if we have any products
  const hasProducts = products.length > 0;

  return (
    <div className="min-h-screen">
      {/* Hero Section - always show */}
      <HeroSection />

      {/* New Arrival Section - only show if products exist */}
      {(isLoading || hasProducts) && (
        <section className="py-10">
          <div className="px-4 mb-6">
            <h2 className="text-lg font-medium tracking-[0.15em] text-[var(--color-title-active)] uppercase">
              {t('newArrival')}
            </h2>
            <div className="w-12 h-0.5 bg-[var(--color-title-active)] mt-2" />
          </div>

          {/* Category Tabs */}
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          {/* Product Grid */}
          <div className="mt-6">
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
            ) : (
              <ProductGrid products={products} />
            )}
          </div>

          {/* See More Link */}
          {hasProducts && (
            <div className="flex justify-center mt-8">
              <button className="flex items-center gap-2 text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors">
                {t('exploreMore')}
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>
      )}

      {/* Collections Section - only show if collections exist */}
      {hasCollections && (
        <section className="py-10">
          <div className="px-4 mb-6">
            <h2 className="text-lg font-medium tracking-[0.15em] text-[var(--color-title-active)] uppercase">
              {t('collections')}
            </h2>
            <div className="w-12 h-0.5 bg-[var(--color-title-active)] mt-2" />
          </div>

          <div className="space-y-4">
            <CollectionBanner
              title="OCTOBER COLLECTION"
              subtitle="Autumn 2025"
              href="/collection/october"
            />
            <CollectionBanner
              title="BLACK ESSENTIALS"
              subtitle="Timeless Classics"
              href="/collection/black"
            />
          </div>
        </section>
      )}
    </div>
  );
}

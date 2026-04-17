'use client';

import { useState, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import {
  HeroSection,
  CategoryTabs,
  ProductGrid,
  CollectionBanner,
  CollectionHeroSlideshow,
  BrandGrid,
} from '@/components/customer/home';
import { useProducts } from '@/lib/hooks/useProducts';
import { useHasCollections } from '@/lib/hooks';
import { useStoreContext } from '@/lib/store/store-context';
import { getTaxInclusivePrice, formatPriceWithTax } from '@/lib/utils/currency';
import { VualLandingPage } from '@/components/lp/LandingPage';
import { StudioLP } from '@/components/lp/StudioLP';

// ============================================================
// Under Construction page for root domain (vual.jp)
// ============================================================
function UnderConstruction() {
  const locale = useLocale();
  const tagline = locale === 'ja' ? '存在しない美を、創る。' : 'Imagined. Then made real.';
  return (
    <div className="relative min-h-screen bg-[#0d0a12] flex flex-col items-center justify-center text-white px-6 overflow-hidden">
      {/* Aurora background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="uc-blob uc-purple-1" />
        <div className="uc-blob uc-purple-2" />
        <div className="uc-blob uc-green-1" />
        <div className="uc-blob uc-green-2" />
        <div className="uc-blob uc-green-3" />
        <div className="uc-blob uc-cyan-1" />
        <div className="uc-blob uc-magenta-1" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        <h1
          className="text-5xl md:text-7xl font-light tracking-[0.3em] uppercase mb-6"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          VUAL
        </h1>
        <p className="text-base md:text-lg font-light tracking-[0.08em] text-white/50 mb-8"
          style={{ fontFamily: locale === 'ja' ? "'Noto Sans JP', sans-serif" : "'Cormorant Garamond', Georgia, serif", fontStyle: locale === 'ja' ? 'normal' : 'italic' }}
        >
          {tagline}
        </p>
        <div className="w-16 h-px bg-white/20 mb-6" />
        <p className="text-xs tracking-[0.2em] text-white/25 uppercase">
          Coming Soon
        </p>
      </div>

      <style>{`
        .uc-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(130px);
          will-change: transform;
          mix-blend-mode: screen;
        }
        .uc-purple-1 {
          width: 55vw; height: 55vw;
          top: -10%; left: -10%;
          background: radial-gradient(circle, #9333ea 0%, #6b21a8 35%, transparent 70%);
          animation: ucP1 20s ease-in-out infinite;
        }
        .uc-purple-2 {
          width: 45vw; height: 45vw;
          bottom: 5%; right: -5%;
          background: radial-gradient(circle, #7c3aed 0%, #4c1d95 40%, transparent 70%);
          animation: ucP2 26s ease-in-out infinite;
        }
        .uc-green-1 {
          width: 50vw; height: 50vw;
          top: 15%; right: -10%;
          background: radial-gradient(circle, #14f195 0%, #0ea47a 25%, #064e3b 50%, transparent 72%);
          animation: ucG1 22s ease-in-out infinite;
        }
        .uc-green-2 {
          width: 40vw; height: 40vw;
          bottom: 20%; left: 10%;
          background: radial-gradient(circle, #34d399 0%, #059669 30%, #064e3b 55%, transparent 72%);
          animation: ucG2 18s ease-in-out infinite;
        }
        .uc-green-3 {
          width: 35vw; height: 35vw;
          top: 55%; left: 40%;
          background: radial-gradient(circle, #10b981 0%, #047857 35%, transparent 65%);
          animation: ucG3 24s ease-in-out infinite;
        }
        .uc-cyan-1 {
          width: 38vw; height: 38vw;
          top: 35%; left: -5%;
          background: radial-gradient(circle, #22d3ee 0%, #0891b2 30%, #164e63 55%, transparent 72%);
          animation: ucC1 21s ease-in-out infinite;
        }
        .uc-magenta-1 {
          width: 42vw; height: 42vw;
          top: 60%; right: 10%;
          background: radial-gradient(circle, #e879f9 0%, #a855f7 30%, #581c87 55%, transparent 72%);
          animation: ucM1 23s ease-in-out infinite;
        }
        @keyframes ucP1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.28; }
          30% { transform: translate(12vw, 10vh) scale(1.2); opacity: 0.42; }
          60% { transform: translate(-8vw, 18vh) scale(0.85); opacity: 0.22; }
        }
        @keyframes ucP2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.22; }
          45% { transform: translate(-15vw, -12vh) scale(1.15); opacity: 0.38; }
          75% { transform: translate(5vw, -5vh) scale(0.9); opacity: 0.18; }
        }
        @keyframes ucG1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          35% { transform: translate(-18vw, 8vh) scale(1.25); opacity: 0.38; }
          70% { transform: translate(-8vw, -10vh) scale(0.9); opacity: 0.15; }
        }
        @keyframes ucG2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.18; }
          40% { transform: translate(14vw, -14vh) scale(1.15); opacity: 0.35; }
          80% { transform: translate(5vw, 8vh) scale(0.95); opacity: 0.12; }
        }
        @keyframes ucG3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
          50% { transform: translate(-12vw, 10vh) scale(1.3); opacity: 0.3; }
        }
        @keyframes ucC1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.18; }
          33% { transform: translate(10vw, 12vh) scale(1.1); opacity: 0.32; }
          66% { transform: translate(18vw, -5vh) scale(0.85); opacity: 0.12; }
        }
        @keyframes ucM1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
          40% { transform: translate(-10vw, -15vh) scale(1.2); opacity: 0.3; }
          70% { transform: translate(8vw, 5vh) scale(0.9); opacity: 0.1; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Shop Homepage (subdomain)
// ============================================================
export default function HomePage() {
  const isRootDomain = useStoreContext((s) => s.isRootDomain);

  if (isRootDomain) {
    return <StudioLP />;
  }

  return <ShopHomePage />;
}

function ShopHomePage() {
  const t = useTranslations('customer.home');
  const locale = useLocale();
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
        price: formatPriceWithTax(
          getTaxInclusivePrice(p.price || p.base_price || 0, p.tax_included ?? true, p.currency || 'jpy'),
          p.currency || 'jpy',
          locale === 'ja' ? 'ja-JP' : undefined
        ),
        image: p.images?.[0]?.url,
      }));
    }
    return [];
  }, [firestoreProducts, locale]);

  // Check if we have any products
  const hasProducts = products.length > 0;

  return (
    <div className="min-h-screen">
      {/* Hero Section - slideshow if collection exists, else static */}
      <CollectionHeroSlideshow fallback={<HeroSection />} />

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
                    <div className="aspect-square bg-gray-200 rounded-lg mb-2" />
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

      {/* Brands Section */}
      <section className="py-10">
        <div className="px-4 mb-6">
          <h2 className="text-lg font-medium tracking-[0.15em] text-[var(--color-title-active)] uppercase">
            {locale === 'ja' ? 'ブランド' : 'Brands'}
          </h2>
          <div className="w-12 h-0.5 bg-[var(--color-title-active)] mt-2" />
        </div>
        <BrandGrid />
      </section>
    </div>
  );
}

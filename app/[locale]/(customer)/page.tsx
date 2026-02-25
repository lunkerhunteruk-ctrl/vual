'use client';

import { useState, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronRight, Sparkles, MessageCircle, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import {
  HeroSection,
  CategoryTabs,
  ProductGrid,
  CollectionBanner,
} from '@/components/customer/home';
import { useProducts } from '@/lib/hooks/useProducts';
import { useHasCollections } from '@/lib/hooks';
import { useStoreContext } from '@/lib/store/store-context';

// ============================================================
// Landing Page for root domain (vual.jp)
// ============================================================
function LandingPage() {
  const locale = useLocale();

  const features = [
    {
      icon: Sparkles,
      title: locale === 'ja' ? 'AI バーチャル試着' : 'AI Virtual Try-On',
      desc: locale === 'ja'
        ? 'お客様が自分の写真で商品を試着。購入率アップ＆返品率ダウン。'
        : 'Customers try on products with their own photos. Boost sales, reduce returns.',
    },
    {
      icon: MessageCircle,
      title: locale === 'ja' ? 'LINE 連携' : 'LINE Integration',
      desc: locale === 'ja'
        ? 'LINEで顧客とつながり、試着結果の共有やプッシュ通知を自動化。'
        : 'Connect with customers via LINE. Automate try-on sharing and push notifications.',
    },
    {
      icon: LayoutDashboard,
      title: locale === 'ja' ? 'かんたん管理画面' : 'Easy Dashboard',
      desc: locale === 'ja'
        ? '商品登録、注文管理、顧客分析をひとつの画面で。コード不要。'
        : 'Manage products, orders, and analytics in one place. No code required.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 to-neutral-100" />
        <div className="relative max-w-4xl mx-auto px-6 py-24 md:py-36 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-neutral-900 mb-6">
            VUAL
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 mb-4 leading-relaxed">
            {locale === 'ja'
              ? 'AIバーチャル試着で、ファッションECを次のステージへ'
              : 'Next-gen fashion EC with AI virtual try-on'}
          </p>
          <p className="text-sm text-neutral-500 mb-10">
            {locale === 'ja'
              ? '無料でショップを開設。クレジットカード不要。'
              : 'Start your shop for free. No credit card required.'}
          </p>
          <Link
            href={`/${locale}/signup`}
            className="inline-flex items-center gap-3 px-12 py-5 bg-black text-white text-lg font-bold rounded-full hover:bg-neutral-800 transition-all shadow-xl shadow-black/25 hover:shadow-2xl hover:scale-[1.02]"
          >
            {locale === 'ja' ? '無料でショップを開設' : 'Start Your Shop Free'}
            <ChevronRight size={20} strokeWidth={2.5} />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {features.map((f) => (
            <div key={f.title} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                <f.icon size={24} className="text-neutral-700" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 mb-2">{f.title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-100">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
            {locale === 'ja' ? '今すぐ始めよう' : 'Get Started Today'}
          </h2>
          <p className="text-sm text-neutral-500 mb-8">
            {locale === 'ja'
              ? '5分でショップ開設。あなたのブランドをオンラインへ。'
              : 'Set up your shop in 5 minutes. Take your brand online.'}
          </p>
          <Link
            href={`/${locale}/signup`}
            className="inline-flex items-center gap-2 px-10 py-4 bg-neutral-900 text-white text-base font-semibold rounded-full hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-900/20"
          >
            {locale === 'ja' ? '無料で始める' : 'Start Free'}
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100 py-8">
        <p className="text-center text-xs text-neutral-400">
          © {new Date().getFullYear()} VUAL. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

// ============================================================
// Shop Homepage (subdomain)
// ============================================================
export default function HomePage() {
  const isRootDomain = useStoreContext((s) => s.isRootDomain);

  if (isRootDomain) {
    return <LandingPage />;
  }

  return <ShopHomePage />;
}

function ShopHomePage() {
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

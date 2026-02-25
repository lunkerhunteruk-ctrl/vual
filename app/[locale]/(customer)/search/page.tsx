'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Search, X, Clock, Grid3X3, Loader2 } from 'lucide-react';
import { ProductGrid } from '@/components/customer/home';
import { useCustomerContext } from '@/lib/store/customer-context';

// Japanese → English category slug mapping for search
const CATEGORY_SEARCH_MAP: Record<string, string[]> = {
  'トップス': ['tops'],
  'アウター': ['outer'],
  'パンツ': ['pants'],
  'スカート': ['skirts'],
  'ワンピース': ['dresses'],
  'セットアップ': ['setup'],
  'スーツ': ['suits'],
  'アンダーウェア': ['underwear'],
  'バッグ': ['bags'],
  'シューズ': ['shoes'],
  '財布': ['wallets'],
  '腕時計': ['watches'],
  'アイウェア': ['eyewear'],
  'ジュエリー': ['jewelry'],
  'アクセサリー': ['jewelry'],
  '帽子': ['hats'],
  'ベルト': ['belts'],
  'ネクタイ': ['neckties'],
  'メンズ': ['mens'],
  'レディース': ['womens'],
  'ウェア': ['wear'],
};

function expandSearchQuery(query: string): string[] {
  const q = query.toLowerCase();
  const slugs: string[] = [];
  for (const [ja, en] of Object.entries(CATEGORY_SEARCH_MAP)) {
    if (ja.toLowerCase().includes(q) || q.includes(ja.toLowerCase())) {
      slugs.push(...en);
    }
  }
  return slugs;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('customer.search');

  const { storeId } = useCustomerContext();

  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // When storeId is set, load store products immediately (even without search query)
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(false);

  // Server-side search via API
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load all store products (for client-side search filtering)
  useEffect(() => {
    const fetchStoreProducts = async () => {
      setIsLoadingStore(true);
      try {
        let res;
        if (storeId) {
          res = await fetch(`/api/customer/store-products?storeId=${storeId}&limit=100`);
        } else {
          // No storeId: use general products API (resolves store from host)
          res = await fetch('/api/products?status=published&limit=100');
        }
        const data = await res.json();
        const rawProducts = data.products || [];
        setStoreProducts(rawProducts.map((p: any) => ({
          id: p.id,
          name: p.name,
          brand: p.brand || '',
          category: p.category || '',
          price: `¥${(p.price || p.base_price || 0).toLocaleString()}`,
          image: p.image || p.product_images?.find((img: any) => img.is_primary)?.url || p.product_images?.[0]?.url || '',
        })));
      } catch {
        setStoreProducts([]);
      } finally {
        setIsLoadingStore(false);
      }
    };
    fetchStoreProducts();
  }, [storeId]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        // If store products are pre-loaded, filter client-side (fast + reliable)
        if (storeProducts.length > 0) {
          const q = searchQuery.toLowerCase();
          const categorySlugs = expandSearchQuery(searchQuery);
          const filtered = storeProducts.filter((p: any) => {
            if (p.name?.toLowerCase().includes(q)) return true;
            if (p.brand?.toLowerCase().includes(q)) return true;
            if (p.category?.toLowerCase().includes(q)) return true;
            if (categorySlugs.length > 0 && p.category) {
              return categorySlugs.some(slug => p.category.toLowerCase().includes(slug));
            }
            return false;
          });
          setSearchResults(filtered);
          return;
        }

        // Fallback: API search (with store_id if available)
        const params = new URLSearchParams({
          search: searchQuery,
          status: 'published',
          limit: '50',
        });
        if (storeId) {
          params.set('store_id', storeId);
        }
        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        const products = (data.products || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          brand: p.brand || '',
          price: `¥${(p.base_price || p.price || 0).toLocaleString()}`,
          image: p.product_images?.find((img: any) => img.is_primary)?.url || p.product_images?.[0]?.url,
        }));
        setSearchResults(products);
      } catch {
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [searchQuery, storeId, storeProducts]);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  // Browsing history
  const [viewedProducts, setViewedProducts] = useState<any[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('vual-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
    // Load browsing history
    try {
      const viewed = JSON.parse(localStorage.getItem('vual-viewed-products') || '[]');
      setViewedProducts(viewed);
    } catch {
      // ignore
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('vual-recent-searches', JSON.stringify(updated));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchQuery(query);
      saveRecentSearch(query);
      router.push(`/${locale}/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleTermClick = (term: string) => {
    setQuery(term);
    setSearchQuery(term);
    saveRecentSearch(term);
    router.push(`/${locale}/search?q=${encodeURIComponent(term)}`);
  };

  const clearSearch = () => {
    setQuery('');
    setSearchQuery('');
    router.push(`/${locale}/search`);
  };

  const removeRecentSearch = (term: string) => {
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    localStorage.setItem('vual-recent-searches', JSON.stringify(updated));
  };

  const hasSearched = !!searchQuery;
  // When store-scoped, show store products as default view
  const showStoreProducts = !!storeId && !hasSearched;
  const displayProducts = hasSearched ? searchResults : storeProducts;
  const isLoadingAny = isLoading || isLoadingStore;

  return (
    <div className="min-h-screen">
      {/* Search Header */}
      <div className="sticky top-14 z-10 bg-white border-b border-[var(--color-line)] px-4 py-3">
        <form onSubmit={handleSearch} className="relative">
          <Search
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={storeId ? (locale === 'ja' ? 'このショップの商品を検索' : 'Search this store') : t('placeholder')}
            className="w-full h-11 pl-11 pr-10 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X size={18} className="text-[var(--color-text-label)]" />
            </button>
          )}
        </form>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {hasSearched || showStoreProducts ? (
          <>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[var(--color-text-body)]">
                {isLoadingAny ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    {locale === 'ja' ? '読み込み中...' : 'Loading...'}
                  </span>
                ) : hasSearched ? (
                  <>
                    {searchResults.length} {t('resultsFor')} &quot;{searchQuery}&quot;
                  </>
                ) : (
                  <>
                    {displayProducts.length} {locale === 'ja' ? '件の商品' : 'products'}
                  </>
                )}
              </p>
              <button className="p-1.5 rounded bg-[var(--color-bg-element)]">
                <Grid3X3 size={18} className="text-[var(--color-text-body)]" />
              </button>
            </div>

            {/* Products Grid */}
            {isLoadingAny ? (
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] bg-gray-200 rounded-lg mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-16 mb-1" />
                    <div className="h-4 bg-gray-200 rounded w-full mb-1" />
                    <div className="h-4 bg-gray-200 rounded w-12" />
                  </div>
                ))}
              </div>
            ) : displayProducts.length > 0 ? (
              <ProductGrid products={displayProducts} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Search size={48} className="text-[var(--color-text-label)] mb-4" />
                <p className="text-sm text-[var(--color-text-body)] text-center">
                  {hasSearched
                    ? (locale === 'ja' ? `「${searchQuery}」に一致する商品がありません` : `No products found for "${searchQuery}"`)
                    : (locale === 'ja' ? '商品が見つかりません' : 'No products found')}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-medium text-[var(--color-text-label)] mb-3">
                  {t('recentSearch')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleTermClick(term)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleTermClick(term); }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-element)] rounded-full text-sm text-[var(--color-text-body)] hover:bg-[var(--color-bg-input)] transition-colors cursor-pointer"
                    >
                      <Clock size={14} className="text-[var(--color-text-label)]" />
                      {term}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecentSearch(term);
                        }}
                        className="hover:text-[var(--color-error)]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state when no store and no searches */}
            {recentSearches.length === 0 && viewedProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <Search size={48} className="text-[var(--color-text-label)] mb-4" />
                <p className="text-sm text-[var(--color-text-body)]">
                  {locale === 'ja' ? '商品を検索してみましょう' : 'Search for products'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recently Viewed Products */}
      {viewedProducts.length > 0 && (
        <div className="border-t border-[var(--color-line)] px-4 py-6">
          <h3 className="text-sm font-medium text-[var(--color-title-active)] mb-3">
            {locale === 'ja' ? '最近チェックした商品' : 'Recently Viewed'}
          </h3>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
            {viewedProducts.map((p: any) => (
              <Link
                key={p.id}
                href={`/${locale}/product/${p.id}`}
                className="flex-shrink-0 w-[17vw]"
              >
                <div className="aspect-[3/4] bg-[var(--color-bg-element)] rounded-lg overflow-hidden border border-[var(--color-line)]">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)]" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

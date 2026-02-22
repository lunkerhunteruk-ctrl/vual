'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Search, X, Clock, TrendingUp, Grid3X3, Loader2 } from 'lucide-react';
import { ProductGrid } from '@/components/customer/home';
import { useProducts } from '@/lib/hooks/useProducts';

// These could be stored in localStorage for real recent searches
const defaultRecentSearches = ['Dress', 'Jacket', 'Shoes'];
const popularTerms = ['Trend', 'Dress', 'Bag', 'T-shirt', 'Beauty', 'Accessories'];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('customer.search');

  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>(defaultRecentSearches);

  // Fetch all products for search
  const { products: allProducts, isLoading } = useProducts({ limit: 100 });

  // Filter products based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !allProducts) return [];

    const lowerQuery = searchQuery.toLowerCase();
    return allProducts
      .filter(p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.brand?.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery) ||
        p.categories?.some(c => c.toLowerCase().includes(lowerQuery))
      )
      .map(p => ({
        id: p.id,
        name: p.name,
        brand: p.brand || '',
        price: `$${p.price}`,
        image: p.images?.[0]?.url,
      }));
  }, [searchQuery, allProducts]);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

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
            placeholder={t('placeholder')}
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
        {hasSearched ? (
          <>
            {/* Search Results Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[var(--color-text-body)]">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Searching...
                  </span>
                ) : (
                  <>
                    {searchResults.length} {t('resultsFor')} &quot;{searchQuery}&quot;
                  </>
                )}
              </p>
              <button className="p-1.5 rounded bg-[var(--color-bg-element)]">
                <Grid3X3 size={18} className="text-[var(--color-text-body)]" />
              </button>
            </div>

            {/* Results Grid */}
            {isLoading ? (
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
            ) : searchResults.length > 0 ? (
              <ProductGrid products={searchResults} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Search size={48} className="text-[var(--color-text-label)] mb-4" />
                <p className="text-sm text-[var(--color-text-body)] text-center">
                  No products found for &quot;{searchQuery}&quot;
                </p>
                <p className="text-xs text-[var(--color-text-label)] text-center mt-1">
                  Try different keywords or browse categories
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
                    <button
                      key={term}
                      onClick={() => handleTermClick(term)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-element)] rounded-full text-sm text-[var(--color-text-body)] hover:bg-[var(--color-bg-input)] transition-colors"
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
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Terms */}
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text-label)] mb-3">
                {t('popularSearchTerms')}
              </h3>
              <ul className="space-y-1">
                {popularTerms.map((term) => (
                  <li key={term}>
                    <button
                      onClick={() => handleTermClick(term)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] rounded-[var(--radius-md)] transition-colors"
                    >
                      <TrendingUp size={16} className="text-[var(--color-text-label)]" />
                      {term}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

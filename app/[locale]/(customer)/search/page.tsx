'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, X, Clock, TrendingUp, Grid3X3 } from 'lucide-react';
import { ProductGrid } from '@/components/customer/home';

const recentSearches = ['Dress', 'Collection', 'Nike'];
const popularTerms = ['Trend', 'Dress', 'Bag', 'T-shirt', 'Beauty', 'Accessories'];

// Mock search results
const mockResults = [
  { id: '1', name: 'Silk Slip Dress', brand: 'LAMEREI', price: '$189' },
  { id: '2', name: 'Cotton Summer Dress', brand: 'BASIC', price: '$89' },
  { id: '3', name: 'Floral Midi Dress', brand: 'KORIN', price: '$149' },
  { id: '4', name: 'Knit Sweater Dress', brand: 'MOHAN', price: '$179' },
];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('customer.search');

  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [hasSearched, setHasSearched] = useState(!!initialQuery);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      setHasSearched(true);
    }
  }, [initialQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setHasSearched(true);
      router.push(`/${locale}/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleTermClick = (term: string) => {
    setQuery(term);
    setHasSearched(true);
    router.push(`/${locale}/search?q=${encodeURIComponent(term)}`);
  };

  const clearSearch = () => {
    setQuery('');
    setHasSearched(false);
    router.push(`/${locale}/search`);
  };

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
        {hasSearched && query ? (
          <>
            {/* Search Results Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[var(--color-text-body)]">
                {mockResults.length} {t('resultsFor')} "{query}"
              </p>
              <button className="p-1.5 rounded bg-[var(--color-bg-element)]">
                <Grid3X3 size={18} className="text-[var(--color-text-body)]" />
              </button>
            </div>

            {/* Results Grid */}
            <ProductGrid products={mockResults} />
          </>
        ) : (
          <>
            {/* Recent Searches */}
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
                        // Remove from recent searches
                      }}
                      className="hover:text-[var(--color-error)]"
                    >
                      <X size={14} />
                    </button>
                  </button>
                ))}
              </div>
            </div>

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

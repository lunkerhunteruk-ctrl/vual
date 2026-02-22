'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, TrendingUp } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const recentSearches = ['Dress', 'Collection', 'Nike'];
const popularTerms = ['Trend', 'Dress', 'Bag', 'T-shirt', 'Beauty', 'Accessories'];

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('customer.search');
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/${locale}/search?q=${encodeURIComponent(query)}`);
      onClose();
    }
  };

  const handleTermClick = (term: string) => {
    router.push(`/${locale}/search?q=${encodeURIComponent(term)}`);
    onClose();
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // In a real app, this would update state/storage
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-white z-50"
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 p-4 border-b border-[var(--color-line)]">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('placeholder')}
                autoFocus
                className="w-full h-11 pl-11 pr-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </form>
            <button
              onClick={onClose}
              className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
            >
              <X size={24} className="text-[var(--color-title-active)]" />
            </button>
          </div>

          {/* Search Content */}
          <div className="p-4">
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
                      onClick={(e) => removeRecentSearch(term, e)}
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SearchModal;

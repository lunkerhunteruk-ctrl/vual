'use client';

import { useRef } from 'react';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { useProductCategories, buildFlatCategories } from '@/lib/hooks/useProductCategories';

interface CategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryTabs({ activeCategory, onCategoryChange }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const { slugs } = useProductCategories();
  const dynamicCategories = buildFlatCategories(slugs, locale);

  const allTab = { key: 'all', label: locale === 'ja' ? 'すべて' : 'All' };
  const categories = [allTab, ...dynamicCategories];

  if (categories.length <= 1) return null;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex items-center gap-6 overflow-x-auto scrollbar-hide px-4 py-3"
      >
        {categories.map((category) => (
          <button
            key={category.key}
            onClick={() => onCategoryChange(category.key)}
            className={`relative whitespace-nowrap text-sm font-medium transition-colors ${
              activeCategory === category.key
                ? 'text-[var(--color-title-active)]'
                : 'text-[var(--color-text-label)] hover:text-[var(--color-text-body)]'
            }`}
          >
            {category.label}
            {activeCategory === category.key && (
              <motion.div
                layoutId="categoryUnderline"
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[var(--color-title-active)]"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white to-transparent pointer-events-none" />
    </div>
  );
}

export default CategoryTabs;

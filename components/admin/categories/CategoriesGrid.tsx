'use client';

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  productCount: number;
  image?: string;
}

const defaultCategories: Category[] = [
  { id: '1', name: 'Electronics', productCount: 245 },
  { id: '2', name: 'Fashion', productCount: 189 },
  { id: '3', name: 'Accessories', productCount: 156 },
  { id: '4', name: 'Home & Kitchen', productCount: 98 },
  { id: '5', name: 'Sports & Outdoors', productCount: 76 },
  { id: '6', name: 'Toys & Games', productCount: 54 },
  { id: '7', name: 'Health & Fitness', productCount: 43 },
  { id: '8', name: 'Books', productCount: 32 },
];

interface CategoriesGridProps {
  onCategorySelect?: (category: Category) => void;
  selectedCategory?: string;
}

export function CategoriesGrid({ onCategorySelect, selectedCategory }: CategoriesGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
          Discover
        </h3>
        <button className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors">
          <ChevronRight size={18} className="text-[var(--color-text-label)]" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {defaultCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategorySelect?.(category)}
            className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] border transition-colors text-left ${
              selectedCategory === category.id
                ? 'border-[var(--color-accent)] bg-[var(--color-bg-element)]'
                : 'border-[var(--color-line)] hover:bg-[var(--color-bg-element)]'
            }`}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)] rounded-[var(--radius-md)] flex items-center justify-center">
              <span className="text-lg">
                {category.name === 'Electronics' && '📱'}
                {category.name === 'Fashion' && '👗'}
                {category.name === 'Accessories' && '👜'}
                {category.name === 'Home & Kitchen' && '🏠'}
                {category.name === 'Sports & Outdoors' && '⚽'}
                {category.name === 'Toys & Games' && '🎮'}
                {category.name === 'Health & Fitness' && '💪'}
                {category.name === 'Books' && '📚'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-title-active)] truncate">
                {category.name}
              </p>
              <p className="text-xs text-[var(--color-text-label)]">
                {category.productCount} products
              </p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export default CategoriesGrid;

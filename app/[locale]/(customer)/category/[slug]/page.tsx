'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowLeft, Grid3X3, List, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { ProductGrid } from '@/components/customer/home';
import { Pagination } from '@/components/ui';

// Mock products
const mockProducts = [
  { id: '1', name: 'Oversized Wool Blazer', brand: 'MOHAN', price: '$299' },
  { id: '2', name: 'Silk Slip Dress', brand: 'LAMEREI', price: '$189' },
  { id: '3', name: 'Cashmere Cardigan', brand: 'KORIN', price: '$249' },
  { id: '4', name: 'Leather Tote Bag', brand: 'MERAKI', price: '$399' },
  { id: '5', name: 'Cotton T-Shirt', brand: 'BASIC', price: '$49' },
  { id: '6', name: 'Denim Wide Pants', brand: 'KORIN', price: '$129' },
  { id: '7', name: 'Knit Sweater', brand: 'MOHAN', price: '$159' },
  { id: '8', name: 'Ankle Boots', brand: 'MERAKI', price: '$349' },
];

const filterTags = ['Women', 'All apparel'];

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('customer.category');

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState(filterTags);

  const removeFilter = (filter: string) => {
    setActiveFilters(prev => prev.filter(f => f !== filter));
  };

  const categoryName = typeof params.slug === 'string'
    ? params.slug.charAt(0).toUpperCase() + params.slug.slice(1)
    : 'Category';

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
              4,500 {categoryName.toUpperCase()}
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
        <ProductGrid products={mockProducts} />
      </div>

      {/* Pagination */}
      <div className="px-4 py-4">
        <Pagination
          currentPage={currentPage}
          totalPages={10}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}

'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from '@/components/customer/home';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: string;
  image?: string;
}

interface RelatedProductsProps {
  products: Product[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  const t = useTranslations('customer.product');
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="py-8">
      <div className="flex items-center justify-between px-4 mb-4">
        <h2 className="text-sm font-medium tracking-[0.15em] text-[var(--color-title-active)] uppercase">
          {t('youMayAlsoLike')}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full bg-[var(--color-bg-element)] hover:bg-[var(--color-bg-input)] transition-colors"
          >
            <ChevronLeft size={18} className="text-[var(--color-text-body)]" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full bg-[var(--color-bg-element)] hover:bg-[var(--color-bg-input)] transition-colors"
          >
            <ChevronRight size={18} className="text-[var(--color-text-body)]" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 pb-2"
      >
        {products.map((product) => (
          <div key={product.id} className="flex-shrink-0 w-40">
            <ProductCard {...product} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default RelatedProducts;

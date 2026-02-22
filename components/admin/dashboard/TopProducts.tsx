'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  orders: number;
}

const mockProducts: Product[] = [
  { id: '1', name: 'Oversized Blazer', price: '$299.00', image: '/placeholder-product.jpg', orders: 156 },
  { id: '2', name: 'Silk Dress', price: '$189.00', image: '/placeholder-product.jpg', orders: 124 },
  { id: '3', name: 'Wool Cardigan', price: '$149.00', image: '/placeholder-product.jpg', orders: 98 },
  { id: '4', name: 'Leather Bag', price: '$399.00', image: '/placeholder-product.jpg', orders: 87 },
];

export function TopProducts() {
  const t = useTranslations('admin.dashboard');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
          {t('topProducts')}
        </h3>
      </div>

      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
        />
        <input
          type="text"
          placeholder="Search products..."
          className="w-full h-9 pl-9 pr-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      <div className="space-y-3">
        {mockProducts.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-3 p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] flex items-center justify-center overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-[var(--color-bg-input)] to-[var(--color-bg-element)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-title-active)] truncate">
                {product.name}
              </p>
              <p className="text-sm text-[var(--color-accent)]">{product.price}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--color-text-label)]">{product.orders} orders</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--color-line)]">
        <button className="w-full py-2 text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors">
          {t('allProduct')} →
        </button>
      </div>
    </motion.div>
  );
}

export default TopProducts;

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Plus, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui';

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
}

const availableProducts: Product[] = [
  { id: '1', name: 'Oversized Blazer', price: '$299', image: '' },
  { id: '2', name: 'Silk Dress', price: '$189', image: '' },
  { id: '3', name: 'Wool Cardigan', price: '$149', image: '' },
  { id: '4', name: 'Leather Bag', price: '$399', image: '' },
];

export function ProductCasting() {
  const t = useTranslations('admin.live');
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([
    availableProducts[0],
    availableProducts[1],
  ]);

  const removeProduct = (id: string) => {
    setFeaturedProducts(prev => prev.filter(p => p.id !== id));
  };

  const addProduct = (product: Product) => {
    if (!featuredProducts.find(p => p.id === product.id)) {
      setFeaturedProducts(prev => [...prev, product]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
          {t('productCastingArea')}
        </h3>
        <Button variant="ghost" size="sm" leftIcon={<Plus size={14} />}>
          {t('addProduct')}
        </Button>
      </div>

      <p className="text-xs text-[var(--color-text-label)] mb-4">
        {t('productsToFeature')}
      </p>

      {/* Product List */}
      <div className="space-y-2">
        {featuredProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-3 p-3 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] group"
          >
            <button className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical size={16} className="text-[var(--color-text-label)]" />
            </button>

            <div className="w-12 h-12 bg-gradient-to-br from-[var(--color-bg-input)] to-[var(--color-line)] rounded-[var(--radius-sm)]" />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-title-active)] truncate">
                {product.name}
              </p>
              <p className="text-xs text-[var(--color-accent)]">{product.price}</p>
            </div>

            <span className="text-xs text-[var(--color-text-label)] px-2 py-1 bg-white rounded-full">
              #{index + 1}
            </span>

            <button
              onClick={() => removeProduct(product.id)}
              className="p-1 rounded-full hover:bg-[var(--color-bg-input)] transition-colors opacity-0 group-hover:opacity-100"
            >
              <X size={14} className="text-[var(--color-text-label)]" />
            </button>
          </motion.div>
        ))}

        {featuredProducts.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-[var(--color-text-label)]">
              No products added yet
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default ProductCasting;

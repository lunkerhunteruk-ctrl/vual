'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Check } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: string;
  category: string;
  image: string;
}

const mockProducts: Product[] = [
  { id: '1', name: 'Oversized Blazer', price: '$299', category: 'Outer', image: '' },
  { id: '2', name: 'Silk Dress', price: '$189', category: 'Dress', image: '' },
  { id: '3', name: 'Wool Cardigan', price: '$149', category: 'Knitwear', image: '' },
  { id: '4', name: 'Leather Bag', price: '$399', category: 'Bag', image: '' },
  { id: '5', name: 'Cotton T-Shirt', price: '$49', category: 'Tops', image: '' },
  { id: '6', name: 'Denim Jeans', price: '$129', category: 'Pants', image: '' },
  { id: '7', name: 'Cashmere Sweater', price: '$249', category: 'Knitwear', image: '' },
  { id: '8', name: 'Leather Boots', price: '$349', category: 'Shoes', image: '' },
];

interface ItemSelectorProps {
  selectedItems: string[];
  onSelectionChange: (items: string[]) => void;
}

export function ItemSelector({ selectedItems, onSelectionChange }: ItemSelectorProps) {
  const t = useTranslations('admin.studio');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = mockProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleItem = (id: string) => {
    if (selectedItems.includes(id)) {
      onSelectionChange(selectedItems.filter(item => item !== id));
    } else {
      onSelectionChange([...selectedItems, id]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5 h-full"
    >
      <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-4">
        {t('selectItems')}
      </h3>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchProducts')}
          className="w-full h-10 pl-9 pr-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      {/* Selected Count */}
      {selectedItems.length > 0 && (
        <div className="mb-4 px-3 py-2 bg-[var(--color-bg-element)] rounded-[var(--radius-md)]">
          <span className="text-sm text-[var(--color-accent)] font-medium">
            {t('selected')}: {selectedItems.length} {t('items')}
          </span>
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
        {filteredProducts.map((product) => {
          const isSelected = selectedItems.includes(product.id);

          return (
            <motion.button
              key={product.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleItem(product.id)}
              className={`relative p-2 rounded-[var(--radius-md)] text-left transition-all ${
                isSelected
                  ? 'bg-[var(--color-bg-element)] ring-2 ring-[var(--color-accent)]'
                  : 'bg-white border border-[var(--color-line)] hover:border-[var(--color-accent)]'
              }`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-[var(--color-accent)] rounded-full flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}

              {/* Product Image */}
              <div className="aspect-square bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)] rounded-[var(--radius-sm)] mb-2" />

              {/* Product Info */}
              <p className="text-xs font-medium text-[var(--color-title-active)] truncate">
                {product.name}
              </p>
              <p className="text-xs text-[var(--color-text-label)]">{product.category}</p>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

export default ItemSelector;

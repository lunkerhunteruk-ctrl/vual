'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Upload, Plus, X } from 'lucide-react';
import { Input, Select, Button } from '@/components/ui';

const categoryOptions = [
  { value: 'apparel', label: 'Apparel' },
  { value: 'dress', label: 'Dress' },
  { value: 'outer', label: 'Outer' },
  { value: 'knitwear', label: 'Knitwear' },
  { value: 'pants', label: 'Pants' },
  { value: 'bag', label: 'Bag' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'accessories', label: 'Accessories' },
];

const stockStatusOptions = [
  { value: 'in-stock', label: 'In Stock' },
  { value: 'out-of-stock', label: 'Out of Stock' },
  { value: 'limited', label: 'Limited' },
];

const colorOptions = [
  { value: 'black', color: '#000000' },
  { value: 'white', color: '#FFFFFF' },
  { value: 'gray', color: '#6B7280' },
  { value: 'red', color: '#EF4444' },
  { value: 'blue', color: '#3B82F6' },
  { value: 'green', color: '#10B981' },
  { value: 'brown', color: '#92400E' },
  { value: 'pink', color: '#EC4899' },
];

const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export function ProductForm() {
  const t = useTranslations('admin.products');
  const [selectedColors, setSelectedColors] = useState<string[]>(['black']);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['M']);
  const [images, setImages] = useState<string[]>([]);
  const [taxIncluded, setTaxIncluded] = useState(true);
  const [unlimitedStock, setUnlimitedStock] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);

  const toggleColor = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color)
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Basic Details & Pricing */}
      <div className="space-y-6">
        {/* Basic Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
        >
          <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-4">
            {t('basicDetails')}
          </h3>
          <div className="space-y-4">
            <Input
              label={t('productName')}
              placeholder="Enter product name"
            />
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-body)] mb-1.5">
                {t('productDescription')}
              </label>
              <textarea
                rows={4}
                placeholder="Enter product description"
                className="w-full px-4 py-2.5 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
              />
            </div>
          </div>
        </motion.div>

        {/* Pricing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
        >
          <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-4">
            {t('pricing')}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('productPrice')}
                type="number"
                placeholder="0.00"
                leftIcon={<span className="text-[var(--color-text-label)]">$</span>}
              />
              <Select
                label="Currency"
                options={[
                  { value: 'usd', label: '🇺🇸 USD' },
                  { value: 'jpy', label: '🇯🇵 JPY' },
                  { value: 'eur', label: '🇪🇺 EUR' },
                ]}
              />
            </div>
            <Input
              label={`${t('discountedPrice')} (${t('optional')})`}
              type="number"
              placeholder="0.00"
              leftIcon={<span className="text-[var(--color-text-label)]">$</span>}
            />
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-body)] mb-2">
                {t('taxIncluded')}
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tax"
                    checked={taxIncluded}
                    onChange={() => setTaxIncluded(true)}
                    className="w-4 h-4 text-[var(--color-accent)]"
                  />
                  <span className="text-sm text-[var(--color-text-body)]">{t('yes')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tax"
                    checked={!taxIncluded}
                    onChange={() => setTaxIncluded(false)}
                    className="w-4 h-4 text-[var(--color-accent)]"
                  />
                  <span className="text-sm text-[var(--color-text-body)]">{t('no')}</span>
                </label>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Inventory */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
        >
          <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-4">
            {t('inventory')}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('stockQuantity')}
                type="number"
                placeholder="0"
                disabled={unlimitedStock}
              />
              <Select
                label={t('stockStatus')}
                options={stockStatusOptions}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={unlimitedStock}
                onChange={(e) => setUnlimitedStock(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--color-accent)]"
              />
              <span className="text-sm text-[var(--color-text-body)]">{t('unlimited')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isHighlighted}
                onChange={(e) => setIsHighlighted(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--color-accent)]"
              />
              <span className="text-sm text-[var(--color-text-body)]">{t('highlightProduct')}</span>
            </label>
          </div>
        </motion.div>
      </div>

      {/* Right Column - Images & Categories */}
      <div className="space-y-6">
        {/* Product Images */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
        >
          <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-4">
            {t('uploadProductImage')}
          </h3>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-[var(--color-line)] rounded-[var(--radius-md)] p-8 text-center hover:border-[var(--color-accent)] transition-colors cursor-pointer mb-4">
            <Upload size={32} className="mx-auto mb-3 text-[var(--color-text-label)]" />
            <p className="text-sm text-[var(--color-text-body)] mb-1">
              Drag & Drop your images here
            </p>
            <p className="text-xs text-[var(--color-text-label)]">
              or <span className="text-[var(--color-accent)]">{t('browse')}</span> to upload
            </p>
          </div>

          {/* Image Thumbnails */}
          <div className="flex gap-3">
            {images.map((img, index) => (
              <div
                key={index}
                className="relative w-20 h-20 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] overflow-hidden"
              >
                <button className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
                  <X size={12} className="text-white" />
                </button>
              </div>
            ))}
            <button className="w-20 h-20 border-2 border-dashed border-[var(--color-line)] rounded-[var(--radius-md)] flex items-center justify-center hover:border-[var(--color-accent)] transition-colors">
              <Plus size={20} className="text-[var(--color-text-label)]" />
            </button>
          </div>
        </motion.div>

        {/* Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
        >
          <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-4">
            {t('categories')}
          </h3>
          <div className="space-y-4">
            <Select
              label={t('productCategories')}
              options={categoryOptions}
              placeholder={t('selectCategory')}
            />
            <Input
              label={t('productTag')}
              placeholder="Enter tags separated by comma"
            />
          </div>
        </motion.div>

        {/* Colors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
        >
          <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-4">
            Colors
          </h3>
          <div className="flex flex-wrap gap-3">
            {colorOptions.map((color) => (
              <button
                key={color.value}
                onClick={() => toggleColor(color.value)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedColors.includes(color.value)
                    ? 'border-[var(--color-accent)] scale-110'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: color.color }}
              />
            ))}
          </div>
        </motion.div>

        {/* Sizes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
        >
          <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-4">
            Sizes
          </h3>
          <div className="flex flex-wrap gap-2">
            {sizeOptions.map((size) => (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                className={`px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors ${
                  selectedSizes.includes(size)
                    ? 'bg-[var(--color-title-active)] text-white'
                    : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-input)]'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default ProductForm;

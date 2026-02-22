'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Input, Select } from '@/components/ui';
import { useCurrency } from '@/lib/hooks';
import { ProductImageUpload } from './ProductImageUpload';
import { ProductVariants, type ProductImage, type ProductVariant, type VariantOption } from './ProductVariants';

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

export function ProductForm() {
  const t = useTranslations('admin.products');
  const { defaultCurrency, symbol, options: currencyOptions } = useCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency.toLowerCase());
  const [taxIncluded, setTaxIncluded] = useState(true);
  const [isHighlighted, setIsHighlighted] = useState(false);

  // Image state
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imageColorMap, setImageColorMap] = useState<Record<string, string>>({});

  // Variant state
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  // Get the current currency symbol
  const getCurrentSymbol = () => {
    const symbols: Record<string, string> = { usd: '$', jpy: '¥', eur: '€', gbp: '£', krw: '₩', cny: '¥' };
    return symbols[selectedCurrency] || '$';
  };

  // Get color options for image linking
  const colorOptions = variantOptions.find(o => o.name === 'color')?.values || [];

  // Check if we have variants
  const hasVariants = variants.length > 0 && (colorOptions.length > 0 || variantOptions.find(o => o.name === 'size')?.values.length);

  return (
    <div className="space-y-6">
      {/* Two column layout for basic info */}
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
                placeholder={t('enterProductName') || 'Enter product name'}
              />
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-body)] mb-1.5">
                  {t('productDescription')}
                </label>
                <textarea
                  rows={4}
                  placeholder={t('enterProductDescription') || 'Enter product description'}
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
                  placeholder={selectedCurrency === 'jpy' || selectedCurrency === 'krw' ? '0' : '0.00'}
                  leftIcon={<span className="text-[var(--color-text-label)]">{getCurrentSymbol()}</span>}
                />
                <Select
                  label={t('currency')}
                  options={currencyOptions}
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                />
              </div>
              <Input
                label={`${t('discountedPrice')} (${t('optional')})`}
                type="number"
                placeholder={selectedCurrency === 'jpy' || selectedCurrency === 'krw' ? '0' : '0.00'}
                leftIcon={<span className="text-[var(--color-text-label)]">{getCurrentSymbol()}</span>}
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

          {/* Inventory (only if no variants) */}
          {!hasVariants && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
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
                  />
                  <Select
                    label={t('stockStatus')}
                    options={stockStatusOptions}
                  />
                </div>
                <Input
                  label="SKU"
                  placeholder={t('enterSKU') || 'Enter SKU'}
                />
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
          )}
        </div>

        {/* Right Column - Images & Categories */}
        <div className="space-y-6">
          {/* Product Images with Color Linking */}
          <ProductImageUpload
            images={images}
            onImagesChange={setImages}
            colorOptions={colorOptions}
            imageColorMap={imageColorMap}
            onImageColorMapChange={setImageColorMap}
          />

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
                placeholder={t('enterTags') || 'Enter tags separated by comma'}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Full Width - Variants Module */}
      <ProductVariants
        images={images}
        variants={variants}
        options={variantOptions}
        onVariantsChange={setVariants}
        onOptionsChange={setVariantOptions}
      />

      {/* Highlight option when variants exist */}
      {hasVariants && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isHighlighted}
              onChange={(e) => setIsHighlighted(e.target.checked)}
              className="w-4 h-4 rounded text-[var(--color-accent)]"
            />
            <span className="text-sm text-[var(--color-text-body)]">{t('highlightProduct')}</span>
          </label>
        </motion.div>
      )}
    </div>
  );
}

export default ProductForm;

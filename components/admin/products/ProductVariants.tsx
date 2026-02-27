'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Image as ImageIcon, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { Input, Button } from '@/components/ui';
import { useCurrency } from '@/lib/hooks';
import { generateSku } from '@/lib/utils/sku-generator';

export interface ProductImage {
  id: string;
  url: string;
  file?: File;
}

export interface ProductVariant {
  id: string;
  color: string | null;
  size: string | null;
  sku: string;
  price: number | null;
  stock: number;
  imageId: string | null;
}

export interface VariantOption {
  name: string;
  values: string[];
}

interface ProductVariantsProps {
  images: ProductImage[];
  variants: ProductVariant[];
  options: VariantOption[];
  imageColorMap: Record<string, string>;
  basePrice?: number;
  brandSlug?: string;
  category?: string;
  onVariantsChange: (variants: ProductVariant[]) => void;
  onOptionsChange: (options: VariantOption[]) => void;
}

export function ProductVariants({
  images,
  variants,
  options,
  imageColorMap,
  basePrice,
  brandSlug = '',
  category = '',
  onVariantsChange,
  onOptionsChange,
}: ProductVariantsProps) {
  const t = useTranslations('admin.products');
  const { symbol } = useCurrency();
  const [showVariants, setShowVariants] = useState(true);
  const [newColorValue, setNewColorValue] = useState('');
  const [newSizeValue, setNewSizeValue] = useState('');

  // Filter out images with invalid URLs
  const validImages = images.filter(img => {
    if (!img.url) return false;
    if (img.url.startsWith('http')) return true;
    if (img.url.startsWith('blob:') && img.file) return true;
    return false;
  });

  // Helper function to find image for a variant based on color
  const getImageForVariant = (variant: ProductVariant): ProductImage | null => {
    // First check if variant has explicit imageId
    if (variant.imageId) {
      const img = validImages.find(i => i.id === variant.imageId);
      if (img) return img;
    }

    // Otherwise, look up by color from imageColorMap
    if (variant.color) {
      // Find image ID that has this color assigned
      const imageId = Object.entries(imageColorMap).find(
        ([, color]) => color === variant.color
      )?.[0];

      if (imageId) {
        const img = validImages.find(i => i.id === imageId);
        if (img) return img;
      }
    }

    return null;
  };

  // Get current color and size options
  const colorOption = options.find(o => o.name === 'color') || { name: 'color', values: [] };
  const sizeOption = options.find(o => o.name === 'size') || { name: 'size', values: [] };

  // Add a color value
  const addColor = () => {
    if (newColorValue.trim() && !colorOption.values.includes(newColorValue.trim())) {
      const newColors = [...colorOption.values, newColorValue.trim()];
      updateOption('color', newColors);
      setNewColorValue('');
    }
  };

  // Add a size value
  const addSize = () => {
    if (newSizeValue.trim() && !sizeOption.values.includes(newSizeValue.trim())) {
      const newSizes = [...sizeOption.values, newSizeValue.trim()];
      updateOption('size', newSizes);
      setNewSizeValue('');
    }
  };

  // Remove a color value
  const removeColor = (color: string) => {
    const newColors = colorOption.values.filter(c => c !== color);
    updateOption('color', newColors);
  };

  // Remove a size value
  const removeSize = (size: string) => {
    const newSizes = sizeOption.values.filter(s => s !== size);
    updateOption('size', newSizes);
  };

  // Update an option
  const updateOption = (name: string, values: string[]) => {
    const existingIndex = options.findIndex(o => o.name === name);
    let newOptions: VariantOption[];

    if (existingIndex >= 0) {
      newOptions = options.map((o, i) => i === existingIndex ? { ...o, values } : o);
    } else {
      newOptions = [...options, { name, values }];
    }

    onOptionsChange(newOptions);
  };

  // Generate variants based on options
  useEffect(() => {
    const colors = colorOption.values.length > 0 ? colorOption.values : [null];
    const sizes = sizeOption.values.length > 0 ? sizeOption.values : [null];

    const newVariants: ProductVariant[] = [];
    let index = 0;

    colors.forEach(color => {
      sizes.forEach(size => {
        // Check if variant already exists
        const existing = variants.find(
          v => v.color === color && v.size === size
        );

        if (existing) {
          newVariants.push(existing);
        } else {
          newVariants.push({
            id: `${color || 'default'}-${size || 'default'}-${Date.now()}`,
            color,
            size,
            sku: generateSku({ brandSlug, category, color, size, index }),
            price: null,
            stock: 0,
            imageId: null,
          });
        }
        index++;
      });
    });

    // Only update if variants actually changed
    if (JSON.stringify(newVariants) !== JSON.stringify(variants)) {
      onVariantsChange(newVariants);
    }
  }, [colorOption.values, sizeOption.values, brandSlug, category]);

  // Update a single variant
  const updateVariant = (variantId: string, updates: Partial<ProductVariant>) => {
    const newVariants = variants.map(v =>
      v.id === variantId ? { ...v, ...updates } : v
    );
    onVariantsChange(newVariants);
  };

  // Check if we have any real variants (not just the default)
  const hasVariants = colorOption.values.length > 0 || sizeOption.values.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setShowVariants(!showVariants)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
            {t('variants') || 'Variants'}
          </h3>
          <p className="text-xs text-[var(--color-text-label)] mt-1">
            {t('variantsDescription') || 'Add options like color and size to create variants'}
          </p>
        </div>
        {showVariants ? (
          <ChevronUp size={20} className="text-[var(--color-text-label)]" />
        ) : (
          <ChevronDown size={20} className="text-[var(--color-text-label)]" />
        )}
      </button>

      <AnimatePresence>
        {showVariants && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[var(--color-line)]"
          >
            <div className="p-5 space-y-6">
              {/* Color Options */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-body)] mb-2">
                  {t('colors') || 'Colors'}
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {colorOption.values.map(color => (
                    <span
                      key={color}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-bg-element)] rounded-full text-sm text-[var(--color-text-body)]"
                    >
                      {color}
                      <button
                        onClick={() => removeColor(color)}
                        className="p-0.5 hover:bg-[var(--color-bg-input)] rounded-full transition-colors"
                      >
                        <X size={12} className="text-[var(--color-text-label)]" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newColorValue}
                    onChange={(e) => setNewColorValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                    placeholder={t('addColor') || 'Add color (e.g., Black, White)'}
                    className="flex-1"
                  />
                  <Button variant="secondary" size="md" onClick={addColor}>
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              {/* Size Options */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-body)] mb-2">
                  {t('sizes') || 'Sizes'}
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {sizeOption.values.map(size => (
                    <span
                      key={size}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-bg-element)] rounded-full text-sm text-[var(--color-text-body)]"
                    >
                      {size}
                      <button
                        onClick={() => removeSize(size)}
                        className="p-0.5 hover:bg-[var(--color-bg-input)] rounded-full transition-colors"
                      >
                        <X size={12} className="text-[var(--color-text-label)]" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newSizeValue}
                    onChange={(e) => setNewSizeValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
                    placeholder={t('addSize') || 'Add size (e.g., S, M, L, XL)'}
                    className="flex-1"
                  />
                  <Button variant="secondary" size="md" onClick={addSize}>
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              {/* Variants Table */}
              {hasVariants && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-body)] mb-3">
                    {t('variantsList') || 'Variants'} ({variants.length})
                  </label>
                  <div className="border border-[var(--color-line)] rounded-[var(--radius-md)] overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[var(--color-bg-element)] text-xs font-medium text-[var(--color-text-label)] uppercase">
                      <div className="col-span-1">{t('image') || 'Image'}</div>
                      {colorOption.values.length > 0 && (
                        <div className="col-span-2">{t('color') || 'Color'}</div>
                      )}
                      {sizeOption.values.length > 0 && (
                        <div className="col-span-1">{t('size') || 'Size'}</div>
                      )}
                      <div className="col-span-3">SKU</div>
                      <div className="col-span-2">{t('price') || 'Price'}</div>
                      <div className="col-span-2">{t('stock') || 'Stock'}</div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-[var(--color-line)]">
                      {variants.map(variant => (
                        <div
                          key={variant.id}
                          className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-[var(--color-bg-element)] transition-colors"
                        >
                          {/* Image Selector */}
                          <div className="col-span-1">
                            <div className="relative">
                              <button
                                className="w-10 h-10 rounded-[var(--radius-sm)] border border-[var(--color-line)] overflow-hidden flex items-center justify-center bg-[var(--color-bg-element)] hover:border-[var(--color-accent)] transition-colors"
                              >
                                {getImageForVariant(variant) ? (
                                  <img
                                    src={getImageForVariant(variant)!.url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon size={16} className="text-[var(--color-text-label)]" />
                                )}
                              </button>
                              {validImages.length > 0 && (
                                <select
                                  value={variant.imageId || ''}
                                  onChange={(e) => updateVariant(variant.id, { imageId: e.target.value || null })}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                >
                                  <option value="">{getImageForVariant(variant) ? 'カラーから自動' : '画像を選択'}</option>
                                  {validImages.map((img, idx) => (
                                    <option key={img.id} value={img.id}>
                                      画像 {idx + 1}{imageColorMap[img.id] ? ` (${imageColorMap[img.id]})` : ''}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>

                          {/* Color */}
                          {colorOption.values.length > 0 && (
                            <div className="col-span-2 text-sm text-[var(--color-text-body)]">
                              {variant.color}
                            </div>
                          )}

                          {/* Size */}
                          {sizeOption.values.length > 0 && (
                            <div className="col-span-1 text-sm text-[var(--color-text-body)]">
                              {variant.size}
                            </div>
                          )}

                          {/* SKU */}
                          <div className="col-span-3">
                            <input
                              type="text"
                              value={variant.sku}
                              onChange={(e) => updateVariant(variant.id, { sku: e.target.value })}
                              className="w-full h-8 px-2 text-sm bg-transparent border border-[var(--color-line)] rounded-[var(--radius-sm)] text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)]"
                            />
                          </div>

                          {/* Price */}
                          <div className="col-span-2">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-label)]">
                                {symbol}
                              </span>
                              <input
                                type="number"
                                value={variant.price ?? basePrice ?? ''}
                                onChange={(e) => {
                                  const newPrice = e.target.value ? Number(e.target.value) : null;
                                  // If price matches base price, set to null (use base)
                                  if (newPrice === basePrice) {
                                    updateVariant(variant.id, { price: null });
                                  } else {
                                    updateVariant(variant.id, { price: newPrice });
                                  }
                                }}
                                className={`w-full h-8 pl-5 pr-2 text-sm bg-transparent border border-[var(--color-line)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--color-accent)] ${
                                  variant.price === null
                                    ? 'text-[var(--color-text-placeholder)]'
                                    : 'text-[var(--color-text-body)]'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Stock */}
                          <div className="col-span-2">
                            <input
                              type="number"
                              value={variant.stock}
                              onChange={(e) => updateVariant(variant.id, { stock: Number(e.target.value) || 0 })}
                              min="0"
                              className="w-full h-8 px-2 text-sm bg-transparent border border-[var(--color-line)] rounded-[var(--radius-sm)] text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ProductVariants;

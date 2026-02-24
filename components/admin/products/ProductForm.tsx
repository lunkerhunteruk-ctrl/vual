'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Input, Select } from '@/components/ui';
import { useCurrency } from '@/lib/hooks';
import { ProductImageUpload } from './ProductImageUpload';
import { ProductModelImages } from './ProductModelImages';
import { ProductVariants, type ProductImage, type ProductVariant, type VariantOption } from './ProductVariants';
import { SizeSpecTable, type SizeSpec } from './SizeSpecTable';
import { CategorySelector } from './CategorySelector';

const stockStatusOptions = [
  { value: 'in-stock', label: 'In Stock' },
  { value: 'out-of-stock', label: 'Out of Stock' },
  { value: 'limited', label: 'Limited' },
];

export interface ProductFormData {
  name: string;
  description: string;
  category: string;
  tags: string[];
  price: number;
  discountedPrice: number | null;
  currency: string;
  taxIncluded: boolean;
  isHighlighted: boolean;
  sizeSpecs: SizeSpec;
  images: { url: string; color: string | null }[];
  variants: { color: string | null; size: string | null; sku: string; stock: number; priceOverride: number | null }[];
  sku?: string;
  stock?: number;
  brandId?: string | null;
}

export interface ProductFormRef {
  getData: () => ProductFormData;
  getDataWithUpload: () => Promise<ProductFormData>;
  validate: () => { valid: boolean; errors: string[] };
  setData: (data: Partial<ProductFormData> & { id?: string }) => void;
}

interface ProductFormProps {
  productId?: string;
  initialData?: Partial<ProductFormData> & {
    id?: string;
    base_price?: number;
    discounted_price?: number;
    tax_included?: boolean;
    is_highlighted?: boolean;
    size_specs?: any;
    brand_id?: string;
    product_images?: { id: string; url: string; color?: string; is_primary?: boolean }[];
    product_variants?: { id: string; color?: string; size?: string; sku?: string; stock: number; price_override?: number }[];
  };
}

export const ProductForm = forwardRef<ProductFormRef, ProductFormProps>(function ProductForm({ productId, initialData }, ref) {
  const t = useTranslations('admin.products');
  const { defaultCurrency, options: currencyOptions } = useCurrency();

  // Form state - initialize from initialData if provided
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');
  const [price, setPrice] = useState(
    (initialData?.price || initialData?.base_price)?.toString() || ''
  );
  const [discountedPrice, setDiscountedPrice] = useState(
    (initialData?.discountedPrice || initialData?.discounted_price)?.toString() || ''
  );
  const [selectedCurrency, setSelectedCurrency] = useState(
    initialData?.currency?.toLowerCase() || defaultCurrency.toLowerCase()
  );
  const [taxIncluded, setTaxIncluded] = useState(
    initialData?.taxIncluded ?? initialData?.tax_included ?? true
  );
  const [isHighlighted, setIsHighlighted] = useState(
    initialData?.isHighlighted ?? initialData?.is_highlighted ?? false
  );
  const [sku, setSku] = useState(initialData?.sku || '');
  const [stockQuantity, setStockQuantity] = useState(initialData?.stock?.toString() || '');
  const [stockStatus, setStockStatus] = useState('in-stock');

  // Brand state
  const [brandId, setBrandId] = useState<string | null>(initialData?.brandId || initialData?.brand_id || null);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  // Fetch brands
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await fetch('/api/brands');
        const data = await res.json();
        if (data.brands) {
          setBrands(data.brands.map((b: any) => ({ id: b.id, name: b.name })));
        }
      } catch (err) {
        console.error('Failed to fetch brands:', err);
      }
    };
    fetchBrands();
  }, []);

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBrandName.trim() }),
      });
      const data = await res.json();
      if (data.brand) {
        setBrands(prev => [...prev, { id: data.brand.id, name: data.brand.name }]);
        setBrandId(data.brand.id);
        setNewBrandName('');
        setIsCreatingBrand(false);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error('Failed to create brand:', err);
    }
  };

  // Image state - initialize from initialData
  const initImages: ProductImage[] = (initialData?.product_images || initialData?.images || []).map((img, idx) => ({
    id: `img-${idx}`,
    url: typeof img === 'string' ? img : img.url,
    isPrimary: typeof img === 'object' && 'is_primary' in img ? img.is_primary : idx === 0,
  }));
  const [images, setImages] = useState<ProductImage[]>(initImages);

  const initColorMap: Record<string, string> = {};
  (initialData?.product_images || []).forEach((img, idx) => {
    if (typeof img === 'object' && img.color) {
      initColorMap[`img-${idx}`] = img.color;
    }
  });
  const [imageColorMap, setImageColorMap] = useState<Record<string, string>>(initColorMap);

  // Variant state - initialize from initialData
  const initVariants: ProductVariant[] = (initialData?.product_variants || initialData?.variants || []).map((v: any, idx) => ({
    id: `var-${idx}`,
    color: v?.color || null,
    size: v?.size || null,
    sku: v?.sku || '',
    stock: v?.stock || 0,
    price: v?.priceOverride || v?.price_override || null,
    imageId: null,
  }));
  const [variants, setVariants] = useState<ProductVariant[]>(initVariants);

  // Extract variant options from initial variants
  const initOptions: VariantOption[] = [];
  const colors = [...new Set(initVariants.map(v => v.color).filter(Boolean))] as string[];
  const sizes = [...new Set(initVariants.map(v => v.size).filter(Boolean))] as string[];
  if (colors.length > 0) {
    initOptions.push({ name: 'color', values: colors });
  }
  if (sizes.length > 0) {
    initOptions.push({ name: 'size', values: sizes });
  }
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>(initOptions);

  // Size spec state
  const [sizeSpecs, setSizeSpecs] = useState<SizeSpec>(
    initialData?.sizeSpecs || initialData?.size_specs || { columns: [], rows: [] }
  );

  // Helper function to upload a single image
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'products');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }
    return result.url;
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getData: () => {
      const formImages = images.map(img => ({
        url: img.url,
        color: imageColorMap[img.id] || null,
      }));

      const formVariants = variants
        .filter(v => v.color || v.size) // Only include real variants
        .map(v => ({
          color: v.color,
          size: v.size,
          sku: v.sku,
          stock: v.stock,
          priceOverride: v.price,
        }));

      return {
        name,
        description,
        category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        price: parseInt(price) || 0,
        discountedPrice: discountedPrice ? parseInt(discountedPrice) : null,
        currency: selectedCurrency,
        taxIncluded,
        isHighlighted,
        sizeSpecs,
        images: formImages,
        variants: formVariants,
        sku: sku || undefined,
        stock: stockQuantity ? parseInt(stockQuantity) : undefined,
        brandId,
      };
    },
    getDataWithUpload: async () => {
      // Upload any new images (those with file property)
      const uploadedImages = await Promise.all(
        images.map(async (img) => {
          // If image has a file, it needs to be uploaded
          if (img.file) {
            try {
              const uploadedUrl = await uploadImage(img.file);
              return {
                url: uploadedUrl,
                color: imageColorMap[img.id] || null,
              };
            } catch (error) {
              console.error('Image upload failed:', error);
              // Return original URL as fallback
              return {
                url: img.url,
                color: imageColorMap[img.id] || null,
              };
            }
          }
          // Already uploaded image
          return {
            url: img.url,
            color: imageColorMap[img.id] || null,
          };
        })
      );

      const formVariants = variants
        .filter(v => v.color || v.size)
        .map(v => ({
          color: v.color,
          size: v.size,
          sku: v.sku,
          stock: v.stock,
          priceOverride: v.price,
        }));

      return {
        name,
        description,
        category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        price: parseInt(price) || 0,
        discountedPrice: discountedPrice ? parseInt(discountedPrice) : null,
        currency: selectedCurrency,
        taxIncluded,
        isHighlighted,
        sizeSpecs,
        images: uploadedImages,
        variants: formVariants,
        sku: sku || undefined,
        stock: stockQuantity ? parseInt(stockQuantity) : undefined,
        brandId,
      };
    },
    validate: () => {
      const errors: string[] = [];
      if (!name.trim()) errors.push('商品名を入力してください');
      if (!price || parseInt(price) <= 0) errors.push('価格を入力してください');
      // 画像は任意に変更
      return { valid: errors.length === 0, errors };
    },
    setData: (data) => {
      if (data.name !== undefined) setName(data.name);
      if (data.description !== undefined) setDescription(data.description);
      if (data.category !== undefined) setCategory(data.category);
      if (data.tags !== undefined) setTags(data.tags.join(', '));
      if (data.price !== undefined) setPrice(data.price.toString());
      if (data.discountedPrice !== undefined) setDiscountedPrice(data.discountedPrice?.toString() || '');
      if (data.currency !== undefined) setSelectedCurrency(data.currency.toLowerCase());
      if (data.taxIncluded !== undefined) setTaxIncluded(data.taxIncluded);
      if (data.isHighlighted !== undefined) setIsHighlighted(data.isHighlighted);
      if (data.sku !== undefined) setSku(data.sku);
      if (data.stock !== undefined) setStockQuantity(data.stock.toString());
      if (data.sizeSpecs !== undefined) setSizeSpecs(data.sizeSpecs);
      if (data.brandId !== undefined) setBrandId(data.brandId || null);
    },
  }));

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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
                {t('basicDetails')}
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHighlighted}
                  onChange={(e) => setIsHighlighted(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--color-accent)]"
                />
                <span className="text-xs text-[var(--color-text-label)]">{t('highlightProduct')}</span>
              </label>
            </div>
            <div className="space-y-4">
              <Input
                label={t('productName')}
                placeholder={t('enterProductName') || 'Enter product name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              {/* Brand Selector */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-body)] mb-1.5">
                  ブランド
                </label>
                {isCreatingBrand ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateBrand()}
                      placeholder="ブランド名を入力"
                      autoFocus
                      className="flex-1 h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
                    />
                    <button
                      type="button"
                      onClick={handleCreateBrand}
                      className="h-10 px-3 text-sm font-medium bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
                    >
                      追加
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsCreatingBrand(false); setNewBrandName(''); }}
                      className="h-10 px-3 text-sm text-[var(--color-text-label)] border border-[var(--color-line)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={brandId || ''}
                      onChange={(e) => setBrandId(e.target.value || null)}
                      className="flex-1 h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)]"
                    >
                      <option value="">ブランドを選択</option>
                      {brands.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsCreatingBrand(true)}
                      className="h-10 px-3 text-sm text-[var(--color-accent)] border border-[var(--color-line)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors whitespace-nowrap"
                    >
                      ＋ 新規
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-body)] mb-1.5">
                  {t('productDescription')}
                </label>
                <textarea
                  rows={4}
                  placeholder={t('enterProductDescription') || 'Enter product description'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
                />
              </div>
            </div>
          </motion.div>

          {/* Size Specifications */}
          <SizeSpecTable specs={sizeSpecs} onChange={setSizeSpecs} />

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
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
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
                value={discountedPrice}
                onChange={(e) => setDiscountedPrice(e.target.value)}
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
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                  />
                  <Select
                    label={t('stockStatus')}
                    options={stockStatusOptions}
                    value={stockStatus}
                    onChange={(e) => setStockStatus(e.target.value)}
                  />
                </div>
                <Input
                  label="SKU"
                  placeholder={t('enterSKU') || 'Enter SKU'}
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column - Images & Categories */}
        <div className="flex flex-col">
          {/* Product Images with Color Linking */}
          <ProductImageUpload
            images={images}
            onImagesChange={setImages}
            colorOptions={colorOptions}
            imageColorMap={imageColorMap}
            onImageColorMapChange={setImageColorMap}
            onAddColor={(newColor) => {
              // Add color to variant options
              const colorOpt = variantOptions.find(o => o.name === 'color');
              if (colorOpt) {
                if (!colorOpt.values.includes(newColor)) {
                  setVariantOptions(
                    variantOptions.map(o =>
                      o.name === 'color' ? { ...o, values: [...o.values, newColor] } : o
                    )
                  );
                }
              } else {
                setVariantOptions([...variantOptions, { name: 'color', values: [newColor] }]);
              }
            }}
          />

          {/* Model Wearing Images */}
          {productId && <ProductModelImages productId={productId} />}

          {/* Spacer to push Categories to bottom */}
          <div className="flex-1 min-h-6" />

          {/* Categories & Highlight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4"
          >
            <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-3">
              {t('categories')}
            </h3>
            <div className="space-y-3">
              <CategorySelector
                value={category}
                onChange={setCategory}
              />
              <Input
                label={t('productTag')}
                placeholder={t('enterTags')}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
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
        imageColorMap={imageColorMap}
        basePrice={price ? parseInt(price) : undefined}
        onVariantsChange={setVariants}
        onOptionsChange={setVariantOptions}
      />
    </div>
  );
});

export default ProductForm;

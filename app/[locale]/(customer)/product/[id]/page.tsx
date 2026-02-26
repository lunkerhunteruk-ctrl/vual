'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, ShoppingBag, Check, PackageX, AlertTriangle, Ruler, Sparkles } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Button, Skeleton } from '@/components/ui';
import {
  ImageCarousel,
  ColorSwatches,
  SizeSelector,
  ProductInfo,
  RelatedProducts,
  ReviewSection,
  SizeGuideModal,
} from '@/components/customer/product';
import { OutfitTryOnModal, CreditPurchaseSheet } from '@/components/customer/tryon';
import { useProduct, useProducts } from '@/lib/hooks/useProducts';
import { useCartStore } from '@/lib/store/cart';
import { useFavoritesStore } from '@/lib/store/favorites';
import { mapToVtonCategory } from '@/lib/utils/vton-category';
import { getTaxInclusivePrice, formatPriceWithTax } from '@/lib/utils/currency';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('customer.product');
  const productId = params.id as string;

  // Fetch real product data
  const { product, isLoading, error } = useProduct(productId);

  // Fetch related products (same category)
  const { products: relatedProductsData } = useProducts({
    limit: 4,
  });

  // Cart store
  const addItem = useCartStore((state) => state.addItem);

  // Favorites store
  const favToggle = useFavoritesStore((s) => s.toggle);
  const favCheck = useFavoritesStore((s) => s.isFavorite);
  const isFavorite = favCheck(productId);

  const handleFavoriteToggle = () => {
    if (!product) return;
    favToggle({
      productId,
      name: product.name,
      brand: product.brand || '',
      price: product.price,
      image: product.images?.[0]?.url || '',
    });
  };

  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [addedToCart, setAddedToCart] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [showOutfitTryOn, setShowOutfitTryOn] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);

  // Store policies
  const [storePolicies, setStorePolicies] = useState<{
    shippingPolicy?: string;
    freeShippingThreshold?: number | null;
    codPolicy?: string;
    returnPolicy?: string;
  }>({});

  // Model images
  const [modelImages, setModelImages] = useState<string[]>([]);

  // Save to browsing history
  useEffect(() => {
    if (!product) return;
    try {
      const key = 'vual-viewed-products';
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      const item = {
        id: productId,
        name: product.name,
        brand: product.brand || '',
        price: product.price,
        image: product.images?.find((img: any) => img.is_primary)?.url || product.images?.[0]?.url || '',
        viewedAt: Date.now(),
      };
      const filtered = saved.filter((p: any) => p.id !== productId);
      const updated = [item, ...filtered].slice(0, 20);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, [product, productId]);

  useEffect(() => {
    fetch('/api/stores/policies')
      .then(res => res.json())
      .then(data => setStorePolicies(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!productId) return;
    fetch(`/api/products/model-images?productId=${productId}`)
      .then(res => res.json())
      .then(data => {
        if (data.modelImages?.length) {
          setModelImages(data.modelImages.map((m: any) => m.image_url));
        }
      })
      .catch(() => {});
  }, [productId]);

  // Check if product supports VTON
  const isTryOnCompatible = product ? mapToVtonCategory(product.category) !== null : false;

  // Extract colors and sizes from variants
  const extractedColors = product?.variants
    ? [...new Set(product.variants.map(v => v.options?.color).filter(Boolean))]
    : [];
  const extractedSizes = product?.variants
    ? [...new Set(product.variants.map(v => v.options?.size).filter(Boolean))]
    : [];

  // Transform colors for component - include thumbnail from product images
  const colors = extractedColors.map(c => {
    const colorName = c as string;
    const colorImage = product?.images?.find(img => img.color === colorName);
    return { name: colorName, hex: '#888888', image: colorImage?.url };
  });
  const sizes = extractedSizes as string[];

  // Stock warning: find the selected variant's stock
  const selectedVariant = product?.variants?.find(
    (v) =>
      ((!selectedColor && !selectedSize) ||
        (v.options?.color === selectedColor || !selectedColor) &&
        (v.options?.size === selectedSize || !selectedSize))
  );
  const totalStock = product?.stockQuantity || 0;
  const variantStock = selectedVariant?.stock ?? totalStock;
  const LOW_STOCK_THRESHOLD = 3;
  const isLowStock = variantStock > 0 && variantStock <= LOW_STOCK_THRESHOLD;
  const isOutOfStock = variantStock === 0 && (product?.variants?.length ?? 0) > 0;

  // Related products (exclude current product)
  const relatedProducts = relatedProductsData
    .filter(p => p.id !== productId)
    .slice(0, 4)
    .map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand || '',
      price: formatPriceWithTax(
        getTaxInclusivePrice(p.price || p.base_price || 0, p.tax_included ?? true, p.currency || 'jpy'),
        p.currency || 'jpy',
        locale === 'ja' ? 'ja-JP' : undefined
      ),
      image: p.images?.find(img => img.is_primary)?.url || p.images?.[0]?.url || p.product_images?.find((img: any) => img.is_primary)?.url || p.product_images?.[0]?.url,
    }));

  // Set default selections when product loads
  useEffect(() => {
    if (colors.length > 0 && !selectedColor) {
      setSelectedColor(colors[0].name);
    }
    if (sizes.length > 0 && !selectedSize) {
      setSelectedSize(sizes[0]);
    }
  }, [colors, sizes, selectedColor, selectedSize]);

  const handleAddToCart = () => {
    if (!product) return;

    const currency = product.currency || 'jpy';
    const taxIncPrice = getTaxInclusivePrice(product.price || product.base_price || 0, product.tax_included ?? true, currency);

    addItem({
      productId: productId,
      variantId: `${selectedColor}-${selectedSize}`,
      name: product.name,
      price: taxIncPrice,
      currency,
      image: product.images?.[0]?.url || '',
      options: {
        brand: product.brand || '',
        color: selectedColor,
        size: selectedSize,
      },
    });

    // Show confirmation
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen pb-40">
        <div className="px-4 py-3 border-b">
          <Skeleton className="w-16 h-6" />
        </div>
        <Skeleton className="w-full aspect-square" />
        <div className="px-4 py-6 space-y-4">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-20 h-8" />
        </div>
      </div>
    );
  }

  // Product not found
  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 mb-6 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center mx-auto">
            <PackageX size={32} className="text-[var(--color-text-label)]" />
          </div>
          <h1 className="text-lg font-medium text-[var(--color-title-active)] mb-2">
            Product Not Found
          </h1>
          <p className="text-sm text-[var(--color-text-body)] mb-6 max-w-xs">
            This product may have been removed or is no longer available.
          </p>
          <Button
            variant="primary"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => router.push(`/${locale}`)}
          >
            Back to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-40">
      {/* Back Button */}
      <div className="sticky top-14 z-10 bg-white border-b border-[var(--color-line)] px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      {/* Image Carousel - product images + model images */}
      <ImageCarousel
        images={[...(product.images?.map(img => img.url) || []), ...modelImages]}
        modelImageCount={modelImages.length}
        isFavorite={isFavorite}
        onFavoriteToggle={handleFavoriteToggle}
        onShare={() => {
          if (navigator.share) {
            navigator.share({
              title: product.name,
              url: window.location.href,
            });
          }
        }}
      />

      {/* Product Info */}
      <ProductInfo
        brand={product.brand || ''}
        name={product.name}
        price={formatPriceWithTax(
          getTaxInclusivePrice(product.price || product.base_price || 0, product.tax_included ?? true, product.currency || 'jpy'),
          product.currency || 'jpy',
          locale === 'ja' ? 'ja-JP' : undefined
        )}
        category={product.category}
        description={product.description || ''}
        materials={product.materials || ''}
        care={product.care || ''}
        sizeSpecs={product.size_specs}
        shippingPolicy={storePolicies.shippingPolicy}
        freeShippingThreshold={storePolicies.freeShippingThreshold}
        codPolicy={storePolicies.codPolicy}
        returnPolicy={storePolicies.returnPolicy}
      />

      {/* Color & Size Selection - only show if available */}
      {(colors.length > 0 || sizes.length > 0) && (
        <div className="px-4 py-6 space-y-6">
          {colors.length > 0 && (
            <ColorSwatches
              colors={colors}
              selectedColor={selectedColor}
              onColorChange={setSelectedColor}
            />
          )}
          {sizes.length > 0 && (
            <div>
              <SizeSelector
                sizes={sizes}
                selectedSize={selectedSize}
                onSizeChange={setSelectedSize}
                unavailableSizes={[]}
              />
              {product.size_specs?.columns?.length > 0 && (
                <button
                  onClick={() => setSizeGuideOpen(true)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:underline"
                >
                  <Ruler size={14} />
                  {locale === 'ja' ? 'サイズガイド' : 'Size Guide'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Try On Button */}
      {isTryOnCompatible && (
        <div className="px-4 py-3">
          <button
            onClick={() => setShowOutfitTryOn(true)}
            className="w-full py-3 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Sparkles size={16} />
            {locale === 'ja' ? '試着してみる' : 'Try It On'}
          </button>
        </div>
      )}

      {/* Stock Warning */}
      {isLowStock && (
        <div className="mx-4 mt-2 flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)]">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-700 font-medium">
            {locale === 'ja'
              ? `残りわずか（あと${variantStock}点）`
              : `Low stock — only ${variantStock} left`}
          </span>
        </div>
      )}
      {isOutOfStock && (
        <div className="mx-4 mt-2 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-[var(--radius-md)]">
          <PackageX size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-600 font-medium">
            {locale === 'ja' ? '在庫切れ' : 'Out of stock'}
          </span>
        </div>
      )}

      {/* Reviews */}
      <div className="border-t border-[var(--color-line)] mt-6">
        <ReviewSection productId={productId} />
      </div>

      {/* Related Products - only show if available */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-[var(--color-line)]">
          <RelatedProducts products={relatedProducts} />
        </div>
      )}

      {/* Fixed Bottom CTA */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-20 left-0 right-0 bg-white border-t border-[var(--color-line)] p-4 z-20"
      >
        <div className="flex items-center gap-3">
          <Button
            variant={addedToCart ? 'primary' : 'inverse'}
            size="lg"
            fullWidth
            leftIcon={addedToCart ? <Check size={18} /> : <ShoppingBag size={18} />}
            onClick={handleAddToCart}
            disabled={addedToCart || isOutOfStock}
          >
            {isOutOfStock
              ? (locale === 'ja' ? '在庫切れ' : 'Out of Stock')
              : addedToCart
                ? (locale === 'ja' ? 'カートに追加しました' : 'Added to Cart!')
                : t('addToBasket')}
          </Button>
          <button
            onClick={handleFavoriteToggle}
            className="flex-shrink-0 w-12 h-12 rounded-[var(--radius-md)] border border-[var(--color-line)] flex items-center justify-center hover:bg-[var(--color-bg-element)] transition-colors"
          >
            <Heart
              size={20}
              className={
                isFavorite
                  ? 'fill-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'text-[var(--color-text-body)]'
              }
            />
          </button>
        </div>
      </motion.div>

      {/* Size Guide Modal */}
      {product.size_specs && (
        <SizeGuideModal
          isOpen={sizeGuideOpen}
          onClose={() => setSizeGuideOpen(false)}
          sizeSpecs={product.size_specs}
        />
      )}

      {/* Outfit Try-On Modal */}
      <AnimatePresence>
        {showOutfitTryOn && product && (
          <OutfitTryOnModal
            initialProduct={{
              id: product.id,
              name: product.name,
              nameEn: product.name_en,
              price: product.price,
              image: product.images?.[0]?.url || '',
              category: product.category,
              storeId: product.store_id,
            }}
            onClose={() => setShowOutfitTryOn(false)}
            onPaymentRequired={() => {
              setShowOutfitTryOn(false);
              setShowPurchase(true);
            }}
            lineUserId={typeof window !== 'undefined' ? localStorage.getItem('vual-line-user-id') || undefined : undefined}
          />
        )}
      </AnimatePresence>

      {/* Credit Purchase Sheet */}
      <CreditPurchaseSheet
        isOpen={showPurchase}
        onClose={() => setShowPurchase(false)}
        lineUserId={typeof window !== 'undefined' ? localStorage.getItem('vual-line-user-id') || undefined : undefined}
      />
    </div>
  );
}

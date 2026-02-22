'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, ShoppingBag, Check, PackageX } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import {
  ImageCarousel,
  ColorSwatches,
  SizeSelector,
  ProductInfo,
  RelatedProducts,
} from '@/components/customer/product';
import { useProduct, useProducts } from '@/lib/hooks/useProducts';
import { useCartStore } from '@/lib/store/cart';

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

  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  // Extract colors and sizes from variants
  const extractedColors = product?.variants
    ? [...new Set(product.variants.map(v => v.options?.color).filter(Boolean))]
    : [];
  const extractedSizes = product?.variants
    ? [...new Set(product.variants.map(v => v.options?.size).filter(Boolean))]
    : [];

  // Transform colors for component
  const colors = extractedColors.map(c => ({ name: c as string, hex: '#888888' }));
  const sizes = extractedSizes as string[];

  // Related products (exclude current product)
  const relatedProducts = relatedProductsData
    .filter(p => p.id !== productId)
    .slice(0, 4)
    .map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand || '',
      price: `$${p.price}`,
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

    addItem({
      productId: productId,
      variantId: `${selectedColor}-${selectedSize}`,
      name: product.name,
      price: product.price,
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
      <div className="min-h-screen pb-24">
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
    <div className="min-h-screen pb-24">
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

      {/* Image Carousel */}
      <ImageCarousel
        images={product.images?.map(img => img.url) || []}
        isFavorite={isFavorite}
        onFavoriteToggle={() => setIsFavorite(!isFavorite)}
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
        price={`$${product.price}`}
        materials={product.materials || ''}
        care={product.care || ''}
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
            <SizeSelector
              sizes={sizes}
              selectedSize={selectedSize}
              onSizeChange={setSelectedSize}
              unavailableSizes={[]}
            />
          )}
        </div>
      )}

      {/* Related Products - only show if available */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-[var(--color-line)] mt-6">
          <RelatedProducts products={relatedProducts} />
        </div>
      )}

      {/* Fixed Bottom CTA */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-line)] p-4 z-20"
      >
        <div className="flex items-center gap-3">
          <Button
            variant={addedToCart ? 'primary' : 'inverse'}
            size="lg"
            fullWidth
            leftIcon={addedToCart ? <Check size={18} /> : <ShoppingBag size={18} />}
            onClick={handleAddToCart}
            disabled={addedToCart}
          >
            {addedToCart ? 'Added to Cart!' : t('addToBasket')}
          </Button>
          <button
            onClick={() => setIsFavorite(!isFavorite)}
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
    </div>
  );
}

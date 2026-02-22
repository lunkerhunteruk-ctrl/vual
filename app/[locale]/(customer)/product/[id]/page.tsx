'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, ShoppingBag, Check } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import {
  ImageCarousel,
  ColorSwatches,
  SizeSelector,
  ProductInfo,
  RelatedProducts,
} from '@/components/customer/product';
import { useProduct } from '@/lib/hooks/useProducts';
import { useCartStore } from '@/lib/store/cart';

// Fallback mock data if product not found in Firestore
const fallbackProduct = {
  id: '1',
  brand: 'MOHAN',
  name: 'Recycle Boucle Knit Cardigan Pink',
  price: 120,
  images: [] as string[],
  colors: [
    { name: 'Pink', hex: '#F5B5C8' },
    { name: 'Black', hex: '#000000' },
    { name: 'Cream', hex: '#F5F5DC' },
  ],
  sizes: ['S', 'M', 'L'],
  unavailableSizes: [] as string[],
  materials: '60% Recycled Polyester, 30% Acrylic, 10% Wool. Certified sustainable materials.',
  care: 'Hand wash cold. Lay flat to dry. Do not bleach or iron.',
};

const relatedProducts = [
  { id: '2', name: 'Wool Blend Coat', brand: 'MOHAN', price: '$349' },
  { id: '3', name: 'Cashmere Sweater', brand: 'KORIN', price: '$249' },
  { id: '4', name: 'Silk Blouse', brand: 'LAMEREI', price: '$189' },
  { id: '5', name: 'Cotton Dress', brand: 'BASIC', price: '$129' },
];

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('customer.product');
  const productId = params.id as string;

  // Fetch real product data
  const { product: firestoreProduct, isLoading: loading, error } = useProduct(productId);

  // Use Firestore product or fallback
  const product = firestoreProduct || fallbackProduct;

  // Cart store
  const addItem = useCartStore((state) => state.addItem);

  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  // Extract colors and sizes from variants or use defaults
  const extractedColors = firestoreProduct?.variants
    ? [...new Set(firestoreProduct.variants.map(v => v.options?.color).filter(Boolean))]
    : [];
  const extractedSizes = firestoreProduct?.variants
    ? [...new Set(firestoreProduct.variants.map(v => v.options?.size).filter(Boolean))]
    : [];

  // Use extracted or fallback
  const colors = extractedColors.length > 0
    ? extractedColors.map(c => ({ name: c as string, hex: '#888888' }))
    : fallbackProduct.colors;
  const sizes = (extractedSizes.length > 0 ? extractedSizes : fallbackProduct.sizes) as string[];
  const unavailableSizes: string[] = [];

  // Set default selections when product loads
  useEffect(() => {
    if (colors.length > 0 && !selectedColor) {
      setSelectedColor(typeof colors[0] === 'string' ? colors[0] : colors[0].name);
    }
    if (sizes.length > 0 && !selectedSize) {
      setSelectedSize(sizes[0]);
    }
  }, [colors, sizes, selectedColor, selectedSize]);

  const handleAddToCart = () => {
    const price = typeof product.price === 'number' ? product.price : parseFloat(String(product.price).replace(/[^0-9.]/g, '')) || 0;
    const productImage = firestoreProduct?.images?.[0]?.url || '';

    addItem({
      productId: productId,
      variantId: `${selectedColor}-${selectedSize}`,
      name: product.name,
      price: price,
      image: productImage,
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

  if (loading) {
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
        images={firestoreProduct?.images?.map(img => img.url) || fallbackProduct.images}
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
        price={typeof product.price === 'number' ? `$${product.price}` : product.price}
        materials={product.materials || fallbackProduct.materials}
        care={product.care || fallbackProduct.care}
      />

      {/* Color & Size Selection */}
      <div className="px-4 py-6 space-y-6">
        <ColorSwatches
          colors={colors}
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
        />
        <SizeSelector
          sizes={sizes}
          selectedSize={selectedSize}
          onSizeChange={setSelectedSize}
          unavailableSizes={unavailableSizes}
        />
      </div>

      {/* Related Products */}
      <div className="border-t border-[var(--color-line)] mt-6">
        <RelatedProducts products={relatedProducts} />
      </div>

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

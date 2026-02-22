'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  ImageCarousel,
  ColorSwatches,
  SizeSelector,
  ProductInfo,
  RelatedProducts,
} from '@/components/customer/product';

// Mock product data
const mockProduct = {
  id: '1',
  brand: 'MOHAN',
  name: 'Recycle Boucle Knit Cardigan Pink',
  price: '$120',
  images: ['', '', '', ''],
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

  const [selectedColor, setSelectedColor] = useState(mockProduct.colors[0].name);
  const [selectedSize, setSelectedSize] = useState('M');
  const [isFavorite, setIsFavorite] = useState(false);

  const handleAddToCart = () => {
    // Add to cart logic
    console.log('Adding to cart:', {
      productId: params.id,
      color: selectedColor,
      size: selectedSize,
    });
  };

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
        images={mockProduct.images}
        isFavorite={isFavorite}
        onFavoriteToggle={() => setIsFavorite(!isFavorite)}
        onShare={() => {
          if (navigator.share) {
            navigator.share({
              title: mockProduct.name,
              url: window.location.href,
            });
          }
        }}
      />

      {/* Product Info */}
      <ProductInfo
        brand={mockProduct.brand}
        name={mockProduct.name}
        price={mockProduct.price}
        materials={mockProduct.materials}
        care={mockProduct.care}
      />

      {/* Color & Size Selection */}
      <div className="px-4 py-6 space-y-6">
        <ColorSwatches
          colors={mockProduct.colors}
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
        />
        <SizeSelector
          sizes={mockProduct.sizes}
          selectedSize={selectedSize}
          onSizeChange={setSelectedSize}
          unavailableSizes={mockProduct.unavailableSizes}
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
            variant="inverse"
            size="lg"
            fullWidth
            leftIcon={<ShoppingBag size={18} />}
            onClick={handleAddToCart}
          >
            {t('addToBasket')}
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

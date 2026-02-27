'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useFavoritesStore } from '@/lib/store/favorites';

interface ProductCardProps {
  id: string;
  name: string;
  brand: string;
  price: string;
  numericPrice?: number;
  image?: string;
}

export function ProductCard({
  id,
  name,
  brand,
  price,
  numericPrice,
  image,
}: ProductCardProps) {
  const locale = useLocale();
  const favToggle = useFavoritesStore((s) => s.toggle);
  const favCheck = useFavoritesStore((s) => s.isFavorite);
  const favorite = favCheck(id);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    favToggle({
      productId: id,
      name,
      brand,
      price: numericPrice || 0,
      image: image || '',
    });
  };

  return (
    <Link href={`/${locale}/product/${id}`}>
      <motion.article
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="group"
      >
        {/* Image */}
        <div className="relative aspect-square bg-white rounded-[var(--radius-md)] overflow-hidden mb-3 flex items-center justify-center">
          {image ? (
            <img
              src={image}
              alt={name}
              className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)]" />
          )}

          {/* Favorite Button */}
          <button
            onClick={toggleFavorite}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
          >
            <Heart
              size={18}
              className={`transition-colors ${
                favorite
                  ? 'fill-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'text-[var(--color-text-body)]'
              }`}
            />
          </button>
        </div>

        {/* Info */}
        <div className="px-1">
          <p className="text-xs text-[var(--color-text-label)] uppercase tracking-wide mb-1">
            {brand}
          </p>
          <h3 className="text-sm font-medium text-[var(--color-title-active)] line-clamp-2 mb-1">
            {name}
          </h3>
          <p className="text-sm font-medium text-[var(--color-accent)]">
            {price}
          </p>
        </div>
      </motion.article>
    </Link>
  );
}

export default ProductCard;

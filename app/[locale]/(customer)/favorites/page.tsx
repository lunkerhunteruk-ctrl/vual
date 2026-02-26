'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trash2, ShoppingBag } from 'lucide-react';
import { useFavoritesStore } from '@/lib/store/favorites';
import { formatPrice, getDefaultCurrency } from '@/lib/utils/currency';

export default function FavoritesPage() {
  const locale = useLocale();
  const items = useFavoritesStore((s) => s.items);
  const remove = useFavoritesStore((s) => s.remove);
  const defaultCurrency = getDefaultCurrency(locale);

  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-semibold text-[var(--color-title-active)] mb-6">
        {locale === 'ja' ? 'お気に入り' : 'Favorites'}
        {items.length > 0 && (
          <span className="text-sm font-normal text-[var(--color-text-label)] ml-2">
            ({items.length})
          </span>
        )}
      </h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center mb-4">
            <Heart size={28} className="text-[var(--color-text-label)]" />
          </div>
          <p className="text-sm text-[var(--color-text-body)] mb-1">
            {locale === 'ja' ? 'お気に入りはまだありません' : 'No favorites yet'}
          </p>
          <p className="text-xs text-[var(--color-text-label)] mb-6">
            {locale === 'ja' ? '気になる商品のハートをタップして追加しましょう' : 'Tap the heart on products you love'}
          </p>
          <Link
            href={`/${locale}`}
            className="h-10 px-6 inline-flex items-center text-sm font-medium text-white bg-[var(--color-accent)] rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
          >
            <ShoppingBag size={16} className="mr-2" />
            {locale === 'ja' ? '商品を見る' : 'Browse products'}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.productId}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Link href={`/${locale}/product/${item.productId}`} className="group">
                  <div className="relative aspect-[3/4] bg-white rounded-[var(--radius-md)] overflow-hidden mb-2">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)]" />
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        remove(item.productId);
                      }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} className="text-[var(--color-text-label)] hover:text-red-500" />
                    </button>
                  </div>
                  <div className="px-1">
                    <p className="text-xs text-[var(--color-text-label)] uppercase tracking-wide mb-0.5">
                      {item.brand}
                    </p>
                    <h3 className="text-sm font-medium text-[var(--color-title-active)] line-clamp-2 mb-0.5">
                      {item.name}
                    </h3>
                    <p className="text-sm font-medium text-[var(--color-accent)]">
                      {formatPrice(item.price, defaultCurrency, locale, true)}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

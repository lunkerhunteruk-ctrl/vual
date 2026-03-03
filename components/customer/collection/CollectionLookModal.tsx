'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { CollectionLook, CollectionItem } from '@/lib/hooks/useCollection';
import { getTaxInclusivePrice, formatPriceWithTax } from '@/lib/utils/currency';
import { getCategoryLabel } from '@/lib/utils/category';

interface CollectionLookModalProps {
  item: CollectionItem;
  onClose: () => void;
}

function formatPrice(price: number, currency: string): string {
  if (currency === 'jpy' || currency === 'JPY') {
    return `¥${price.toLocaleString()}`;
  }
  return `${currency.toUpperCase()} ${price.toLocaleString()}`;
}

export function CollectionLookModal({ item, onClose }: CollectionLookModalProps) {
  const locale = useLocale();
  const ja = locale === 'ja';

  // For bundles, track current slide index
  const looks = item.type === 'bundle' ? item.bundle.looks : [item.look];
  const [slideIndex, setSlideIndex] = useState(0);
  const look = looks[slideIndex];

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const goPrev = useCallback(() => {
    setSlideIndex((prev) => (prev - 1 + looks.length) % looks.length);
  }, [looks.length]);

  const goNext = useCallback(() => {
    setSlideIndex((prev) => (prev + 1) % looks.length);
  }, [looks.length]);

  if (!look) return null;

  const products = (look.collection_look_products || [])
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  const showCredits = look.show_credits !== false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 bg-white flex flex-col"
    >
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 h-14 bg-white/90 backdrop-blur-sm border-b border-[var(--color-line)]">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors"
        >
          <ChevronLeft size={18} />
          <span>{ja ? 'コレクション' : 'Collection'}</span>
        </button>

        {/* Slide indicator for bundles */}
        {looks.length > 1 && (
          <span className="text-xs text-[var(--color-text-label)]">
            {slideIndex + 1} / {looks.length}
          </span>
        )}

        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-element)] transition-colors"
        >
          <X size={18} className="text-[var(--color-title-active)]" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero image — full width, editorial feel */}
        <div className="relative w-full bg-black">
          <AnimatePresence mode="wait">
            <motion.div
              key={look.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="relative w-full"
            >
              <img
                src={look.image_url}
                alt={look.title || ''}
                className="w-full h-auto block"
              />
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows (for bundles with multiple looks) */}
          {looks.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
              >
                <ChevronLeft size={20} className="text-[var(--color-title-active)]" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
              >
                <ChevronRight size={20} className="text-[var(--color-title-active)]" />
              </button>
            </>
          )}

          {/* Dot indicators */}
          {looks.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {looks.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSlideIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === slideIndex
                      ? 'bg-white w-4'
                      : 'bg-white/50 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="px-5 py-6">
          {/* Title & Description */}
          {look.title && (
            <h2 className="text-lg font-semibold tracking-wide text-[var(--color-title-active)] mb-2">
              {look.title}
            </h2>
          )}
          {look.description && (
            <p className="text-sm text-[var(--color-text-body)] leading-relaxed mb-5">
              {look.description}
            </p>
          )}

          {/* Credits section */}
          {showCredits && products.length > 0 && (
            <div className="mb-5 py-4 border-t border-b border-[var(--color-line)]">
              {products.map((lp) => {
                const p = lp.products;
                if (!p) return null;
                const catLabel = getCategoryLabel(p.category || '', locale);
                const brandPart = p.brand ? ` (${p.brand})` : '';
                return (
                  <div key={lp.id} className="mb-2 last:mb-0">
                    <p className="text-xs font-medium text-[var(--color-title-active)]">
                      {catLabel}: {p.name}{brandPart}
                    </p>
                    <p className="text-xs text-[var(--color-text-label)]">
                      {formatPrice(p.base_price, p.currency)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Product cards */}
          {products.length > 0 && (
            <div className="grid grid-cols-2 gap-3 pb-6">
              {products.map((lp) => {
                const product = lp.products;
                if (!product) return null;
                const priceStr = formatPriceWithTax(
                  getTaxInclusivePrice(
                    product.base_price || 0,
                    product.tax_included ?? true,
                    product.currency || 'jpy'
                  ),
                  product.currency || 'jpy',
                  locale === 'ja' ? 'ja-JP' : undefined
                );
                return (
                  <Link
                    key={lp.id}
                    href={`/${locale}/product/${product.id}`}
                    onClick={onClose}
                    className="flex gap-2 p-2 rounded-lg border border-[var(--color-line)] hover:border-[var(--color-text-label)] transition-colors"
                  >
                    <div className="w-14 h-18 rounded overflow-hidden bg-[var(--color-bg-element)] flex-shrink-0">
                      {product.images?.[0]?.url && (
                        <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--color-title-active)] truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-[var(--color-text-label)] mt-0.5">
                        {priceStr}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default CollectionLookModal;

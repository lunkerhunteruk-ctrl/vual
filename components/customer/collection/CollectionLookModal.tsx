'use client';

import { useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { CollectionLook } from '@/lib/hooks/useCollection';
import { getTaxInclusivePrice, formatPriceWithTax } from '@/lib/utils/currency';

interface CollectionLookModalProps {
  looks: CollectionLook[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function CollectionLookModal({
  looks,
  currentIndex,
  onClose,
  onNavigate,
}: CollectionLookModalProps) {
  const locale = useLocale();
  const look = looks[currentIndex];

  const goPrev = useCallback(() => {
    onNavigate((currentIndex - 1 + looks.length) % looks.length);
  }, [currentIndex, looks.length, onNavigate]);

  const goNext = useCallback(() => {
    onNavigate((currentIndex + 1) % looks.length);
  }, [currentIndex, looks.length, onNavigate]);

  if (!look) return null;

  const products = (look.collection_look_products || [])
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={onClose}>
      <div
        className="relative w-full max-w-lg mx-4 bg-white rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <X size={16} className="text-white" />
        </button>

        {/* Look image */}
        <div className="relative aspect-[3/4] bg-[var(--color-bg-element)]">
          <AnimatePresence mode="wait">
            <motion.img
              key={look.id}
              src={look.image_url}
              alt=""
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full object-cover"
            />
          </AnimatePresence>

          {/* Navigation arrows */}
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

          {/* Counter */}
          {looks.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full z-10">
              {currentIndex + 1} / {looks.length}
            </div>
          )}
        </div>

        {/* Products */}
        {products.length > 0 && (
          <div className="p-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {products.map((lp) => {
                const product = lp.products;
                if (!product) return null;
                const priceStr = formatPriceWithTax(
                  getTaxInclusivePrice(
                    product.price || product.base_price || 0,
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
          </div>
        )}
      </div>
    </div>
  );
}

export default CollectionLookModal;

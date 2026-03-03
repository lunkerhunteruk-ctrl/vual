'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Layers, Loader2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useCustomerCollection, CollectionItem } from '@/lib/hooks/useCollection';
import { CollectionLookModal } from '@/components/customer/collection/CollectionLookModal';

export default function CollectionPage() {
  const locale = useLocale();
  const t = useTranslations('customer.home');
  const { items, isLoading } = useCustomerCollection();
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-lg font-medium tracking-[0.15em] text-[var(--color-title-active)] uppercase">
          {t('collections')}
        </h1>
        <div className="w-12 h-0.5 bg-[var(--color-title-active)] mt-2" />
      </div>

      {items.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-[var(--color-text-label)]">
            {locale === 'ja' ? 'コレクションはまだありません' : 'No collections yet'}
          </p>
        </div>
      ) : (
        /* Grid */
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 px-2">
          {items.map((item, idx) => {
            const firstLook = item.type === 'single' ? item.look : item.bundle.looks[0];
            const isBundle = item.type === 'bundle';
            const productCount = firstLook?.collection_look_products?.length || 0;

            return (
              <button
                key={item.type === 'single' ? item.look.id : `bundle-${item.bundle.id}`}
                onClick={() => setSelectedItemIndex(idx)}
                className="relative aspect-square rounded-lg overflow-hidden bg-[var(--color-bg-element)] group flex items-center justify-center"
              >
                <img
                  src={firstLook?.image_url || ''}
                  alt=""
                  className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
                {/* Bundle badge */}
                {isBundle && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 text-white text-[10px] font-medium px-2 py-1 rounded-full">
                    <Layers size={10} />
                    {item.bundle.looks.length}
                  </div>
                )}
                {/* Title overlay + product count */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6">
                  {firstLook?.title && (
                    <p className="text-white text-xs font-medium truncate">{firstLook.title}</p>
                  )}
                  {productCount > 0 && (
                    <p className="text-white/70 text-[10px] mt-0.5">
                      {productCount} {locale === 'ja' ? 'アイテム' : 'items'}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Full-screen look view */}
      <AnimatePresence>
        {selectedItemIndex !== null && items[selectedItemIndex] && (
          <CollectionLookModal
            item={items[selectedItemIndex]}
            onClose={() => setSelectedItemIndex(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

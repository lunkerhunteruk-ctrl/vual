'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { useCustomerCollection } from '@/lib/hooks/useCollection';
import { CollectionLookModal } from '@/components/customer/collection/CollectionLookModal';

export default function CollectionPage() {
  const locale = useLocale();
  const t = useTranslations('customer.home');
  const { looks, isLoading } = useCustomerCollection();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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

      {looks.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-[var(--color-text-label)]">
            {locale === 'ja' ? 'コレクションはまだありません' : 'No collections yet'}
          </p>
        </div>
      ) : (
        /* Grid */
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 px-2">
          {looks.map((look, idx) => (
            <button
              key={look.id}
              onClick={() => setSelectedIndex(idx)}
              className="relative aspect-square rounded-lg overflow-hidden bg-[var(--color-bg-element)] group flex items-center justify-center"
            >
              <img
                src={look.image_url}
                alt=""
                className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
              {/* Product count badge */}
              {look.collection_look_products?.length > 0 && (
                <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
                  {look.collection_look_products.length} {locale === 'ja' ? 'アイテム' : 'items'}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedIndex !== null && (
        <CollectionLookModal
          looks={looks}
          currentIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onNavigate={setSelectedIndex}
        />
      )}
    </div>
  );
}

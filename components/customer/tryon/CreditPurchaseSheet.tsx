'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Sparkles, Loader2 } from 'lucide-react';

interface CreditPurchaseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  lineUserId?: string;
  customerId?: string;
}

const CONSUMER_PACKS = [
  {
    slug: 'consumer-pass',
    icon: Crown,
    color: 'text-[var(--color-accent)]',
    bgColor: 'bg-[var(--color-accent)]/10',
    borderColor: 'border-[var(--color-accent)]',
    recommended: true,
  },
  {
    slug: 'consumer-30',
    icon: Sparkles,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-[var(--color-line)]',
    recommended: false,
  },
  {
    slug: 'consumer-10',
    icon: Sparkles,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-[var(--color-line)]',
    recommended: false,
  },
] as const;

const PACK_INFO: Record<string, { nameJa: string; nameEn: string; descJa: string; descEn: string; price: string }> = {
  'consumer-pass': {
    nameJa: 'VUAL Pass',
    nameEn: 'VUAL Pass',
    descJa: '月額980円 / 毎月30クレジット',
    descEn: '¥980/mo / 30 credits monthly',
    price: '¥980/月',
  },
  'consumer-30': {
    nameJa: '30クレジット',
    nameEn: '30 Credits',
    descJa: 'お得パック',
    descEn: 'Value pack',
    price: '¥1,200',
  },
  'consumer-10': {
    nameJa: '10クレジット',
    nameEn: '10 Credits',
    descJa: 'お試しパック',
    descEn: 'Trial pack',
    price: '¥500',
  },
};

export function CreditPurchaseSheet({ isOpen, onClose, lineUserId, customerId }: CreditPurchaseSheetProps) {
  const locale = useLocale();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const handlePurchase = async (packSlug: string) => {
    setPurchasing(packSlug);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packSlug,
          lineUserId,
          customerId,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      console.error('Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-50"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[80vh] overflow-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-line)]">
              <h2 className="text-base font-medium text-[var(--color-title-active)]">
                {locale === 'ja' ? 'クレジットを追加' : 'Get More Credits'}
              </h2>
              <button onClick={onClose} className="p-1 text-[var(--color-text-label)]">
                <X size={20} />
              </button>
            </div>

            {/* Message */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-sm text-[var(--color-text-body)]">
                {locale === 'ja'
                  ? '無料チケットを使い切りました。クレジットを追加して試着を続けましょう。'
                  : 'You\'ve used all free tickets. Add credits to continue trying on.'}
              </p>
            </div>

            {/* Packs */}
            <div className="px-4 py-4 space-y-3">
              {CONSUMER_PACKS.map((pack) => {
                const info = PACK_INFO[pack.slug];
                const Icon = pack.icon;

                return (
                  <button
                    key={pack.slug}
                    onClick={() => handlePurchase(pack.slug)}
                    disabled={purchasing !== null}
                    className={`relative w-full flex items-center gap-4 p-4 border rounded-xl text-left transition-all hover:shadow-sm disabled:opacity-50 ${pack.borderColor} ${
                      pack.recommended ? 'ring-1 ring-[var(--color-accent)]' : ''
                    }`}
                  >
                    {pack.recommended && (
                      <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-[var(--color-accent)] text-white text-[10px] font-medium rounded-full">
                        {locale === 'ja' ? 'おすすめ' : 'Best Value'}
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-full ${pack.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={18} className={pack.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-title-active)]">
                        {locale === 'ja' ? info.nameJa : info.nameEn}
                      </p>
                      <p className="text-xs text-[var(--color-text-label)]">
                        {locale === 'ja' ? info.descJa : info.descEn}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {purchasing === pack.slug ? (
                        <Loader2 size={18} className="animate-spin text-[var(--color-text-label)]" />
                      ) : (
                        <span className="text-sm font-semibold text-[var(--color-title-active)]">{info.price}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Safe bottom padding */}
            <div className="h-6" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

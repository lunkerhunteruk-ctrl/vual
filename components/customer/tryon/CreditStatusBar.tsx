'use client';

import { useLocale } from 'next-intl';
import { Ticket, Sparkles, Crown, Plus } from 'lucide-react';

interface CreditStatusBarProps {
  freeTickets: number;
  dailyFreeLimit: number;
  paidCredits: number;
  subscriptionCredits: number;
  isSubscribed: boolean;
  onBuyCredits: () => void;
}

export function CreditStatusBar({
  freeTickets,
  dailyFreeLimit,
  paidCredits,
  subscriptionCredits,
  isSubscribed,
  onBuyCredits,
}: CreditStatusBarProps) {
  const locale = useLocale();
  const totalPaid = paidCredits + subscriptionCredits;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--color-bg-element)] rounded-[var(--radius-md)]">
      {/* Free tickets */}
      <div className="flex items-center gap-1.5">
        <Ticket size={14} className="text-[var(--color-accent)]" />
        <span className="text-xs text-[var(--color-text-body)]">
          {locale === 'ja' ? '無料' : 'Free'}: <strong>{freeTickets}</strong>/{dailyFreeLimit}
        </span>
      </div>

      <div className="w-px h-4 bg-[var(--color-line)]" />

      {/* Paid credits */}
      <div className="flex items-center gap-1.5">
        <Sparkles size={14} className="text-amber-500" />
        <span className="text-xs text-[var(--color-text-body)]">
          {locale === 'ja' ? 'クレジット' : 'Credits'}: <strong>{totalPaid}</strong>
        </span>
      </div>

      {/* Subscription badge */}
      {isSubscribed && (
        <>
          <div className="w-px h-4 bg-[var(--color-line)]" />
          <div className="flex items-center gap-1 px-2 py-0.5 bg-[var(--color-accent)]/10 rounded-full">
            <Crown size={12} className="text-[var(--color-accent)]" />
            <span className="text-xs font-medium text-[var(--color-accent)]">Pass</span>
          </div>
        </>
      )}

      {/* Buy more button */}
      <button
        onClick={onBuyCredits}
        className="ml-auto flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-full hover:bg-[var(--color-accent)]/5 transition-colors"
      >
        <Plus size={12} />
        {locale === 'ja' ? '追加' : 'Add'}
      </button>
    </div>
  );
}

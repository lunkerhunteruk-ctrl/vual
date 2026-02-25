'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Search, ShoppingBag } from 'lucide-react';
import { useStoreContext } from '@/lib/store/store-context';

interface CustomerHeaderProps {
  cartCount?: number;
}

export function CustomerHeader({ cartCount = 0 }: CustomerHeaderProps) {
  const locale = useLocale();
  const { store } = useStoreContext();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[var(--color-line)]">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left - spacer for balance */}
        <div className="w-10" />

        {/* Center - Logo/Store Name */}
        <Link
          href={`/${locale}`}
          className="absolute left-1/2 -translate-x-1/2"
        >
          {store?.logoUrl ? (
            <img src={store.logoUrl} alt={store.name} className="h-7 object-contain" />
          ) : (
            <span className="text-lg font-semibold tracking-[0.2em] text-[var(--color-title-active)]">
              {store?.name || 'VUAL'}
            </span>
          )}
        </Link>

        {/* Right - Search & Cart */}
        <div className="flex items-center gap-1">
          <Link
            href={`/${locale}/search`}
            className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
            aria-label="Search"
          >
            <Search size={22} className="text-[var(--color-title-active)]" />
          </Link>
          <Link
            href={`/${locale}/cart`}
            className="relative p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
            aria-label="Cart"
          >
            <ShoppingBag size={22} className="text-[var(--color-title-active)]" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[var(--color-accent)] text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

export default CustomerHeader;

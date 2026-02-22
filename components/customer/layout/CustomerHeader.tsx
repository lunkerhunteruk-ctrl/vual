'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Menu, Search, ShoppingBag, X } from 'lucide-react';

interface CustomerHeaderProps {
  onMenuOpen: () => void;
  onSearchOpen: () => void;
  cartCount?: number;
}

export function CustomerHeader({ onMenuOpen, onSearchOpen, cartCount = 0 }: CustomerHeaderProps) {
  const locale = useLocale();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[var(--color-line)]">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left - Menu */}
        <button
          onClick={onMenuOpen}
          className="p-2 -ml-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} className="text-[var(--color-title-active)]" />
        </button>

        {/* Center - Logo */}
        <Link
          href={`/${locale}`}
          className="absolute left-1/2 -translate-x-1/2"
        >
          <span className="text-lg font-semibold tracking-[0.2em] text-[var(--color-title-active)]">
            VUAL
          </span>
        </Link>

        {/* Right - Search & Cart */}
        <div className="flex items-center gap-1">
          <button
            onClick={onSearchOpen}
            className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
            aria-label="Search"
          >
            <Search size={22} className="text-[var(--color-title-active)]" />
          </button>
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

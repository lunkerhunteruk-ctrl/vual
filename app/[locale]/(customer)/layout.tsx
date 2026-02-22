'use client';

import { useState } from 'react';
import {
  CustomerHeader,
  CustomerFooter,
  MenuDrawer,
  SearchModal,
} from '@/components/customer/layout';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <CustomerHeader
        onMenuOpen={() => setIsMenuOpen(true)}
        onSearchOpen={() => setIsSearchOpen(true)}
        cartCount={0}
      />

      <MenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <main className="flex-1 pt-14">
        {children}
      </main>

      <CustomerFooter />
    </div>
  );
}

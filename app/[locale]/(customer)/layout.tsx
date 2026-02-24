'use client';

import { useState } from 'react';
import {
  CustomerHeader,
  CustomerFooter,
  SearchModal,
  BottomNavBar,
} from '@/components/customer/layout';
import { LiffProvider } from '@/components/providers/LiffProvider';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <LiffProvider>
      <div className="min-h-screen bg-white flex flex-col">
        <CustomerHeader
          onSearchOpen={() => setIsSearchOpen(true)}
          cartCount={0}
        />

        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

        <main className="flex-1 pt-14 pb-20">
          {children}
        </main>

        <CustomerFooter />
        <BottomNavBar />
      </div>
    </LiffProvider>
  );
}

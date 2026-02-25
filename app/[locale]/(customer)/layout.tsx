'use client';

import {
  CustomerHeader,
  CustomerFooter,
  BottomNavBar,
} from '@/components/customer/layout';
import { LiffProvider } from '@/components/providers/LiffProvider';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LiffProvider>
      <div className="min-h-screen bg-white flex flex-col">
        <CustomerHeader cartCount={0} />

        <main className="flex-1 pt-14 pb-20">
          {children}
        </main>

        <CustomerFooter />
        <BottomNavBar />
      </div>
    </LiffProvider>
  );
}

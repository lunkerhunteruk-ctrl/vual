'use client';

import {
  CustomerHeader,
  CustomerFooter,
  BottomNavBar,
} from '@/components/customer/layout';
import { LiffProvider } from '@/components/providers/LiffProvider';
import { useStoreContext } from '@/lib/store/store-context';
import { useLocale } from 'next-intl';
import { AlertTriangle } from 'lucide-react';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const isRootDomain = useStoreContext((s) => s.isRootDomain);
  const store = useStoreContext((s) => s.store);

  const isSubscriptionExpired = store?.subscriptionStatus === 'expired' || store?.subscriptionStatus === 'canceled';

  // Root domain (LP) — render children without shop chrome
  if (isRootDomain) {
    return <>{children}</>;
  }

  return (
    <LiffProvider>
      <div className="min-h-screen bg-white flex flex-col">
        <CustomerHeader cartCount={0} />

        <main className="flex-1 pt-14 pb-20">
          {children}
        </main>

        <CustomerFooter />
        <BottomNavBar />

        {/* Subscription expired modal - blocks entire storefront */}
        {isSubscriptionExpired && (
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
              <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                {locale === 'ja' ? 'このショップは現在準備中です' : 'This shop is currently unavailable'}
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                {locale === 'ja'
                  ? 'オーナーの方はプランを更新してください。'
                  : 'Shop owner: please update your subscription plan.'}
              </p>
              <a
                href={`/${locale}/admin/billing`}
                className="inline-flex items-center justify-center px-6 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                {locale === 'ja' ? 'プランを更新する' : 'Update plan'}
              </a>
            </div>
          </div>
        )}
      </div>
    </LiffProvider>
  );
}

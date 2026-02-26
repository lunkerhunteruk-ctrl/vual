'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Sidebar, TopNav } from '@/components/admin/layout';
import { useAuthStore } from '@/lib/store';
import { useStoreContext } from '@/lib/store/store-context';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertTriangle } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/admin': 'dashboard',
  '/admin/orders': 'orders',
  '/admin/customers': 'customers',
  '/admin/coupons': 'coupons',
  '/admin/transactions': 'transactions',
  '/admin/products': 'products',
  '/admin/products/add': 'addProduct',
  '/admin/products/media': 'productMedia',
  '/admin/studio': 'aiStudio',
  '/admin/live': 'liveBroadcast',
  '/admin/billing': 'billing',
  '/admin/settings': 'settings',
  '/admin/settings/appearance': 'appearance',
  '/admin/settings/profile': 'shopProfile',
  '/admin/settings/team': 'team',
  '/admin/settings/policies': 'storePolicies',
  '/admin/settings/line': 'lineIntegration',
};

function getPageTitleKey(pathname: string, locale: string): string {
  const pathWithoutLocale = pathname.replace(`/${locale}`, '');

  // Check for exact match first
  if (pageTitles[pathWithoutLocale]) {
    return pageTitles[pathWithoutLocale];
  }

  // Check for partial match (for nested routes)
  const sortedPaths = Object.keys(pageTitles).sort((a, b) => b.length - a.length);
  for (const path of sortedPaths) {
    if (pathWithoutLocale.startsWith(path)) {
      return pageTitles[path];
    }
  }

  return 'dashboard';
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('admin.sidebar');
  const { user, isLoading } = useAuthStore();
  const store = useStoreContext((s) => s.store);
  const isRootDomain = useStoreContext((s) => s.isRootDomain);
  const [redirecting, setRedirecting] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  const isLoginPage = pathname.endsWith('/admin/login');

  // Fetch subscription status
  useEffect(() => {
    if (!store?.id || isLoginPage) return;
    (async () => {
      try {
        const res = await fetch(`/api/billing/subscription-status?storeId=${store.id}`);
        const data = await res.json();
        if (data.success) {
          setSubscriptionStatus(data.status);
        }
      } catch {
        // ignore
      }
    })();
  }, [store?.id, isLoginPage]);

  // Pages blocked when subscription is expired/canceled
  const blockedPaths = ['/admin/studio', '/admin/live'];
  const pathWithoutLocale = pathname.replace(`/${locale}`, '');
  const isBlockedPage = blockedPaths.some(p => pathWithoutLocale.startsWith(p));
  const isSubscriptionExpired = subscriptionStatus === 'expired' || subscriptionStatus === 'canceled';

  // Auth guard: redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user && !isLoginPage) {
      router.replace(`/${locale}/admin/login`);
    }
  }, [user, isLoading, isLoginPage, locale, router]);

  // On root domain, redirect logged-in user to their shop's subdomain
  useEffect(() => {
    if (!isLoading && user && isRootDomain && !isLoginPage && !redirecting && supabase) {
      setRedirecting(true);
      (async () => {
        try {
          let slug: string | null = null;
          // Try by shopId first
          if (user.shopId) {
            const { data } = await supabase.from('stores').select('slug').eq('id', user.shopId).single();
            slug = data?.slug || null;
          }
          // Fallback: search by owner_id (Firebase UID)
          if (!slug) {
            const { data } = await supabase.from('stores').select('slug').eq('owner_id', user.id).single();
            slug = data?.slug || null;
          }
          if (slug) {
            const baseDomain = window.location.hostname.split('.').slice(-2).join('.');
            window.location.href = `${window.location.protocol}//${slug}.${baseDomain}/${locale}/admin`;
          } else {
            setRedirecting(false);
          }
        } catch {
          setRedirecting(false);
        }
      })();
    }
  }, [isLoading, user, isRootDomain, isLoginPage, redirecting, locale]);

  // Login page: render without sidebar/topnav
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-page)] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
      </div>
    );
  }

  // Not authenticated — show nothing while redirecting
  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-page)] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
      </div>
    );
  }

  const titleKey = getPageTitleKey(pathname, locale);
  const title = t(titleKey);

  return (
    <div className="min-h-screen bg-[var(--color-bg-page)]">
      <Sidebar subscriptionExpired={isSubscriptionExpired} />
      <div className="ml-64">
        <TopNav title={title} />
        <main className="p-6">
          {isBlockedPage && isSubscriptionExpired ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="bg-white rounded-2xl border border-[var(--color-line)] p-8 max-w-md text-center shadow-sm">
                <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
                <h2 className="text-lg font-bold text-[var(--color-title-active)] mb-2">
                  {locale === 'ja' ? 'この機能を利用するにはプランへの加入が必要です' : 'Subscription required to access this feature'}
                </h2>
                <p className="text-sm text-[var(--color-text-body)] mb-6">
                  {locale === 'ja'
                    ? 'VUALスタジオやライブ配信をご利用いただくには、月額プランにご加入ください。'
                    : 'Please subscribe to a monthly plan to use VUAL Studio and Live Broadcast.'}
                </p>
                <a
                  href={`/${locale}/admin/billing`}
                  className="inline-flex items-center justify-center px-6 py-2.5 bg-[var(--color-accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  {locale === 'ja' ? 'プランに加入する' : 'Subscribe to a plan'}
                </a>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

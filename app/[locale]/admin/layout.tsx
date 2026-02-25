'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Sidebar, TopNav } from '@/components/admin/layout';
import { useAuthStore } from '@/lib/store';
import { useStoreContext } from '@/lib/store/store-context';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

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
  '/admin/billing': 'fittingCredit',
  '/admin/settings': 'settings',
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
  const isRootDomain = useStoreContext((s) => s.isRootDomain);
  const [redirecting, setRedirecting] = useState(false);

  const isLoginPage = pathname.endsWith('/admin/login');

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
      <Sidebar />
      <div className="ml-64">
        <TopNav title={title} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

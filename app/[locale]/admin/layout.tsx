'use client';

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Sidebar, TopNav } from '@/components/admin/layout';

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
  const t = useTranslations('admin.sidebar');

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

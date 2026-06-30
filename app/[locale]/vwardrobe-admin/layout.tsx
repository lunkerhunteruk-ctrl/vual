'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

const ADMIN_EMAIL = 'sachiokawasaki@gmail.com';

export default function VWardrobeAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, signOut } = useAuthStore();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname.includes('/vwardrobe-admin/login');

  useEffect(() => {
    if (isLoading) return;
    if (!user && !isLoginPage) {
      router.replace(`/${locale}/vwardrobe-admin/login`);
      return;
    }
    if (user && user.email !== ADMIN_EMAIL && !isLoginPage) {
      signOut();
      router.replace(`/${locale}/vwardrobe-admin/login`);
    }
  }, [user, isLoading, isLoginPage, locale, router, signOut]);

  if (isLoginPage) return <>{children}</>;

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace(`/${locale}/vwardrobe-admin/login`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-6 z-40 bg-white border-b border-gray-200">
        <span className="text-base font-semibold tracking-tight text-gray-900">
          VWARDROBE <span className="font-normal text-gray-400">Admin</span>
        </span>
        <div className="flex items-center gap-6">
          <span className="text-sm text-gray-400">{user.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar */}
        <aside className="fixed left-0 top-14 h-[calc(100vh-56px)] w-52 bg-white border-r border-gray-200 py-6 px-3">
          <nav className="space-y-0.5">
            <Link
              href={`/${locale}/vwardrobe-admin`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                color: pathname === `/${locale}/vwardrobe-admin` ? '#111' : '#888',
                background: pathname === `/${locale}/vwardrobe-admin` ? '#f3f4f6' : 'transparent',
              }}
            >
              <LayoutDashboard size={15} />
              ダッシュボード
            </Link>
          </nav>
        </aside>

        {/* Main content */}
        <main className="ml-52 flex-1 p-8 min-h-[calc(100vh-56px)]">
          {children}
        </main>
      </div>
    </div>
  );
}

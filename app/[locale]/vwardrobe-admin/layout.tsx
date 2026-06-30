'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

const MONO = "'JetBrains Mono', 'SF Mono', 'Courier New', monospace";

export default function VWardrobeAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, signOut } = useAuthStore();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname.includes('/vwardrobe-admin/login');

  useEffect(() => {
    if (!isLoading && !user && !isLoginPage) {
      router.replace(`/${locale}/vwardrobe-admin/login`);
    }
  }, [user, isLoading, isLoginPage, locale, router]);

  if (isLoginPage) return <>{children}</>;

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a', fontFamily: MONO }}>
        <div className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: '#333', borderTopColor: '#888' }} />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace(`/${locale}/vwardrobe-admin/login`);
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a', fontFamily: MONO }}>
      {/* Top bar */}
      <header
        className="fixed top-0 left-0 right-0 h-11 flex items-center justify-between px-5 z-40"
        style={{ background: '#0d0d0d', borderBottom: '1px solid #1c1c1c' }}
      >
        <span className="text-[11px] tracking-[5px] font-medium" style={{ color: '#e0e0e0' }}>
          VWARDROBE <span style={{ color: '#3a3a3a' }}>ADMIN</span>
        </span>
        <div className="flex items-center gap-5">
          <span className="text-[9px] tracking-[1px]" style={{ color: '#3a3a3a' }}>{user.email}</span>
          <button
            onClick={handleSignOut}
            className="text-[9px] tracking-[2px] transition-opacity hover:opacity-60"
            style={{ color: '#555' }}
          >
            OUT
          </button>
        </div>
      </header>

      <div className="flex pt-11">
        {/* Sidebar */}
        <aside
          className="fixed left-0 top-11 h-[calc(100vh-44px)] w-44 py-5 px-2"
          style={{ background: '#0d0d0d', borderRight: '1px solid #1c1c1c' }}
        >
          <nav className="space-y-0.5">
            <Link
              href={`/${locale}/vwardrobe-admin`}
              className="flex items-center gap-2.5 px-3 py-2 rounded text-[9px] tracking-[2px] transition-colors"
              style={{
                color: pathname === `/${locale}/vwardrobe-admin` ? '#e0e0e0' : '#444',
                background: pathname === `/${locale}/vwardrobe-admin` ? '#1a1a1a' : 'transparent',
              }}
            >
              <LayoutDashboard size={11} />
              DASHBOARD
            </Link>
          </nav>
        </aside>

        {/* Main content */}
        <main className="ml-44 flex-1 p-6 min-h-[calc(100vh-44px)]">
          {children}
        </main>
      </div>
    </div>
  );
}

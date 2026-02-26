'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Radio, Sparkles, User } from 'lucide-react';
import { useTryOnStore } from '@/lib/store/tryon';

const HIDE_ON_ROUTES = ['/checkout', '/cart'];

interface NavItem {
  key: string;
  icon: typeof Home;
  path: string;
}

const navItems: NavItem[] = [
  { key: 'home', icon: Home, path: '' },
  { key: 'live', icon: Radio, path: '/live' },
  { key: 'tryOn', icon: Sparkles, path: '/tryon' },
  { key: 'myPage', icon: User, path: '/mypage' },
];

export function BottomNavBar() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('customer.nav');
  const tryOnList = useTryOnStore((s) => s.tryOnList);
  const tryOnCount = Object.keys(tryOnList).length;
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 80) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide on certain routes
  const shouldHide = HIDE_ON_ROUTES.some((route) => pathname.includes(route));
  if (shouldHide) return null;

  const isActive = (path: string) => {
    const fullPath = `/${locale}${path}`;
    if (path === '') {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    return pathname.startsWith(fullPath);
  };

  return (
    <motion.nav
      initial={false}
      animate={{ y: visible ? 0 : 100 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[var(--color-line)] safe-area-bottom"
    >
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={`/${locale}${item.path}`}
              className="flex flex-col items-center justify-center flex-1 py-1 relative"
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={active ? 2.2 : 1.8}
                  className={`transition-colors ${
                    active
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-text-label)]'
                  }`}
                />
                {item.key === 'tryOn' && tryOnCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {tryOnCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 transition-colors ${
                  active
                    ? 'text-[var(--color-accent)] font-medium'
                    : 'text-[var(--color-text-label)]'
                }`}
              >
                {t(item.key)}
              </span>
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-0.5 w-5 h-0.5 rounded-full bg-[var(--color-accent)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}

export default BottomNavBar;

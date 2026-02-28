'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Radio, Sparkles, User } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTryOnStore } from '@/lib/store/tryon';
import { useStoreContext } from '@/lib/store/store-context';

const HIDE_ON_ROUTES = ['/checkout', '/cart', '/live/'];

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
  const tryOnPool = useTryOnStore((s) => s.tryOnPool);
  const tryOnCount = tryOnPool.length;
  const store = useStoreContext((s) => s.store);
  const [visible, setVisible] = useState(true);
  const [hasLiveStream, setHasLiveStream] = useState(false);
  const lastScrollY = useRef(0);

  // Listen for active live streams for this shop
  useEffect(() => {
    if (!db || !store?.id) return;
    const q = query(
      collection(db, 'streams'),
      where('shopId', '==', store.id),
      where('status', '==', 'live')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasLiveStream(!snapshot.empty);
    }, (error) => {
      console.warn('Live stream listener error:', error.message);
    });
    return () => unsubscribe();
  }, [store?.id]);

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
                {item.key === 'live' && hasLiveStream && (
                  <motion.div
                    className="absolute -inset-2 rounded-full bg-red-500/15"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <Icon
                  size={22}
                  strokeWidth={active ? 2.2 : 1.8}
                  className={`relative transition-colors ${
                    item.key === 'live' && hasLiveStream && !active
                      ? 'text-red-500'
                      : active
                        ? 'text-[var(--color-accent)]'
                        : 'text-[var(--color-text-label)]'
                  }`}
                />
                {item.key === 'live' && hasLiveStream && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                )}
                {item.key === 'tryOn' && tryOnCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {tryOnCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 transition-colors ${
                  item.key === 'live' && hasLiveStream && !active
                    ? 'text-red-500 font-medium'
                    : active
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

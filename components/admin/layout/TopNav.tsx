'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Globe,
  User,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { locales, localeNames, Locale } from '@/i18n';
import { useAuthStore } from '@/lib/store/auth';

interface TopNavProps {
  title: string;
}

export function TopNav({ title }: TopNavProps) {
  const t = useTranslations('admin.topnav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuthStore();

  // Close profile menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSignOut = () => {
    signOut();
    router.push(`/${locale}/admin/login`);
  };

  const handleLocaleChange = (newLocale: Locale) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
    setShowLangDropdown(false);
  };

  return (
    <header className="h-16 bg-white border-b border-[var(--color-line)] flex items-center justify-between px-6">
      {/* Page Title */}
      <h1 className="text-lg font-semibold tracking-[0.15em] text-[var(--color-title-active)] uppercase">
        {title}
      </h1>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
          />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            className="w-72 h-10 pl-10 pr-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
          title={t('notifications')}
        >
          <Bell size={20} className="text-[var(--color-text-body)]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-accent)] rounded-full" />
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
          title={isDark ? t('lightMode') : t('darkMode')}
        >
          {isDark ? (
            <Sun size={20} className="text-[var(--color-text-body)]" />
          ) : (
            <Moon size={20} className="text-[var(--color-text-body)]" />
          )}
        </button>

        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="flex items-center gap-1.5 p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
          >
            <Globe size={20} className="text-[var(--color-text-body)]" />
            <span className="text-sm font-medium text-[var(--color-text-body)] uppercase">
              {locale}
            </span>
            <ChevronDown size={14} className="text-[var(--color-text-label)]" />
          </button>

          <AnimatePresence>
            {showLangDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-40 bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] overflow-hidden z-50"
              >
                {locales.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => handleLocaleChange(loc)}
                    className={`
                      w-full px-4 py-2.5 text-left text-sm transition-colors
                      ${locale === loc
                        ? 'bg-[var(--color-bg-element)] text-[var(--color-title-active)] font-medium'
                        : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)]'
                      }
                    `}
                  >
                    {localeNames[loc]}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center">
              <User size={16} className="text-[var(--color-text-label)]" />
            </div>
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-44 bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] overflow-hidden z-50"
              >
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] transition-colors"
                >
                  <LogOut size={16} />
                  <span>{locale === 'ja' ? 'サインアウト' : 'Sign out'}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

export default TopNav;

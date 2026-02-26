'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useStoreContext } from '@/lib/store/store-context';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Ticket,
  CreditCard,
  Plus,
  Image,
  List,
  Sparkles,
  Radio,
  Store,
  User,
  ExternalLink,
  LucideIcon,
  LogOut,
  Star,
  MessageSquare,
  Shield,
  FileText,
  UsersRound,
  Palette,
  MessageCircle,
  Coins,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';

interface MenuItem {
  icon: LucideIcon;
  labelKey: string;
  href: string;
  highlight?: boolean;
}

interface MenuSection {
  sectionKey: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    sectionKey: 'mainMenu',
    items: [
      { icon: LayoutDashboard, labelKey: 'dashboard', href: '/admin' },
      { icon: ShoppingCart, labelKey: 'orders', href: '/admin/orders' },
      { icon: Users, labelKey: 'customers', href: '/admin/customers' },
      { icon: Ticket, labelKey: 'coupons', href: '/admin/coupons' },
      { icon: CreditCard, labelKey: 'transactions', href: '/admin/transactions' },
      { icon: Star, labelKey: 'brand', href: '/admin/brand' },
      { icon: FileText, labelKey: 'blog', href: '/admin/blog' },
    ],
  },
  {
    sectionKey: 'product',
    items: [
      { icon: Plus, labelKey: 'addProduct', href: '/admin/products/add' },
      { icon: Image, labelKey: 'productMedia', href: '/admin/products/media' },
      { icon: List, labelKey: 'productList', href: '/admin/products' },
      { icon: MessageSquare, labelKey: 'productReviews', href: '/admin/products/reviews' },
    ],
  },
  {
    sectionKey: '',
    items: [
      { icon: Sparkles, labelKey: 'aiStudio', href: '/admin/studio', highlight: true },
      { icon: Radio, labelKey: 'liveBroadcast', href: '/admin/live', highlight: true },
      { icon: Coins, labelKey: 'billing', href: '/admin/billing', highlight: true },
    ],
  },
  {
    sectionKey: 'admin',
    items: [
      { icon: Palette, labelKey: 'appearance', href: '/admin/settings/appearance' },
      { icon: Store, labelKey: 'shopProfile', href: '/admin/settings/profile' },
      { icon: Shield, labelKey: 'controlAuthority', href: '/admin/settings/authority' },
      { icon: UsersRound, labelKey: 'teamMembers', href: '/admin/settings/team' },
      { icon: MessageCircle, labelKey: 'lineIntegration', href: '/admin/settings/line' },
      { icon: FileText, labelKey: 'storePolicies', href: '/admin/settings/policies' },
    ],
  },
];

export function Sidebar({ subscriptionExpired = false }: { subscriptionExpired?: boolean }) {
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('admin.sidebar');
  const store = useStoreContext((s) => s.store);
  const { signOut } = useAuthStore();

  const handleSignOut = () => {
    signOut();
    router.push(`/${locale}/admin/login`);
  };

  // Pages blocked when subscription expired
  const blockedHrefs = ['/admin/studio', '/admin/live'];

  const isActive = (href: string) => {
    const localizedHref = `/${locale}${href}`;
    if (href === '/admin') {
      return pathname === localizedHref;
    }
    return pathname.startsWith(localizedHref);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-[var(--color-line)] flex flex-col z-40">
      {/* Store Name */}
      <div className="h-16 flex items-center justify-center border-b border-[var(--color-line)]">
        <Link href={`/${locale}/admin`} className="flex items-center gap-2 px-4 max-w-full">
          <span className="text-lg font-semibold text-[var(--color-title-active)] truncate">
            {store?.name || 'V U A L'}
          </span>
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {menuSections.map((section, idx) => (
          <div key={section.sectionKey || `section-${idx}`} className={idx > 0 ? 'mt-6' : ''}>
            {section.sectionKey && (
              <p className="px-3 mb-2 text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wider">
                {t(section.sectionKey)}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const isBlocked = subscriptionExpired && blockedHrefs.includes(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={isBlocked ? `/${locale}${item.href}` : `/${locale}${item.href}`}
                      className={`
                        relative flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)]
                        text-sm font-medium transition-all duration-200
                        ${isBlocked
                          ? 'opacity-40 cursor-not-allowed'
                          : active
                            ? 'bg-[var(--color-bg-element)] text-[var(--color-title-active)]'
                            : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] hover:text-[var(--color-title-active)]'
                        }
                        ${item.highlight && !isBlocked ? 'text-[var(--color-accent)]' : ''}
                      `}
                    >
                      {active && !isBlocked && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--color-accent)] rounded-r-full"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                      <Icon
                        size={18}
                        className={item.highlight && !active && !isBlocked ? 'text-[var(--color-accent)]' : ''}
                      />
                      <span>{t(item.labelKey)}</span>
                      {item.highlight && !isBlocked && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--color-line)]">
        <Link
          href={`/${locale}`}
          target="_blank"
          className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors"
        >
          <ExternalLink size={16} />
          <span>{t('yourShop')}</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 mt-2 w-full rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center">
            <LogOut size={14} className="text-[var(--color-text-label)]" />
          </div>
          <span className="text-sm text-[var(--color-text-body)]">
            {locale === 'ja' ? 'サインアウト' : 'Sign out'}
          </span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;

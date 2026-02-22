'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronRight, Phone, MapPin, Instagram, Twitter, Youtube } from 'lucide-react';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type Gender = 'women' | 'men' | 'kids';

interface SubCategory {
  label: string;
  href: string;
}

interface MenuItem {
  key: string;
  label: string;
  href: string;
  children?: SubCategory[];
}

const menuCategories: Record<Gender, MenuItem[]> = {
  women: [
    { key: 'new', label: 'New', href: '/category/new' },
    { key: 'apparel', label: 'Apparel', href: '/category/apparel', children: [
      { label: 'Outer', href: '/category/outer' },
      { label: 'Dress', href: '/category/dress' },
      { label: 'Blouse/Shirt', href: '/category/blouse' },
      { label: 'T-Shirt', href: '/category/tshirt' },
      { label: 'Knitwear', href: '/category/knitwear' },
      { label: 'Skirt', href: '/category/skirt' },
      { label: 'Pants', href: '/category/pants' },
      { label: 'Denim', href: '/category/denim' },
    ]},
    { key: 'bag', label: 'Bag', href: '/category/bag' },
    { key: 'shoes', label: 'Shoes', href: '/category/shoes' },
    { key: 'beauty', label: 'Beauty', href: '/category/beauty' },
    { key: 'accessories', label: 'Accessories', href: '/category/accessories' },
  ],
  men: [
    { key: 'new', label: 'New', href: '/category/men/new' },
    { key: 'apparel', label: 'Apparel', href: '/category/men/apparel' },
    { key: 'bag', label: 'Bag', href: '/category/men/bag' },
    { key: 'shoes', label: 'Shoes', href: '/category/men/shoes' },
    { key: 'accessories', label: 'Accessories', href: '/category/men/accessories' },
  ],
  kids: [
    { key: 'new', label: 'New', href: '/category/kids/new' },
    { key: 'apparel', label: 'Apparel', href: '/category/kids/apparel' },
    { key: 'shoes', label: 'Shoes', href: '/category/kids/shoes' },
  ],
};

export function MenuDrawer({ isOpen, onClose }: MenuDrawerProps) {
  const locale = useLocale();
  const t = useTranslations('customer.menu');
  const [activeGender, setActiveGender] = useState<Gender>('women');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const genderTabs: { key: Gender; label: string }[] = [
    { key: 'women', label: t('women') },
    { key: 'men', label: t('men') },
    { key: 'kids', label: t('kids') },
  ];

  const toggleCategory = (key: string) => {
    setExpandedCategory(expandedCategory === key ? null : key);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[85%] max-w-sm bg-white z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-end p-4 border-b border-[var(--color-line)]">
              <button
                onClick={onClose}
                className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
              >
                <X size={24} className="text-[var(--color-title-active)]" />
              </button>
            </div>

            {/* Gender Tabs */}
            <div className="flex border-b border-[var(--color-line)]">
              {genderTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveGender(tab.key)}
                  className={`flex-1 py-3 text-sm font-medium tracking-wide transition-colors relative ${
                    activeGender === tab.key
                      ? 'text-[var(--color-title-active)]'
                      : 'text-[var(--color-text-label)]'
                  }`}
                >
                  {tab.label}
                  {activeGender === tab.key && (
                    <motion.div
                      layoutId="genderUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-title-active)]"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Categories */}
            <nav className="flex-1 overflow-y-auto py-4">
              {menuCategories[activeGender].map((category) => (
                <div key={category.key}>
                  {category.children ? (
                    <>
                      <button
                        onClick={() => toggleCategory(category.key)}
                        className="flex items-center justify-between w-full px-6 py-3 text-sm text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] transition-colors"
                      >
                        <span>{category.label}</span>
                        <ChevronDown
                          size={18}
                          className={`text-[var(--color-text-label)] transition-transform ${
                            expandedCategory === category.key ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      <AnimatePresence>
                        {expandedCategory === category.key && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-[var(--color-bg-element)]"
                          >
                            {category.children.map((child) => (
                              <Link
                                key={child.href}
                                href={`/${locale}${child.href}`}
                                onClick={onClose}
                                className="flex items-center gap-2 px-8 py-2.5 text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors"
                              >
                                <span className="w-1 h-1 rounded-full bg-[var(--color-text-label)]" />
                                {child.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <Link
                      href={`/${locale}${category.href}`}
                      onClick={onClose}
                      className="flex items-center justify-between px-6 py-3 text-sm text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] transition-colors"
                    >
                      <span>{category.label}</span>
                      <ChevronRight size={18} className="text-[var(--color-text-label)]" />
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Footer */}
            <div className="border-t border-[var(--color-line)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <Phone size={16} className="text-[var(--color-text-label)]" />
                <span className="text-sm text-[var(--color-text-body)]">(786) 713-8616</span>
              </div>
              <Link
                href={`/${locale}/stores`}
                onClick={onClose}
                className="flex items-center gap-3 mb-6"
              >
                <MapPin size={16} className="text-[var(--color-text-label)]" />
                <span className="text-sm text-[var(--color-text-body)]">{t('storeLocator')}</span>
              </Link>

              {/* Social Links */}
              <div className="flex items-center gap-4">
                <a href="#" className="p-2 rounded-full bg-[var(--color-bg-element)] hover:bg-[var(--color-bg-input)] transition-colors">
                  <Twitter size={18} className="text-[var(--color-text-body)]" />
                </a>
                <a href="#" className="p-2 rounded-full bg-[var(--color-bg-element)] hover:bg-[var(--color-bg-input)] transition-colors">
                  <Instagram size={18} className="text-[var(--color-text-body)]" />
                </a>
                <a href="#" className="p-2 rounded-full bg-[var(--color-bg-element)] hover:bg-[var(--color-bg-input)] transition-colors">
                  <Youtube size={18} className="text-[var(--color-text-body)]" />
                </a>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default MenuDrawer;

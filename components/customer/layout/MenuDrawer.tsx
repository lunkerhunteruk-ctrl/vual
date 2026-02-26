'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { useStoreContext } from '@/lib/store/store-context';
import { useProductCategories, buildCategoryTree } from '@/lib/hooks/useProductCategories';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MenuDrawer({ isOpen, onClose }: MenuDrawerProps) {
  const locale = useLocale();
  const { store } = useStoreContext();
  const { slugs, isLoading } = useProductCategories();
  const tree = buildCategoryTree(slugs, locale);

  const [activeGenderIdx, setActiveGenderIdx] = useState(0);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const activeGender = tree[activeGenderIdx] || null;

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
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-line)]">
              <span className="text-sm font-semibold tracking-[0.15em] text-[var(--color-title-active)]">
                {store?.name || 'VUAL'}
              </span>
              <button
                onClick={onClose}
                className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
              >
                <X size={24} className="text-[var(--color-title-active)]" />
              </button>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[var(--color-text-label)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tree.length === 0 ? (
              <div className="flex-1 flex items-center justify-center px-6">
                <p className="text-sm text-[var(--color-text-label)] text-center">
                  {locale === 'ja' ? '商品がまだ登録されていません' : 'No products yet'}
                </p>
              </div>
            ) : (
              <>
                {/* Gender Tabs - only show if multiple genders */}
                {tree.length > 1 && (
                  <div className="flex border-b border-[var(--color-line)]">
                    {tree.map((g, idx) => (
                      <button
                        key={g.gender}
                        onClick={() => {
                          setActiveGenderIdx(idx);
                          setExpandedType(null);
                        }}
                        className={`flex-1 py-3 text-sm font-medium tracking-wide transition-colors relative ${
                          activeGenderIdx === idx
                            ? 'text-[var(--color-title-active)]'
                            : 'text-[var(--color-text-label)]'
                        }`}
                      >
                        {g.genderLabel}
                        {activeGenderIdx === idx && (
                          <motion.div
                            layoutId="menuGenderUnderline"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-title-active)]"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Category tree */}
                <nav className="flex-1 overflow-y-auto py-2">
                  {/* All products link */}
                  <Link
                    href={`/${locale}`}
                    onClick={onClose}
                    className="flex items-center justify-between px-6 py-3 text-sm text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] transition-colors"
                  >
                    <span className="font-medium">{locale === 'ja' ? 'すべて' : 'All'}</span>
                    <ChevronRight size={18} className="text-[var(--color-text-label)]" />
                  </Link>

                  {activeGender?.types.map((type) => (
                    <div key={type.type}>
                      {/* Type header (ウェア / グッズ) */}
                      <button
                        onClick={() => setExpandedType(expandedType === type.type ? null : type.type)}
                        className="flex items-center justify-between w-full px-6 py-3 text-sm text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] transition-colors"
                      >
                        <span className="font-medium">{type.typeLabel}</span>
                        <ChevronDown
                          size={18}
                          className={`text-[var(--color-text-label)] transition-transform ${
                            expandedType === type.type ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Detail categories */}
                      <AnimatePresence>
                        {expandedType === type.type && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-[var(--color-bg-element)]"
                          >
                            {type.details.map((d) => (
                              <Link
                                key={d.slug}
                                href={`/${locale}/category/${d.slug}`}
                                onClick={onClose}
                                className="flex items-center gap-2 px-8 py-2.5 text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors"
                              >
                                <span className="w-1 h-1 rounded-full bg-[var(--color-text-label)]" />
                                {d.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </nav>
              </>
            )}

            {/* Footer */}
            <div className="border-t border-[var(--color-line)] p-6">
              <div className="flex flex-col gap-2">
                <Link
                  href={`/${locale}/contact`}
                  onClick={onClose}
                  className="text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors"
                >
                  {locale === 'ja' ? 'お問い合わせ' : 'Contact'}
                </Link>
                <Link
                  href={`/${locale}/about`}
                  onClick={onClose}
                  className="text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors"
                >
                  {locale === 'ja' ? 'ブランドについて' : 'About'}
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default MenuDrawer;

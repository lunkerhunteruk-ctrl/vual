'use client';

import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ruler } from 'lucide-react';

interface SizeRow {
  size: string;
  values: Record<string, string>;
}

interface SizeSpec {
  columns: string[];
  rows: SizeRow[];
}

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  sizeSpecs: SizeSpec;
}

export function SizeGuideModal({ isOpen, onClose, sizeSpecs }: SizeGuideModalProps) {
  const locale = useLocale();

  if (!sizeSpecs?.columns?.length || !sizeSpecs?.rows?.length) return null;

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
            className="fixed inset-0 bg-black/40 z-50"
          />

          {/* Modal - slides up from bottom on mobile */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-line)]">
              <div className="flex items-center gap-2">
                <Ruler size={18} className="text-[var(--color-title-active)]" />
                <h2 className="text-base font-medium text-[var(--color-title-active)]">
                  {locale === 'ja' ? 'サイズガイド' : 'Size Guide'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-[var(--color-text-label)] hover:text-[var(--color-title-active)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-line)]">
                    <th className="text-left py-2.5 pr-4 font-medium text-[var(--color-title-active)] whitespace-nowrap">
                      {locale === 'ja' ? 'サイズ' : 'Size'}
                    </th>
                    {sizeSpecs.columns.map((col) => (
                      <th
                        key={col}
                        className="text-center py-2.5 px-3 font-medium text-[var(--color-title-active)] whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sizeSpecs.rows.map((row, idx) => (
                    <tr
                      key={row.size}
                      className={idx < sizeSpecs.rows.length - 1 ? 'border-b border-[var(--color-line)]/50' : ''}
                    >
                      <td className="py-2.5 pr-4 font-medium text-[var(--color-text-body)] whitespace-nowrap">
                        {row.size}
                      </td>
                      {sizeSpecs.columns.map((col) => (
                        <td
                          key={col}
                          className="text-center py-2.5 px-3 text-[var(--color-text-body)] whitespace-nowrap"
                        >
                          {row.values[col] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Unit note */}
              <p className="text-xs text-[var(--color-text-label)] mt-4">
                {locale === 'ja' ? '※ 単位: cm（実寸）' : '* Unit: cm (actual measurements)'}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

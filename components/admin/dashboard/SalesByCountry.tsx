'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface CountrySale {
  country: string;
  flag: string;
  amount: string;
  percentage: number;
}

const mockSales: CountrySale[] = [
  { country: 'United States', flag: '🇺🇸', amount: '$30,000', percentage: 35 },
  { country: 'Japan', flag: '🇯🇵', amount: '$25,000', percentage: 28 },
  { country: 'United Kingdom', flag: '🇬🇧', amount: '$18,000', percentage: 20 },
  { country: 'Germany', flag: '🇩🇪', amount: '$12,000', percentage: 12 },
  { country: 'France', flag: '🇫🇷', amount: '$5,000', percentage: 5 },
];

export function SalesByCountry() {
  const t = useTranslations('admin.dashboard');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
          {t('salesByCountry')}
        </h3>
      </div>

      <div className="space-y-4">
        {mockSales.map((sale) => (
          <div key={sale.country} className="flex items-center gap-3">
            <span className="text-xl">{sale.flag}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-[var(--color-title-active)] truncate">
                  {sale.country}
                </p>
                <p className="text-sm font-medium text-[var(--color-title-active)]">
                  {sale.amount}
                </p>
              </div>
              <div className="h-1.5 bg-[var(--color-bg-element)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${sale.percentage}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="h-full bg-[var(--color-accent)] rounded-full"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--color-line)]">
        <button className="flex items-center gap-2 text-sm text-[var(--color-accent)] hover:underline">
          <TrendingUp size={14} />
          {t('viewInsight')}
        </button>
      </div>
    </motion.div>
  );
}

export default SalesByCountry;

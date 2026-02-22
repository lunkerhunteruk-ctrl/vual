'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

const realtimeData = [30, 45, 60, 80, 65, 90, 75, 85, 70, 95, 80, 60];

export function RealtimeUsers() {
  const t = useTranslations('admin.dashboard');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center">
          <Users size={18} className="text-[var(--color-accent)]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
            {t('realtimeUsers')}
          </h3>
          <p className="text-xs text-[var(--color-text-label)]">{t('usersPerMinute')}</p>
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold text-[var(--color-title-active)]">21.5K</span>
        <span className="text-sm text-[var(--color-success)]">+12.5%</span>
      </div>

      {/* Mini bar chart */}
      <div className="h-16 flex items-end justify-between gap-1">
        {realtimeData.map((value, index) => (
          <motion.div
            key={index}
            initial={{ height: 0 }}
            animate={{ height: `${value}%` }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="flex-1 bg-[var(--color-accent)] rounded-t-sm opacity-70 hover:opacity-100 transition-opacity"
          />
        ))}
      </div>
    </motion.div>
  );
}

export default RealtimeUsers;

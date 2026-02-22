'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Users, Package, AlertTriangle, DollarSign } from 'lucide-react';

type TimeRange = 'thisWeek' | 'lastWeek';

const mockData = {
  thisWeek: {
    customers: '52k',
    products: '3.5k',
    stock: '2.5k',
    revenue: '$250k',
  },
  lastWeek: {
    customers: '48k',
    products: '3.2k',
    stock: '2.8k',
    revenue: '$220k',
  },
};

// Simple chart bars data
const chartData = [
  { day: 'Sun', value: 65 },
  { day: 'Mon', value: 85 },
  { day: 'Tue', value: 70 },
  { day: 'Wed', value: 90 },
  { day: 'Thu', value: 75 },
  { day: 'Fri', value: 95 },
  { day: 'Sat', value: 80 },
];

export function WeeklyReport() {
  const t = useTranslations('admin.dashboard');
  const [timeRange, setTimeRange] = useState<TimeRange>('thisWeek');
  const data = mockData[timeRange];

  const stats = [
    { icon: Users, label: t('customers'), value: data.customers },
    { icon: Package, label: t('totalProducts'), value: data.products },
    { icon: AlertTriangle, label: t('stockProducts'), value: data.stock },
    { icon: DollarSign, label: t('revenue'), value: data.revenue },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
          {t('reportThisWeek')}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimeRange('thisWeek')}
            className={`px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] transition-colors ${
              timeRange === 'thisWeek'
                ? 'bg-[var(--color-title-active)] text-white'
                : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-input)]'
            }`}
          >
            {t('thisWeek')}
          </button>
          <button
            onClick={() => setTimeRange('lastWeek')}
            className={`px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] transition-colors ${
              timeRange === 'lastWeek'
                ? 'bg-[var(--color-title-active)] text-white'
                : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-input)]'
            }`}
          >
            {t('lastWeek')}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-bg-element)] mb-2">
                <Icon size={18} className="text-[var(--color-text-body)]" />
              </div>
              <p className="text-lg font-semibold text-[var(--color-title-active)]">{stat.value}</p>
              <p className="text-xs text-[var(--color-text-label)]">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Simple Bar Chart */}
      <div className="h-40 flex items-end justify-between gap-2 px-2">
        {chartData.map((item) => (
          <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${item.value}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full bg-[var(--color-accent)] rounded-t-[var(--radius-sm)] opacity-80"
            />
            <span className="text-xs text-[var(--color-text-label)]">{item.day}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default WeeklyReport;

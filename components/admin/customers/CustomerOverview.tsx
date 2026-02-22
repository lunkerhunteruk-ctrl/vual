'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Users, UserPlus, Eye, TrendingUp } from 'lucide-react';

const chartData = [
  { day: 'Mon', value: 65 },
  { day: 'Tue', value: 85 },
  { day: 'Wed', value: 70 },
  { day: 'Thu', value: 90 },
  { day: 'Fri', value: 75 },
  { day: 'Sat', value: 95 },
  { day: 'Sun', value: 80 },
];

export function CustomerOverview() {
  const t = useTranslations('admin.customers');
  const [timeRange, setTimeRange] = useState<'thisWeek' | 'lastWeek'>('thisWeek');

  const stats = [
    { icon: Users, label: t('activeCustomers'), value: '25k', color: 'text-[var(--color-accent)]' },
    { icon: UserPlus, label: t('repeatCustomers'), value: '5.6k', color: 'text-emerald-600' },
    { icon: Eye, label: t('shopVisitors'), value: '250k', color: 'text-blue-600' },
    { icon: TrendingUp, label: t('conversionRate'), value: '5.5%', color: 'text-amber-600' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
          {t('customerOverview')}
        </h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as 'thisWeek' | 'lastWeek')}
          className="px-3 py-1.5 text-xs font-medium bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)]"
        >
          <option value="thisWeek">This Week</option>
          <option value="lastWeek">Last Week</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="text-center">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-bg-element)] mb-2`}>
                <Icon size={18} className={stat.color} />
              </div>
              <p className="text-lg font-semibold text-[var(--color-title-active)]">{stat.value}</p>
              <p className="text-xs text-[var(--color-text-label)]">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Simple Line Chart Visualization */}
      <div className="h-32 flex items-end justify-between gap-2 px-2">
        {chartData.map((item, index) => (
          <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${item.value}%` }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="w-full bg-gradient-to-t from-[var(--color-accent)] to-[var(--color-secondary)] rounded-t-[var(--radius-sm)] opacity-70"
            />
            <span className="text-xs text-[var(--color-text-label)]">{item.day}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default CustomerOverview;

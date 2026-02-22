'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Edit2, Trash2, Copy, Loader2 } from 'lucide-react';
import { useCoupons } from '@/lib/hooks';
import type { Coupon } from '@/lib/types';

type CouponStatus = 'active' | 'expired' | 'scheduled';

const typeLabels: Record<Coupon['type'], string> = {
  percentage: 'Percentage',
  fixed_amount: 'Fixed Amount',
  free_shipping: 'Free Shipping',
};

const statusColors: Record<CouponStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  expired: 'bg-red-50 text-red-700',
  scheduled: 'bg-blue-50 text-blue-700',
};

type TabFilter = 'all' | 'active' | 'expired' | 'scheduled';

interface CouponsTableProps {
  shopId?: string;
}

export function CouponsTable({ shopId }: CouponsTableProps) {
  const t = useTranslations('admin.coupons');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { coupons, isLoading, error, deleteCoupon } = useCoupons({ shopId });

  const getStatus = (coupon: Coupon): CouponStatus => {
    const now = new Date();
    if (coupon.startsAt > now) return 'scheduled';
    if (coupon.expiresAt < now || !coupon.isActive) return 'expired';
    return 'active';
  };

  const tabCounts = useMemo(() => {
    return {
      all: coupons.length,
      active: coupons.filter(c => getStatus(c) === 'active').length,
      expired: coupons.filter(c => getStatus(c) === 'expired').length,
      scheduled: coupons.filter(c => getStatus(c) === 'scheduled').length,
    };
  }, [coupons]);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: t('all'), count: tabCounts.all },
    { key: 'active', label: t('active'), count: tabCounts.active },
    { key: 'expired', label: t('expired'), count: tabCounts.expired },
    { key: 'scheduled', label: t('scheduled'), count: tabCounts.scheduled },
  ];

  const filteredCoupons = useMemo(() => {
    let result = coupons;

    if (activeTab !== 'all') {
      result = result.filter(c => getStatus(c) === activeTab);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => c.code.toLowerCase().includes(query));
    }

    return result;
  }, [coupons, activeTab, searchQuery]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const formatValue = (coupon: Coupon) => {
    if (coupon.type === 'percentage') return `${coupon.value}%`;
    if (coupon.type === 'fixed_amount') return `$${coupon.value}`;
    return 'Free';
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('confirmDelete'))) {
      try {
        await deleteCoupon(id);
      } catch (err) {
        console.error('Failed to delete coupon:', err);
      }
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        {error.message}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)]"
    >
      {/* Tabs and Search */}
      <div className="p-4 border-b border-[var(--color-line)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[var(--color-title-active)] text-white'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)]'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        <div className="relative max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchCoupons')}
            className="w-full h-10 pl-9 pr-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-[var(--color-text-label)]">{t('noCoupons')}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-line)] bg-[var(--color-bg-element)]">
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('code')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('type')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('value')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('usage')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('validity')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('status')}
                </th>
                <th className="w-24 py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.map((coupon) => {
                const status = getStatus(coupon);
                return (
                  <tr
                    key={coupon.id}
                    className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium text-[var(--color-title-active)]">
                          {coupon.code}
                        </span>
                        <button
                          onClick={() => copyCode(coupon.code)}
                          className="p-1 rounded hover:bg-[var(--color-bg-input)] transition-colors"
                        >
                          <Copy size={14} className="text-[var(--color-text-label)]" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                      {typeLabels[coupon.type]}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-[var(--color-title-active)]">
                      {formatValue(coupon)}
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                      {coupon.usageCount} / {coupon.usageLimit || '∞'}
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                      {formatDate(coupon.startsAt)} - {formatDate(coupon.expiresAt)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors">
                          <Edit2 size={14} className="text-[var(--color-text-label)]" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors"
                        >
                          <Trash2 size={14} className="text-[var(--color-text-label)]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}

export default CouponsTable;

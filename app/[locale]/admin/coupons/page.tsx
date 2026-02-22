'use client';

import { useTranslations } from 'next-intl';
import { Plus, MoreHorizontal, Ticket, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { StatCard } from '@/components/admin/dashboard';
import { CouponsTable } from '@/components/admin/coupons';

export default function CouponsPage() {
  const t = useTranslations('admin.coupons');

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="primary" leftIcon={<Plus size={16} />}>
          {t('addCoupon')}
        </Button>
        <Button variant="secondary" leftIcon={<MoreHorizontal size={16} />}>
          {t('moreAction')}
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('totalCoupons')}
          value="24"
          change={{ value: '12%', isPositive: true }}
          icon={Ticket}
        />
        <StatCard
          title={t('activeCoupons')}
          value="18"
          change={{ value: '8%', isPositive: true }}
          icon={CheckCircle}
        />
        <StatCard
          title={t('totalRedemptions')}
          value="1,245"
          change={{ value: '24%', isPositive: true }}
          icon={Clock}
        />
        <StatCard
          title={t('expiredCoupons')}
          value="6"
          subtitle="25%"
          icon={XCircle}
        />
      </div>

      {/* Coupons Table */}
      <CouponsTable />
    </div>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { Plus, MoreHorizontal, ShoppingCart, Package, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { StatCard } from '@/components/admin/dashboard';
import { OrdersTable } from '@/components/admin/orders';

export default function OrdersPage() {
  const t = useTranslations('admin.orders');

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="primary" leftIcon={<Plus size={16} />}>
          {t('addOrder')}
        </Button>
        <Button variant="secondary" leftIcon={<MoreHorizontal size={16} />}>
          {t('moreAction')}
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('totalOrders')}
          value="1,240"
          change={{ value: '14.4%', isPositive: true }}
          icon={ShoppingCart}
        />
        <StatCard
          title={t('newOrders')}
          value="240"
          change={{ value: '20%', isPositive: true }}
          icon={Package}
        />
        <StatCard
          title={t('completedOrders')}
          value="960"
          subtitle="85%"
          icon={CheckCircle}
        />
        <StatCard
          title={t('cancelledOrders')}
          value="87"
          change={{ value: '5%', isPositive: false }}
          icon={XCircle}
        />
      </div>

      {/* Orders Table */}
      <OrdersTable />
    </div>
  );
}

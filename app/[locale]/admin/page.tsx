'use client';

import { useTranslations } from 'next-intl';
import { DollarSign, ShoppingCart, Clock, XCircle } from 'lucide-react';
import {
  StatCard,
  RecentTransactions,
  TopProducts,
  WeeklyReport,
  SalesByCountry,
  RealtimeUsers,
} from '@/components/admin/dashboard';

export default function AdminDashboard() {
  const t = useTranslations('admin.dashboard');

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title={t('totalSales')}
          value="$350,000"
          change={{ value: '10.4%', isPositive: true }}
          subtitle={t('last7Days')}
          icon={DollarSign}
          detailsLabel="Details"
        />
        <StatCard
          title={t('totalOrders')}
          value="10,700"
          change={{ value: '14.4%', isPositive: true }}
          subtitle={t('last7Days')}
          icon={ShoppingCart}
          detailsLabel="Details"
        />
        <StatCard
          title={t('pending')}
          value="509"
          change={{ value: '14.4%', isPositive: false }}
          subtitle={`${t('cancelled')} 94`}
          icon={Clock}
          detailsLabel="Details"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <WeeklyReport />
          <RecentTransactions />
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          <RealtimeUsers />
          <SalesByCountry />
          <TopProducts />
        </div>
      </div>
    </div>
  );
}

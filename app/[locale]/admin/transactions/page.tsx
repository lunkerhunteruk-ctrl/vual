'use client';

import { useTranslations } from 'next-intl';
import { DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';
import { StatCard } from '@/components/admin/dashboard';
import { TransactionsTable, PaymentMethodCard } from '@/components/admin/transactions';

export default function TransactionsPage() {
  const t = useTranslations('admin.transactions');

  return (
    <div className="space-y-6">
      {/* Stats and Payment Method Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Stats Cards */}
        <div className="space-y-4">
          <StatCard
            title={t('totalRevenue')}
            value="$15,045"
            change={{ value: '14.4%', isPositive: true }}
            icon={DollarSign}
          />
          <StatCard
            title={t('completedTransactions')}
            value="3,150"
            change={{ value: '20%', isPositive: true }}
            icon={CheckCircle}
          />
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title={t('pendingTransactions')}
              value="150"
              subtitle="85%"
              icon={Clock}
            />
            <StatCard
              title={t('failedTransactions')}
              value="75"
              subtitle="15%"
              icon={XCircle}
            />
          </div>
        </div>

        {/* Right - Payment Method Card */}
        <div className="lg:col-span-2">
          <PaymentMethodCard />
        </div>
      </div>

      {/* Transactions Table */}
      <TransactionsTable />
    </div>
  );
}

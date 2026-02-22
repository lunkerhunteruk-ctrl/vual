'use client';

import { useTranslations } from 'next-intl';
import { Users, UserPlus, Eye } from 'lucide-react';
import { StatCard } from '@/components/admin/dashboard';
import { CustomerTable, CustomerOverview } from '@/components/admin/customers';

export default function CustomersPage() {
  const t = useTranslations('admin.customers');

  return (
    <div className="space-y-6">
      {/* Stats and Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Stats Cards */}
        <div className="space-y-4">
          <StatCard
            title={t('totalCustomers')}
            value="11,040"
            change={{ value: '14.4%', isPositive: true }}
            icon={Users}
          />
          <StatCard
            title={t('newCustomers')}
            value="2,370"
            change={{ value: '20%', isPositive: true }}
            icon={UserPlus}
          />
          <StatCard
            title={t('visitors')}
            value="250k"
            change={{ value: '20%', isPositive: true }}
            icon={Eye}
          />
        </div>

        {/* Right - Customer Overview */}
        <div className="lg:col-span-2">
          <CustomerOverview />
        </div>
      </div>

      {/* Customer Details Section */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-4">
          {t('customerDetails')}
        </h3>
        <CustomerTable />
      </div>
    </div>
  );
}

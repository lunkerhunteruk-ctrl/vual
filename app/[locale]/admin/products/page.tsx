'use client';

import { useTranslations } from 'next-intl';
import { Plus, MoreHorizontal, Package, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { StatCard } from '@/components/admin/dashboard';
import { ProductsTable } from '@/components/admin/products';

export default function ProductsListPage() {
  const t = useTranslations('admin.products');

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="primary" leftIcon={<Plus size={16} />}>
          {t('addProduct')}
        </Button>
        <Button variant="secondary" leftIcon={<MoreHorizontal size={16} />}>
          {t('moreAction')}
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('totalProducts')}
          value="145"
          change={{ value: '12%', isPositive: true }}
          icon={Package}
        />
        <StatCard
          title={t('published')}
          value="120"
          subtitle="83%"
          icon={CheckCircle}
        />
        <StatCard
          title={t('lowStock')}
          value="15"
          change={{ value: '5%', isPositive: false }}
          icon={AlertTriangle}
        />
        <StatCard
          title={t('outOfStock')}
          value="10"
          change={{ value: '3%', isPositive: false }}
          icon={XCircle}
        />
      </div>

      {/* Products Table */}
      <ProductsTable />
    </div>
  );
}

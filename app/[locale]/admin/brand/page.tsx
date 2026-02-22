'use client';

import { useTranslations } from 'next-intl';
import { Plus, MoreHorizontal, Star, Package, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui';
import { StatCard } from '@/components/admin/dashboard';
import { BrandTable } from '@/components/admin/brand';

export default function BrandPage() {
  const t = useTranslations('admin.brand');

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="primary" leftIcon={<Plus size={16} />}>
          {t('addBrand')}
        </Button>
        <Button variant="secondary" leftIcon={<MoreHorizontal size={16} />}>
          {t('moreAction')}
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title={t('totalBrands')}
          value="24"
          change={{ value: '8%', isPositive: true }}
          icon={Star}
        />
        <StatCard
          title={t('activeBrands')}
          value="22"
          subtitle="92%"
          icon={TrendingUp}
        />
        <StatCard
          title={t('totalProducts')}
          value="180"
          change={{ value: '15%', isPositive: true }}
          icon={Package}
        />
      </div>

      {/* Brands Table */}
      <BrandTable />
    </div>
  );
}

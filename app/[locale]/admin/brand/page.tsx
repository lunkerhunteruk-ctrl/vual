'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Star, Package, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/admin/dashboard';
import { BrandTable } from '@/components/admin/brand';

export default function BrandPage() {
  const t = useTranslations('admin.brand');
  const [stats, setStats] = useState({ total: 0, active: 0, totalProducts: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/brands');
        const data = await res.json();
        if (data.brands) {
          const brands = data.brands;
          setStats({
            total: brands.length,
            active: brands.filter((b: any) => b.is_active).length,
            totalProducts: brands.reduce((sum: number, b: any) => sum + (b.productCount || 0), 0),
          });
        }
      } catch (err) {
        console.error('Failed to fetch brand stats:', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title={t('totalBrands')}
          value={stats.total.toString()}
          icon={Star}
        />
        <StatCard
          title={t('activeBrands')}
          value={stats.active.toString()}
          subtitle={stats.total > 0 ? `${Math.round(stats.active / stats.total * 100)}%` : '0%'}
          icon={TrendingUp}
        />
        <StatCard
          title={t('totalProducts')}
          value={stats.totalProducts.toString()}
          icon={Package}
        />
      </div>

      {/* Brands Table */}
      <BrandTable />
    </div>
  );
}

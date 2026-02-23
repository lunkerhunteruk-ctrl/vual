'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Plus, MoreHorizontal, Package, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { StatCard } from '@/components/admin/dashboard';
import { ProductsTable } from '@/components/admin/products';

export default function ProductsListPage() {
  const t = useTranslations('admin.products');
  const locale = useLocale();
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0 });

  // Fetch stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/products?status=all&limit=1000');
        const data = await response.json();
        if (data.products) {
          setStats({
            total: data.products.length,
            published: data.products.filter((p: any) => p.status === 'published').length,
            draft: data.products.filter((p: any) => p.status === 'draft').length,
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end gap-3">
        <Link href={`/${locale}/admin/products/add`}>
          <Button variant="primary" leftIcon={<Plus size={16} />}>
            {t('addProduct')}
          </Button>
        </Link>
        <Button variant="secondary" leftIcon={<MoreHorizontal size={16} />}>
          {t('moreAction')}
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('totalProducts')}
          value={stats.total.toString()}
          icon={Package}
        />
        <StatCard
          title={t('published')}
          value={stats.published.toString()}
          subtitle={stats.total > 0 ? `${Math.round(stats.published / stats.total * 100)}%` : '0%'}
          icon={CheckCircle}
        />
        <StatCard
          title={t('draft')}
          value={stats.draft.toString()}
          icon={AlertTriangle}
        />
        <StatCard
          title={t('outOfStock')}
          value="0"
          icon={XCircle}
        />
      </div>

      {/* Products Table */}
      <ProductsTable />
    </div>
  );
}

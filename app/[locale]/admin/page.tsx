'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { DollarSign, ShoppingCart, Clock, X, MessageCircle } from 'lucide-react';
import {
  StatCard,
  RecentTransactions,
  TopProducts,
  WeeklyReport,
  SalesByCountry,
  RealtimeUsers,
} from '@/components/admin/dashboard';

const VUAL_LINE_URL = 'https://line.me/R/ti/p/@391hwzek';
const BANNER_DISMISSED_KEY = 'vual-line-banner-dismissed';

export default function AdminDashboard() {
  const t = useTranslations('admin.dashboard');
  const [showLineBanner, setShowLineBanner] = useState(false);

  useEffect(() => {
    setShowLineBanner(!localStorage.getItem(BANNER_DISMISSED_KEY));
  }, []);

  const dismissBanner = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, '1');
    setShowLineBanner(false);
  };

  return (
    <div className="space-y-6">
      {/* VUAL Official LINE Banner */}
      {showLineBanner && (
        <div className="relative flex items-center gap-3 px-4 py-3 bg-[#06C755]/10 border border-[#06C755]/30 rounded-[var(--radius-md)]">
          <MessageCircle size={20} className="text-[#06C755] flex-shrink-0" />
          <p className="text-sm text-[var(--color-text-body)] flex-1">
            <span className="font-medium">VUAL公式LINE</span>で最新機能やアップデート情報をお届けします。
            <a
              href={VUAL_LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 inline-flex items-center gap-1 text-[#06C755] font-medium hover:underline"
            >
              友だち追加する →
            </a>
          </p>
          <button
            onClick={dismissBanner}
            className="p-1 text-[var(--color-text-label)] hover:text-[var(--color-text-body)] flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

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

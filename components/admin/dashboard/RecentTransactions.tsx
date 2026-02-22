'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Filter, Loader2 } from 'lucide-react';
import { useOrders } from '@/lib/hooks/useOrders';
import { formatPrice } from '@/lib/utils/currency';

const statusColors: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-red-50 text-red-700',
  failed: 'bg-red-50 text-red-700',
  refunded: 'bg-gray-50 text-gray-700',
};

const statusDotColors: Record<string, string> = {
  paid: 'bg-emerald-500',
  pending: 'bg-amber-500',
  cancelled: 'bg-red-500',
  failed: 'bg-red-500',
  refunded: 'bg-gray-500',
};

export function RecentTransactions() {
  const t = useTranslations('admin.dashboard');
  const locale = useLocale();

  // Fetch recent orders (which contain payment info)
  const { orders, isLoading } = useOrders({ limit: 5 });

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return formatPrice(amount, currency, locale, true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
          {t('recentTransactions')}
        </h3>
        <button className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors">
          <Filter size={16} className="text-[var(--color-text-label)]" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-line)]">
              <th className="text-left py-3 px-2 text-xs font-medium text-[var(--color-text-label)] uppercase">
                No
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-[var(--color-text-label)] uppercase">
                Customer
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-[var(--color-text-label)] uppercase">
                Date
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-[var(--color-text-label)] uppercase">
                Status
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-[var(--color-text-label)] uppercase">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-10 text-center">
                  <Loader2 size={20} className="animate-spin mx-auto text-[var(--color-text-label)]" />
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-[var(--color-text-label)]">
                  No transactions yet
                </td>
              </tr>
            ) : (
              orders.map((order, index) => (
                <tr
                  key={order.id}
                  className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors"
                >
                  <td className="py-3 px-2 text-sm text-[var(--color-text-body)]">
                    {index + 1}.
                  </td>
                  <td className="py-3 px-2 text-sm text-[var(--color-title-active)]">
                    #{order.orderNumber || order.id.slice(-4).toUpperCase()}
                  </td>
                  <td className="py-3 px-2 text-sm text-[var(--color-text-body)]">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[order.paymentStatus] || 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          statusDotColors[order.paymentStatus] || 'bg-gray-500'
                        }`}
                      />
                      {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-sm text-[var(--color-title-active)] text-right font-medium">
                    {formatCurrency(order.total, order.currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-right">
        <button className="text-sm text-[var(--color-accent)] hover:underline">
          View All Transactions
        </button>
      </div>
    </motion.div>
  );
}

export default RecentTransactions;

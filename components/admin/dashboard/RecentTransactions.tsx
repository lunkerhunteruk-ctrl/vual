'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';

interface Transaction {
  id: string;
  orderId: string;
  customer: string;
  date: string;
  amount: string;
  status: 'paid' | 'pending' | 'cancelled';
}

const mockTransactions: Transaction[] = [
  { id: '1', orderId: '#6545', customer: 'John Doe', date: '01 Oct', amount: '$240.00', status: 'paid' },
  { id: '2', orderId: '#5412', customer: 'Jane Smith', date: '01 Oct', amount: '$120.00', status: 'pending' },
  { id: '3', orderId: '#6622', customer: 'Mike Johnson', date: '01 Oct', amount: '$89.00', status: 'paid' },
  { id: '4', orderId: '#7891', customer: 'Sarah Williams', date: '30 Sep', amount: '$450.00', status: 'paid' },
  { id: '5', orderId: '#4521', customer: 'Tom Brown', date: '30 Sep', amount: '$67.00', status: 'cancelled' },
];

const statusColors = {
  paid: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-red-50 text-red-700',
};

export function RecentTransactions() {
  const t = useTranslations('admin.dashboard');

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
            {mockTransactions.map((transaction, index) => (
              <tr
                key={transaction.id}
                className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors"
              >
                <td className="py-3 px-2 text-sm text-[var(--color-text-body)]">
                  {index + 1}.
                </td>
                <td className="py-3 px-2 text-sm text-[var(--color-title-active)]">
                  {transaction.orderId}
                </td>
                <td className="py-3 px-2 text-sm text-[var(--color-text-body)]">
                  {transaction.date}
                </td>
                <td className="py-3 px-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      statusColors[transaction.status]
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        transaction.status === 'paid'
                          ? 'bg-emerald-500'
                          : transaction.status === 'pending'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                    />
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </span>
                </td>
                <td className="py-3 px-2 text-sm text-[var(--color-title-active)] text-right font-medium">
                  {transaction.amount}
                </td>
              </tr>
            ))}
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

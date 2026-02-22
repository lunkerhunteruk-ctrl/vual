'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Eye } from 'lucide-react';
import { Pagination } from '@/components/ui';

type TransactionStatus = 'completed' | 'pending' | 'failed';
type PaymentMethod = 'credit_card' | 'paypal' | 'bank_transfer' | 'stripe';

interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: string;
  method: PaymentMethod;
  status: TransactionStatus;
}

const mockTransactions: Transaction[] = [
  { id: '1', customerId: '#CUST001', customerName: 'John Doe', date: '01-01-2025', amount: '$2,904', method: 'credit_card', status: 'completed' },
  { id: '2', customerId: '#CUST002', customerName: 'Jane Smith', date: '01-01-2025', amount: '$1,280', method: 'stripe', status: 'completed' },
  { id: '3', customerId: '#CUST003', customerName: 'Mike Johnson', date: '02-01-2025', amount: '$890', method: 'paypal', status: 'pending' },
  { id: '4', customerId: '#CUST004', customerName: 'Sarah Williams', date: '02-01-2025', amount: '$320', method: 'bank_transfer', status: 'failed' },
  { id: '5', customerId: '#CUST005', customerName: 'Tom Brown', date: '03-01-2025', amount: '$4,520', method: 'credit_card', status: 'completed' },
  { id: '6', customerId: '#CUST006', customerName: 'Emily Davis', date: '03-01-2025', amount: '$540', method: 'stripe', status: 'completed' },
  { id: '7', customerId: '#CUST007', customerName: 'David Wilson', date: '04-01-2025', amount: '$1,890', method: 'credit_card', status: 'pending' },
  { id: '8', customerId: '#CUST008', customerName: 'Lisa Anderson', date: '04-01-2025', amount: '$670', method: 'paypal', status: 'completed' },
];

const statusColors: Record<TransactionStatus, string> = {
  completed: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
};

const methodLabels: Record<PaymentMethod, string> = {
  credit_card: 'Credit Card',
  paypal: 'PayPal',
  bank_transfer: 'Bank Transfer',
  stripe: 'Stripe',
};

type TabFilter = 'all' | 'completed' | 'pending' | 'failed';

export function TransactionsTable() {
  const t = useTranslations('admin.transactions');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: 240 },
    { key: 'completed', label: t('complete'), count: 180 },
    { key: 'pending', label: 'Pending', count: 45 },
    { key: 'failed', label: 'Failed', count: 15 },
  ];

  const filteredTransactions = activeTab === 'all'
    ? mockTransactions
    : mockTransactions.filter(tx => tx.status === activeTab);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)]"
    >
      {/* Tabs and Search */}
      <div className="p-4 border-b border-[var(--color-line)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[var(--color-title-active)] text-white'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)]'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        <div className="relative max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
          />
          <input
            type="text"
            placeholder={t('searchHistory')}
            className="w-full h-10 pl-9 pr-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-line)] bg-[var(--color-bg-element)]">
              <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                Customer
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                Name
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                Date
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                Total
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                {t('method')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                Status
              </th>
              <th className="w-20 py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((transaction) => (
              <tr
                key={transaction.id}
                className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors"
              >
                <td className="py-3 px-4 text-sm font-medium text-[var(--color-title-active)]">
                  {transaction.customerId}
                </td>
                <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                  {transaction.customerName}
                </td>
                <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                  {transaction.date}
                </td>
                <td className="py-3 px-4 text-sm font-medium text-[var(--color-title-active)]">
                  {transaction.amount}
                </td>
                <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                  {methodLabels[transaction.method]}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[transaction.status]}`}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button className="flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:underline">
                    <Eye size={14} />
                    {t('viewDetails')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-[var(--color-line)]">
        <Pagination
          currentPage={currentPage}
          totalPages={12}
          onPageChange={setCurrentPage}
        />
      </div>
    </motion.div>
  );
}

export default TransactionsTable;

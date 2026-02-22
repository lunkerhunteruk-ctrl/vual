'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Eye, Loader2 } from 'lucide-react';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { formatPrice } from '@/lib/utils/currency';
import type { Transaction } from '@/lib/types';

type TransactionStatus = 'pending' | 'completed' | 'failed';

const statusColors: Record<TransactionStatus, string> = {
  completed: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
};

type TabFilter = 'all' | 'completed' | 'pending' | 'failed';

export function TransactionsTable() {
  const t = useTranslations('admin.transactions');
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real transactions from Firestore
  const statusFilter = activeTab === 'all' ? undefined : activeTab as TransactionStatus;
  const { transactions: firestoreTransactions, isLoading, hasMore, loadMore } = useTransactions({
    status: statusFilter,
    limit: 20,
  });

  // Calculate tab counts
  const { transactions: allTransactions } = useTransactions({ limit: 1000 });
  const tabCounts = useMemo(() => {
    if (!allTransactions) return { all: 0, completed: 0, pending: 0, failed: 0 };
    return {
      all: allTransactions.length,
      completed: allTransactions.filter(t => t.status === 'completed').length,
      pending: allTransactions.filter(t => t.status === 'pending').length,
      failed: allTransactions.filter(t => t.status === 'failed').length,
    };
  }, [allTransactions]);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: tabCounts.all },
    { key: 'completed', label: t('complete'), count: tabCounts.completed },
    { key: 'pending', label: 'Pending', count: tabCounts.pending },
    { key: 'failed', label: 'Failed', count: tabCounts.failed },
  ];

  // Filter transactions by search
  const filteredTransactions = useMemo(() => {
    if (!firestoreTransactions) return [];
    if (!searchQuery.trim()) return firestoreTransactions;

    const query = searchQuery.toLowerCase();
    return firestoreTransactions.filter(tx =>
      tx.orderId?.toLowerCase().includes(query) ||
      tx.paymentMethod?.toLowerCase().includes(query)
    );
  }, [firestoreTransactions, searchQuery]);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return formatPrice(amount, currency, locale, true);
  };

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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-20 text-center">
                  <Loader2 size={24} className="animate-spin mx-auto text-[var(--color-text-label)]" />
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center text-sm text-[var(--color-text-label)]">
                  No transactions found
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors"
                >
                  <td className="py-3 px-4 text-sm font-medium text-[var(--color-title-active)]">
                    #{transaction.orderId?.slice(-6).toUpperCase() || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {transaction.paymentProvider || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {formatDate(transaction.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-[var(--color-title-active)]">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {transaction.paymentMethod || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[transaction.status as TransactionStatus] || 'bg-gray-50 text-gray-700'}`}>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Load More */}
      <div className="p-4 border-t border-[var(--color-line)]">
        {hasMore ? (
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="w-full py-2 text-sm text-[var(--color-text-body)] border border-[var(--color-line)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        ) : filteredTransactions.length > 0 ? (
          <p className="text-center text-sm text-[var(--color-text-label)]">
            Showing all {filteredTransactions.length} transactions
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}

export default TransactionsTable;

'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Mail, Phone, ShoppingBag, Calendar, Loader2, ExternalLink, Users } from 'lucide-react';
import { useCustomers } from '@/lib/hooks/useCustomers';
import { formatPrice, getDefaultCurrency } from '@/lib/utils/currency';
import { EmptyState } from '@/components/ui/EmptyState';

type CustomerStatus = 'active' | 'inactive' | 'vip';

interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  total_orders: number;
  total_spent: number;
  created_at: string;
}

const statusColors: Record<CustomerStatus, { bg: string; text: string }> = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-600' },
  vip: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

// Helper to determine customer status based on spending
const getCustomerStatus = (customer: Customer): CustomerStatus => {
  if (customer.total_spent > 100000) return 'vip'; // VIP if spent over 100,000
  if (customer.total_orders === 0) return 'inactive';
  return 'active';
};

export function CustomerTable() {
  const t = useTranslations('admin.customers');
  const locale = useLocale();
  const defaultCurrency = getDefaultCurrency(locale);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch customers from Supabase API
  const { customers, isLoading, hasMore, loadMore } = useCustomers({
    search: searchQuery,
    limit: 20,
  });

  // Filter customers by search query
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    return customers;
  }, [customers]);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return formatPrice(amount, defaultCurrency, locale, true);
  };

  return (
    <div className="flex gap-6">
      {/* Main Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] flex-1 transition-all ${
          selectedCustomer ? 'w-2/3' : 'w-full'
        }`}
      >
        {/* Search */}
        <div className="p-4 border-b border-[var(--color-line)]">
          <div className="relative max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'ja' ? '顧客を検索...' : 'Search customers...'}
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
                  {t('customerId')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('name')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('phone')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('orderCount')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('totalSpend')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 size={24} className="animate-spin mx-auto text-[var(--color-text-label)]" />
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Users}
                      title={locale === 'ja' ? '顧客がいません' : 'No customers found'}
                      description={locale === 'ja' ? '顧客が登録されると、ここに表示されます' : 'Customers will appear here when they register'}
                    />
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer: Customer) => {
                  const status = getCustomerStatus(customer);
                  return (
                    <tr
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      className={`border-b border-[var(--color-line)] last:border-0 cursor-pointer transition-colors ${
                        selectedCustomer?.id === customer.id
                          ? 'bg-[var(--color-bg-element)]'
                          : 'hover:bg-[var(--color-bg-element)]'
                      }`}
                    >
                      <td className="py-3 px-4 text-sm font-medium text-[var(--color-title-active)]">
                        #{customer.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[var(--color-bg-input)] rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-[var(--color-text-body)]">
                              {customer.name?.split(' ').map(n => n[0]).join('') || '?'}
                            </span>
                          </div>
                          <span className="text-sm text-[var(--color-title-active)]">{customer.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                        {customer.phone || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--color-title-active)]">
                        {customer.total_orders}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-[var(--color-accent)]">
                        {formatCurrency(customer.total_spent)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[status].bg} ${statusColors[status].text}`}>
                          {status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })
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
              {isLoading ? 'Loading...' : locale === 'ja' ? 'もっと見る' : 'Load More'}
            </button>
          ) : filteredCustomers.length > 0 ? (
            <p className="text-center text-sm text-[var(--color-text-label)]">
              {locale === 'ja' ? `全${filteredCustomers.length}件を表示中` : `Showing all ${filteredCustomers.length} customers`}
            </p>
          ) : null}
        </div>
      </motion.div>

      {/* Customer Detail Panel */}
      <AnimatePresence>
        {selectedCustomer && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-80 bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[var(--color-bg-input)] rounded-full flex items-center justify-center">
                  <span className="text-lg font-medium text-[var(--color-text-body)]">
                    {selectedCustomer.name?.split(' ').map(n => n[0]).join('') || '?'}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--color-title-active)]">{selectedCustomer.name}</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[getCustomerStatus(selectedCustomer)].bg} ${statusColors[getCustomerStatus(selectedCustomer)].text}`}>
                    {getCustomerStatus(selectedCustomer).toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-element)] transition-colors"
              >
                <X size={18} className="text-[var(--color-text-label)]" />
              </button>
            </div>

            {/* Customer Info */}
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wide">
                {t('customerInfo')}
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} className="text-[var(--color-text-label)]" />
                  <span className="text-[var(--color-text-body)]">{selectedCustomer.email || '-'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-[var(--color-text-label)]" />
                  <span className="text-[var(--color-text-body)]">{selectedCustomer.phone || '-'}</span>
                </div>
              </div>
            </div>

            {/* Activity */}
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wide">
                {t('activity')}
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[var(--color-text-label)]" />
                    <span className="text-[var(--color-text-label)]">{t('registration')}</span>
                  </div>
                  <span className="text-[var(--color-text-body)]">{formatDate(selectedCustomer.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Order Overview */}
            <div className="space-y-4 pt-4 border-t border-[var(--color-line)]">
              <h4 className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wide">
                {t('orderOverview')}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--color-bg-element)] rounded-[var(--radius-md)] p-3 text-center">
                  <p className="text-xl font-semibold text-[var(--color-title-active)]">{selectedCustomer.total_orders}</p>
                  <p className="text-xs text-[var(--color-text-label)]">{t('totalOrder')}</p>
                </div>
                <div className="bg-[var(--color-bg-element)] rounded-[var(--radius-md)] p-3 text-center">
                  <p className="text-xl font-semibold text-[var(--color-accent)]">{formatCurrency(selectedCustomer.total_spent)}</p>
                  <p className="text-xs text-[var(--color-text-label)]">{t('totalSpend')}</p>
                </div>
              </div>
            </div>

            {/* View Full Details Link */}
            <div className="pt-4 border-t border-[var(--color-line)]">
              <Link
                href={`/${locale}/admin/customers/${selectedCustomer.id}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-[var(--color-accent)] bg-[var(--color-bg-element)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-input)] transition-colors"
              >
                <ExternalLink size={14} />
                {locale === 'ja' ? '詳細を見る' : 'View full details'}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CustomerTable;

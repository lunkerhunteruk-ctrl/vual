'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Filter, SlidersHorizontal, MoreHorizontal, Loader2 } from 'lucide-react';
import { Pagination } from '@/components/ui';
import { useOrders } from '@/lib/hooks/useOrders';
import type { OrderStatus } from '@/lib/types';

type PaymentStatus = 'paid' | 'unpaid' | 'refunded';

const statusColors: Record<string, string> = {
  delivered: 'bg-emerald-50 text-emerald-700',
  shipped: 'bg-blue-50 text-blue-700',
  pending: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-emerald-50 text-emerald-700',
  processing: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
};

const paymentColors: Record<PaymentStatus, string> = {
  paid: 'text-emerald-600',
  unpaid: 'text-amber-600',
  refunded: 'text-red-600',
};

type TabFilter = 'all' | 'delivered' | 'pending' | 'cancelled';

export function OrdersTable() {
  const t = useTranslations('admin.orders');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real orders from Firestore
  const statusFilter: OrderStatus | undefined = activeTab === 'all' ? undefined : activeTab as OrderStatus;
  const { orders: firestoreOrders, isLoading, hasMore, loadMore } = useOrders({
    status: statusFilter,
    limit: 20,
  });

  // Calculate tab counts
  const { orders: allOrders } = useOrders({ limit: 1000 });
  const tabCounts = useMemo(() => {
    if (!allOrders) return { all: 0, delivered: 0, pending: 0, cancelled: 0 };
    return {
      all: allOrders.length,
      delivered: allOrders.filter(o => o.status === 'delivered').length,
      pending: allOrders.filter(o => o.status === 'pending' || o.status === 'processing' || o.status === 'confirmed').length,
      cancelled: allOrders.filter(o => o.status === 'cancelled' || o.status === 'refunded').length,
    };
  }, [allOrders]);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: t('allOrders'), count: tabCounts.all },
    { key: 'delivered', label: t('completed'), count: tabCounts.delivered },
    { key: 'pending', label: t('pending'), count: tabCounts.pending },
    { key: 'cancelled', label: t('cancelled'), count: tabCounts.cancelled },
  ];

  // Filter orders by search query
  const filteredOrders = useMemo(() => {
    if (!firestoreOrders) return [];
    if (!searchQuery.trim()) return firestoreOrders;

    const query = searchQuery.toLowerCase();
    return firestoreOrders.filter(order =>
      order.orderNumber?.toLowerCase().includes(query) ||
      order.customer?.name?.toLowerCase().includes(query) ||
      order.customer?.email?.toLowerCase().includes(query)
    );
  }, [firestoreOrders, searchQuery]);

  const toggleOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const formatPrice = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100); // Assuming amount is in cents
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

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchOrders')}
              className="w-full h-10 pl-9 pr-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <button className="flex items-center gap-2 px-4 h-10 text-sm text-[var(--color-text-body)] border border-[var(--color-line)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors">
            <Filter size={16} />
            <span>Filter</span>
          </button>
          <button className="flex items-center gap-2 px-4 h-10 text-sm text-[var(--color-text-body)] border border-[var(--color-line)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors">
            <SlidersHorizontal size={16} />
            <span>Sort</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-[var(--color-text-label)]">No orders found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-line)] bg-[var(--color-bg-element)]">
                <th className="w-12 py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-[var(--color-line)]"
                  />
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  No.
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('orderId')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  Customer
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('date')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('price')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('status')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('payment')}
                </th>
                <th className="w-12 py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, index) => (
                <tr
                  key={order.id}
                  className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors"
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => toggleOrder(order.id)}
                      className="w-4 h-4 rounded border-[var(--color-line)]"
                    />
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {index + 1}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-[var(--color-title-active)]">
                    #{order.orderNumber || order.id.slice(-6).toUpperCase()}
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm text-[var(--color-title-active)]">
                        {order.customer?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-[var(--color-text-label)]">
                        {order.customer?.email || ''}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-[var(--color-title-active)]">
                    {formatPrice(order.total, order.currency)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[order.status] || 'bg-gray-50 text-gray-700'}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-medium ${paymentColors[order.paymentStatus as PaymentStatus] || 'text-gray-600'}`}>
                      {order.paymentStatus === 'paid' ? '● ' : '○ '}
                      {order.paymentStatus?.charAt(0).toUpperCase() + order.paymentStatus?.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors">
                      <MoreHorizontal size={16} className="text-[var(--color-text-label)]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Load More / Pagination */}
      <div className="p-4 border-t border-[var(--color-line)]">
        {hasMore ? (
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="w-full py-2 text-sm text-[var(--color-text-body)] border border-[var(--color-line)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        ) : filteredOrders.length > 0 ? (
          <p className="text-center text-sm text-[var(--color-text-label)]">
            Showing all {filteredOrders.length} orders
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}

export default OrdersTable;

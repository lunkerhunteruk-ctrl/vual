'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Filter, SlidersHorizontal, MoreHorizontal, Loader2, ShoppingCart } from 'lucide-react';
import { useOrders, OrderStatus } from '@/lib/hooks/useOrders';
import { formatPrice } from '@/lib/utils/currency';
import { EmptyState } from '@/components/ui/EmptyState';

const statusColors: Record<string, string> = {
  delivered: 'bg-emerald-50 text-emerald-700',
  shipped: 'bg-blue-50 text-blue-700',
  pending: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-emerald-50 text-emerald-700',
  processing: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-blue-50 text-blue-700',
};

type TabFilter = 'all' | 'delivered' | 'pending' | 'cancelled';

export function OrdersTable() {
  const t = useTranslations('admin.orders');
  const locale = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch orders from Supabase API
  const statusFilter: OrderStatus | undefined = activeTab === 'all' ? undefined : activeTab as OrderStatus;
  const { orders, isLoading, hasMore, loadMore } = useOrders({
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
      cancelled: allOrders.filter(o => o.status === 'cancelled').length,
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
    if (!orders) return [];
    if (!searchQuery.trim()) return orders;

    const query = searchQuery.toLowerCase();
    return orders.filter(order =>
      order.id?.toLowerCase().includes(query) ||
      order.customer_name?.toLowerCase().includes(query) ||
      order.customer_email?.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

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

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const formatOrderPrice = (amount: number, currency: string = 'JPY') => {
    return formatPrice(amount, currency.toUpperCase(), locale, true);
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
          <EmptyState
            icon={ShoppingCart}
            title={locale === 'ja' ? '注文がありません' : 'No orders found'}
            description={locale === 'ja' ? '新しい注文が入ると、ここに表示されます' : 'New orders will appear here'}
          />
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
                  {locale === 'ja' ? '顧客' : 'Customer'}
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
                <th className="w-12 py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, index) => (
                <tr
                  key={order.id}
                  onClick={() => router.push(`/${locale}/admin/orders/${order.id}`)}
                  className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
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
                    #{order.id.slice(-6).toUpperCase()}
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm text-[var(--color-title-active)]">
                        {order.customer_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-[var(--color-text-label)]">
                        {order.customer_email || ''}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-[var(--color-title-active)]">
                    {formatOrderPrice(order.total, order.currency)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[order.status] || 'bg-gray-50 text-gray-700'}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
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
            {isLoading ? (locale === 'ja' ? '読み込み中...' : 'Loading...') : locale === 'ja' ? 'もっと見る' : 'Load More'}
          </button>
        ) : filteredOrders.length > 0 ? (
          <p className="text-center text-sm text-[var(--color-text-label)]">
            {locale === 'ja' ? `全${filteredOrders.length}件を表示中` : `Showing all ${filteredOrders.length} orders`}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}

export default OrdersTable;

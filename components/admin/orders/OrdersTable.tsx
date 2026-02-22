'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Filter, SlidersHorizontal, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { Pagination } from '@/components/ui';

type OrderStatus = 'completed' | 'pending' | 'cancelled' | 'shipped' | 'delivered';
type PaymentStatus = 'paid' | 'unpaid';

interface Order {
  id: string;
  orderId: string;
  productName: string;
  productImage: string;
  date: string;
  price: string;
  status: OrderStatus;
  payment: PaymentStatus;
}

const mockOrders: Order[] = [
  { id: '1', orderId: '#ORD0001', productName: 'Oversized Blazer', productImage: '', date: '01-01-2025', price: '$299.00', status: 'delivered', payment: 'paid' },
  { id: '2', orderId: '#ORD0002', productName: 'Silk Dress', productImage: '', date: '01-01-2025', price: '$189.00', status: 'pending', payment: 'unpaid' },
  { id: '3', orderId: '#ORD0003', productName: 'Wool Cardigan', productImage: '', date: '02-01-2025', price: '$149.00', status: 'shipped', payment: 'paid' },
  { id: '4', orderId: '#ORD0004', productName: 'Leather Bag', productImage: '', date: '02-01-2025', price: '$399.00', status: 'completed', payment: 'paid' },
  { id: '5', orderId: '#ORD0005', productName: 'Cotton T-Shirt', productImage: '', date: '03-01-2025', price: '$49.00', status: 'cancelled', payment: 'unpaid' },
  { id: '6', orderId: '#ORD0006', productName: 'Denim Jeans', productImage: '', date: '03-01-2025', price: '$129.00', status: 'delivered', payment: 'paid' },
  { id: '7', orderId: '#ORD0007', productName: 'Cashmere Sweater', productImage: '', date: '04-01-2025', price: '$249.00', status: 'pending', payment: 'unpaid' },
  { id: '8', orderId: '#ORD0008', productName: 'Leather Boots', productImage: '', date: '04-01-2025', price: '$349.00', status: 'shipped', payment: 'paid' },
];

const statusColors: Record<OrderStatus, string> = {
  delivered: 'bg-emerald-50 text-emerald-700',
  shipped: 'bg-blue-50 text-blue-700',
  pending: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-emerald-50 text-emerald-700',
};

const paymentColors: Record<PaymentStatus, string> = {
  paid: 'text-emerald-600',
  unpaid: 'text-amber-600',
};

type TabFilter = 'all' | 'completed' | 'pending' | 'cancelled';

export function OrdersTable() {
  const t = useTranslations('admin.orders');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: t('allOrders'), count: 240 },
    { key: 'completed', label: t('completed'), count: 180 },
    { key: 'pending', label: t('pending'), count: 45 },
    { key: 'cancelled', label: t('cancelled'), count: 15 },
  ];

  const filteredOrders = activeTab === 'all'
    ? mockOrders
    : mockOrders.filter(order => order.status === activeTab || (activeTab === 'completed' && order.status === 'delivered'));

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
                {t('product')}
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
                  {order.orderId}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--color-bg-element)] rounded-[var(--radius-sm)]" />
                    <span className="text-sm text-[var(--color-title-active)]">{order.productName}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                  {order.date}
                </td>
                <td className="py-3 px-4 text-sm font-medium text-[var(--color-title-active)]">
                  {order.price}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[order.status]}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`text-sm font-medium ${paymentColors[order.payment]}`}>
                    {order.payment === 'paid' ? '● ' : '○ '}
                    {order.payment.charAt(0).toUpperCase() + order.payment.slice(1)}
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
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-[var(--color-line)]">
        <Pagination
          currentPage={currentPage}
          totalPages={24}
          onPageChange={setCurrentPage}
        />
      </div>
    </motion.div>
  );
}

export default OrdersTable;

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, ChevronRight, Loader2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useAuthStore } from '@/lib/store';
import { OrderStatusBadge } from '@/components/customer/orders';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  status: OrderStatus;
  total: number;
  currency: string;
  created_at: string;
  order_items: OrderItem[];
}

type FilterTab = 'all' | 'active' | 'completed';

export default function OrdersPage() {
  const locale = useLocale();
  const { customer } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  useEffect(() => {
    const fetchOrders = async () => {
      if (!customer) {
        setIsLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();
        if (customer.email) {
          params.set('customerEmail', customer.email);
        } else if (customer.id) {
          params.set('customerId', customer.id);
        }

        const res = await fetch(`/api/orders?${params.toString()}`);
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [customer]);

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'active') {
      return !['delivered', 'cancelled'].includes(order.status);
    }
    if (activeTab === 'completed') {
      return ['delivered', 'cancelled'].includes(order.status);
    }
    return true;
  });

  const formatPrice = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(dateStr));
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'すべて' },
    { key: 'active', label: '進行中' },
    { key: 'completed', label: '完了' },
  ];

  if (!customer) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6">
        <Package size={48} className="text-[var(--color-text-label)] mb-4" />
        <p className="text-sm text-[var(--color-text-body)] mb-4">注文履歴を見るにはログインしてください</p>
        <Link
          href={`/${locale}/mypage`}
          className="text-sm text-[var(--color-accent)] font-medium"
        >
          ログインする
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-semibold text-[var(--color-title-active)] mb-4">注文履歴</h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--color-title-active)] text-white'
                : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag size={48} className="text-[var(--color-text-label)] mx-auto mb-4" />
          <p className="text-sm text-[var(--color-text-body)] mb-4">
            {activeTab === 'all' ? '注文履歴がありません' : `${tabs.find(t => t.key === activeTab)?.label}の注文はありません`}
          </p>
          <Link
            href={`/${locale}`}
            className="text-sm text-[var(--color-accent)] font-medium"
          >
            ショッピングを始める
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/${locale}/orders/${order.id}`}
                className="block p-4 bg-white border border-[var(--color-line)] rounded-[var(--radius-lg)] hover:bg-[var(--color-bg-element)] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-[var(--color-text-label)]">
                      {formatDate(order.created_at)}
                    </p>
                    <p className="text-sm font-medium text-[var(--color-title-active)]">
                      注文 #{order.id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                    <ChevronRight size={16} className="text-[var(--color-text-label)]" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--color-text-body)]">
                    {order.order_items?.length || 0}点
                  </p>
                  <p className="text-sm font-semibold text-[var(--color-title-active)]">
                    {formatPrice(order.total)}
                  </p>
                </div>

                {/* Item names preview */}
                {order.order_items && order.order_items.length > 0 && (
                  <p className="text-xs text-[var(--color-text-label)] mt-2 truncate">
                    {order.order_items.map(item => item.product_name).join(', ')}
                  </p>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

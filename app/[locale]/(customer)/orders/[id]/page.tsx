'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { OrderStatusBadge, OrderTimeline } from '@/components/customer/orders';
import { formatPrice as formatCurrencyPrice } from '@/lib/utils/currency';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderDetail {
  id: string;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  customer_email: string;
  shipping_address: any;
  created_at: string;
  order_items: OrderItem[];
}

export default function OrderDetailPage() {
  const locale = useLocale();
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders?id=${orderId}`);
        const data = await res.json();
        if (data && data.id) {
          setOrder(data);
        }
      } catch (err) {
        console.error('Failed to fetch order:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (orderId) fetchOrder();
  }, [orderId]);

  const formatPrice = (amount: number) => formatCurrencyPrice(amount, order?.currency || 'jpy', locale === 'ja' ? 'ja-JP' : undefined, false);

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6">
        <p className="text-sm text-[var(--color-text-body)] mb-4">注文が見つかりません</p>
        <Link href={`/${locale}/orders`} className="text-sm text-[var(--color-accent)] font-medium">
          注文一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/orders`}
          className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
        >
          <ArrowLeft size={20} className="text-[var(--color-title-active)]" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-title-active)]">
            注文 #{order.id.slice(0, 8)}
          </h1>
          <p className="text-xs text-[var(--color-text-label)]">{formatDate(order.created_at)}</p>
        </div>
      </div>

      {/* Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-white border border-[var(--color-line)] rounded-[var(--radius-lg)] mb-4"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-[var(--color-title-active)]">ステータス</span>
          <OrderStatusBadge status={order.status} />
        </div>
        <OrderTimeline status={order.status} />
      </motion.div>

      {/* Items */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 bg-white border border-[var(--color-line)] rounded-[var(--radius-lg)] mb-4"
      >
        <h2 className="text-sm font-medium text-[var(--color-title-active)] mb-3">商品</h2>
        <div className="space-y-3">
          {order.order_items?.map((item) => (
            <Link
              key={item.id}
              href={`/${locale}/product/${item.product_id}`}
              className="flex items-center gap-3 hover:bg-[var(--color-bg-element)] -mx-2 px-2 py-1 rounded-[var(--radius-md)] transition-colors"
            >
              <div className="w-14 h-14 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] flex items-center justify-center shrink-0">
                <span className="text-xs text-[var(--color-text-label)]">IMG</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-title-active)] truncate">{item.product_name}</p>
                {item.variant_name && (
                  <p className="text-xs text-[var(--color-text-label)]">{item.variant_name}</p>
                )}
                <p className="text-xs text-[var(--color-text-body)]">x{item.quantity}</p>
              </div>
              <p className="text-sm font-medium text-[var(--color-title-active)]">
                {formatPrice(item.total_price)}
              </p>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Price Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 bg-white border border-[var(--color-line)] rounded-[var(--radius-lg)] mb-4"
      >
        <h2 className="text-sm font-medium text-[var(--color-title-active)] mb-3">合計</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-body)]">小計</span>
            <span className="text-[var(--color-title-active)]">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-body)]">送料</span>
            <span className="text-[var(--color-title-active)]">
              {order.shipping === 0 ? '無料' : formatPrice(order.shipping)}
            </span>
          </div>
          {order.tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-body)]">税</span>
              <span className="text-[var(--color-title-active)]">{formatPrice(order.tax)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-body)]">割引</span>
              <span className="text-green-600">-{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="border-t border-[var(--color-line)] pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-[var(--color-title-active)]">合計</span>
              <span className="text-base font-semibold text-[var(--color-title-active)]">
                {formatPrice(order.total)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Shipping Address */}
      {order.shipping_address && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 bg-white border border-[var(--color-line)] rounded-[var(--radius-lg)] mb-6"
        >
          <h2 className="text-sm font-medium text-[var(--color-title-active)] mb-2">配送先</h2>
          <p className="text-sm text-[var(--color-text-body)]">
            {typeof order.shipping_address === 'string'
              ? order.shipping_address
              : JSON.stringify(order.shipping_address)}
          </p>
        </motion.div>
      )}

      {/* Reorder Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <button className="w-full py-3 rounded-[var(--radius-md)] border border-[var(--color-line)] text-sm font-medium text-[var(--color-title-active)] hover:bg-[var(--color-bg-element)] transition-colors flex items-center justify-center gap-2">
          <RotateCcw size={16} />
          もう一度注文する
        </button>
      </motion.div>
    </div>
  );
}

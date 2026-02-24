'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  MapPin,
  User,
  Mail,
  Copy,
  ChevronDown,
} from 'lucide-react';
import { useOrder, OrderStatus } from '@/lib/hooks/useOrders';
import { formatPrice } from '@/lib/utils/currency';
import { toast } from '@/lib/store/toast';

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const statusConfig: Record<string, { color: string; bg: string; icon: typeof Clock }> = {
  pending: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  confirmed: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: CheckCircle },
  processing: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Package },
  shipped: { color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: Truck },
  delivered: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle },
  cancelled: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle },
};

const statusLabels: Record<string, { ja: string; en: string }> = {
  pending: { ja: '保留中', en: 'Pending' },
  confirmed: { ja: '確認済み', en: 'Confirmed' },
  processing: { ja: '処理中', en: 'Processing' },
  shipped: { ja: '発送済み', en: 'Shipped' },
  delivered: { ja: '配達完了', en: 'Delivered' },
  cancelled: { ja: 'キャンセル', en: 'Cancelled' },
};

export default function OrderDetailPage() {
  const t = useTranslations('admin.orders');
  const locale = useLocale();
  const params = useParams();
  const orderId = params.id as string;

  const { order, isLoading, error, refresh } = useOrder(orderId);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateStatus = async (newStatus: OrderStatus) => {
    setShowStatusDropdown(false);
    setIsUpdating(true);
    setUpdateError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const label = statusLabels[newStatus]?.[locale as 'ja' | 'en'] || newStatus;
      toast.success(locale === 'ja' ? `ステータスを「${label}」に更新しました` : `Status updated to "${label}"`);
      refresh();
      setIsUpdating(false);
    } catch {
      setUpdateError(locale === 'ja' ? 'ステータスの更新に失敗しました' : 'Failed to update status');
      toast.error(locale === 'ja' ? 'ステータスの更新に失敗しました' : 'Failed to update status');
      setIsUpdating(false);
    }
  };

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  const formatOrderPrice = (amount: number, currency: string = 'JPY') => {
    return formatPrice(amount, currency.toUpperCase(), locale, true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-[var(--color-text-label)]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-text-label)]">
          {locale === 'ja' ? '注文が見つかりません' : 'Order not found'}
        </p>
        <Link href={`/${locale}/admin/orders`} className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline">
          {locale === 'ja' ? '注文一覧に戻る' : 'Back to orders'}
        </Link>
      </div>
    );
  }

  const cfg = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = cfg.icon;
  const shipping = order.shipping_address || {};

  // Determine available next statuses
  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const availableStatuses = order.status === 'cancelled'
    ? []
    : [
        ...STATUS_FLOW.filter((_, i) => i > currentIdx),
        ...(order.status !== 'delivered' ? ['cancelled' as OrderStatus] : []),
      ];

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={`/${locale}/admin/orders`}
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors"
      >
        <ArrowLeft size={16} />
        {locale === 'ja' ? '注文一覧に戻る' : 'Back to orders'}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[var(--color-title-active)]">
              {locale === 'ja' ? '注文' : 'Order'} #{orderId.slice(-6).toUpperCase()}
            </h1>
            <button
              onClick={copyOrderId}
              className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-element)] transition-colors"
              title={locale === 'ja' ? 'IDをコピー' : 'Copy ID'}
            >
              <Copy size={14} className="text-[var(--color-text-label)]" />
            </button>
            {copied && (
              <span className="text-xs text-emerald-600">
                {locale === 'ja' ? 'コピーしました' : 'Copied!'}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--color-text-label)] mt-1">
            {formatDate(order.created_at)}
          </p>
        </div>

        {/* Status Badge + Dropdown */}
        <div className="relative">
          <button
            onClick={() => availableStatuses.length > 0 && setShowStatusDropdown(!showStatusDropdown)}
            disabled={isUpdating || availableStatuses.length === 0}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] border transition-colors ${cfg.bg} ${cfg.color} ${
              availableStatuses.length > 0 ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
            }`}
          >
            <StatusIcon size={16} />
            {statusLabels[order.status]?.[locale as 'ja' | 'en'] || order.status}
            {availableStatuses.length > 0 && <ChevronDown size={14} />}
            {isUpdating && <Loader2 size={14} className="animate-spin" />}
          </button>

          {showStatusDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] shadow-lg z-20 py-1">
                {availableStatuses.map((s) => {
                  const sCfg = statusConfig[s];
                  const SIcon = sCfg.icon;
                  return (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] transition-colors"
                    >
                      <SIcon size={14} className={sCfg.color} />
                      {statusLabels[s]?.[locale as 'ja' | 'en'] || s}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Update Error */}
      {updateError && (
        <div className="bg-red-50 border border-red-200 rounded-[var(--radius-md)] px-4 py-3 text-sm text-red-700">
          {updateError}
        </div>
      )}

      {/* Status Timeline */}
      <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-6">
        <h2 className="text-sm font-semibold text-[var(--color-title-active)] mb-4">
          {locale === 'ja' ? '注文ステータス' : 'Order Status'}
        </h2>
        <div className="flex items-center justify-between">
          {STATUS_FLOW.map((status, i) => {
            const sCfg = statusConfig[status];
            const SIcon = sCfg.icon;
            const isActive = STATUS_FLOW.indexOf(order.status) >= i;
            const isCancelled = order.status === 'cancelled';
            return (
              <div key={status} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCancelled
                        ? 'bg-gray-100'
                        : isActive
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-bg-element)] text-[var(--color-text-label)]'
                    }`}
                  >
                    <SIcon size={18} />
                  </div>
                  <span
                    className={`text-xs mt-2 ${
                      isActive && !isCancelled
                        ? 'text-[var(--color-title-active)] font-medium'
                        : 'text-[var(--color-text-label)]'
                    }`}
                  >
                    {statusLabels[status]?.[locale as 'ja' | 'en']}
                  </span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mt-[-20px] ${
                      !isCancelled && STATUS_FLOW.indexOf(order.status) > i
                        ? 'bg-[var(--color-accent)]'
                        : 'bg-[var(--color-line)]'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        {order.status === 'cancelled' && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-600">
            <XCircle size={16} />
            {locale === 'ja' ? 'この注文はキャンセルされました' : 'This order has been cancelled'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)]">
            <div className="p-4 border-b border-[var(--color-line)]">
              <h2 className="text-sm font-semibold text-[var(--color-title-active)]">
                {locale === 'ja' ? '注文商品' : 'Order Items'}
                {order.order_items && (
                  <span className="text-[var(--color-text-label)] font-normal ml-2">
                    ({order.order_items.length}{locale === 'ja' ? '点' : ' items'})
                  </span>
                )}
              </h2>
            </div>
            <div className="divide-y divide-[var(--color-line)]">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4">
                  <div className="w-12 h-12 bg-[var(--color-bg-element)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                    <Package size={20} className="text-[var(--color-text-label)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-title-active)] truncate">
                      {item.product_name}
                    </p>
                    {item.variant_name && (
                      <p className="text-xs text-[var(--color-text-label)]">{item.variant_name}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-[var(--color-text-body)]">
                      {formatOrderPrice(item.unit_price, order.currency)} x {item.quantity}
                    </p>
                    <p className="text-sm font-medium text-[var(--color-title-active)]">
                      {formatOrderPrice(item.total_price, order.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-[var(--color-line)] p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-body)]">{locale === 'ja' ? '小計' : 'Subtotal'}</span>
                <span className="text-[var(--color-text-body)]">{formatOrderPrice(order.subtotal, order.currency)}</span>
              </div>
              {order.shipping > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text-body)]">{locale === 'ja' ? '送料' : 'Shipping'}</span>
                  <span className="text-[var(--color-text-body)]">{formatOrderPrice(order.shipping, order.currency)}</span>
                </div>
              )}
              {order.tax > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text-body)]">{locale === 'ja' ? '税金' : 'Tax'}</span>
                  <span className="text-[var(--color-text-body)]">{formatOrderPrice(order.tax, order.currency)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text-body)]">{locale === 'ja' ? '割引' : 'Discount'}</span>
                  <span className="text-emerald-600">-{formatOrderPrice(order.discount, order.currency)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t border-[var(--color-line)]">
                <span className="text-[var(--color-title-active)]">{locale === 'ja' ? '合計' : 'Total'}</span>
                <span className="text-[var(--color-title-active)] text-base">{formatOrderPrice(order.total, order.currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4">
              <h2 className="text-sm font-semibold text-[var(--color-title-active)] mb-2">
                {locale === 'ja' ? '備考' : 'Notes'}
              </h2>
              <p className="text-sm text-[var(--color-text-body)] whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column - Customer & Payment Info */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4">
            <h2 className="text-sm font-semibold text-[var(--color-title-active)] mb-4">
              {locale === 'ja' ? '顧客情報' : 'Customer'}
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User size={16} className="text-[var(--color-text-label)] flex-shrink-0" />
                <span className="text-sm text-[var(--color-title-active)]">
                  {order.customer_name || (locale === 'ja' ? '不明' : 'Unknown')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-[var(--color-text-label)] flex-shrink-0" />
                <span className="text-sm text-[var(--color-text-body)] break-all">
                  {order.customer_email}
                </span>
              </div>
              {order.customer_id && (
                <Link
                  href={`/${locale}/admin/customers/${order.customer_id}`}
                  className="inline-flex items-center text-xs text-[var(--color-accent)] hover:underline mt-1"
                >
                  {locale === 'ja' ? '顧客詳細を見る' : 'View customer details'}
                </Link>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4">
            <h2 className="text-sm font-semibold text-[var(--color-title-active)] mb-4 flex items-center gap-2">
              <MapPin size={16} />
              {locale === 'ja' ? '配送先' : 'Shipping Address'}
            </h2>
            {shipping.name || shipping.line1 ? (
              <div className="text-sm text-[var(--color-text-body)] space-y-1">
                {shipping.name && <p className="font-medium text-[var(--color-title-active)]">{shipping.name}</p>}
                {shipping.line1 && <p>{shipping.line1}</p>}
                {shipping.line2 && <p>{shipping.line2}</p>}
                {(shipping.city || shipping.state || shipping.postal_code) && (
                  <p>
                    {[shipping.city, shipping.state, shipping.postal_code].filter(Boolean).join(', ')}
                  </p>
                )}
                {shipping.country && <p>{shipping.country}</p>}
                {shipping.phone && (
                  <p className="flex items-center gap-1 mt-2 text-[var(--color-text-label)]">
                    {shipping.phone}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-label)]">
                {locale === 'ja' ? '配送先未設定' : 'No shipping address'}
              </p>
            )}
          </div>

          {/* Payment Info */}
          <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4">
            <h2 className="text-sm font-semibold text-[var(--color-title-active)] mb-4 flex items-center gap-2">
              <CreditCard size={16} />
              {locale === 'ja' ? '決済情報' : 'Payment'}
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-label)]">
                  {locale === 'ja' ? '決済方法' : 'Method'}
                </span>
                <span className="text-[var(--color-text-body)]">
                  {order.stripe_payment_intent_id ? 'Stripe' : (locale === 'ja' ? '未設定' : 'N/A')}
                </span>
              </div>
              {order.stripe_payment_intent_id && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-label)]">Payment ID</span>
                  <span className="text-xs text-[var(--color-text-body)] font-mono truncate max-w-[160px]">
                    {order.stripe_payment_intent_id}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-label)]">{locale === 'ja' ? '通貨' : 'Currency'}</span>
                <span className="text-[var(--color-text-body)] uppercase">{order.currency}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

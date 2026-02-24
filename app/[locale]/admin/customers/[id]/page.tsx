'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  User,
  Mail,
  Phone,
  ShoppingBag,
  Calendar,
  MessageCircle,
  Copy,
} from 'lucide-react';
import { useCustomer } from '@/lib/hooks/useCustomers';
import { useOrders } from '@/lib/hooks/useOrders';
import { formatPrice, getDefaultCurrency } from '@/lib/utils/currency';

const statusColors: Record<string, string> = {
  delivered: 'bg-emerald-50 text-emerald-700',
  shipped: 'bg-blue-50 text-blue-700',
  pending: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-red-50 text-red-700',
  processing: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-blue-50 text-blue-700',
};

const statusLabels: Record<string, { ja: string; en: string }> = {
  pending: { ja: '保留中', en: 'Pending' },
  confirmed: { ja: '確認済み', en: 'Confirmed' },
  processing: { ja: '処理中', en: 'Processing' },
  shipped: { ja: '発送済み', en: 'Shipped' },
  delivered: { ja: '配達完了', en: 'Delivered' },
  cancelled: { ja: 'キャンセル', en: 'Cancelled' },
};

export default function CustomerDetailPage() {
  const locale = useLocale();
  const params = useParams();
  const customerId = params.id as string;

  const { customer, isLoading, error } = useCustomer(customerId);
  const { orders, isLoading: ordersLoading } = useOrders({ customerId, limit: 50 });
  const defaultCurrency = getDefaultCurrency(locale);
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(customerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateStr));
  };

  const formatDateTime = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  const formatCurrency = (amount: number) => {
    return formatPrice(amount, defaultCurrency, locale, true);
  };

  // Determine customer tier
  const getTier = () => {
    if (!customer) return { label: '-', color: 'bg-gray-100 text-gray-600' };
    if (customer.total_spent > 100000) return { label: 'VIP', color: 'bg-amber-50 text-amber-700' };
    if (customer.total_orders > 0) return { label: locale === 'ja' ? 'アクティブ' : 'Active', color: 'bg-emerald-50 text-emerald-700' };
    return { label: locale === 'ja' ? '新規' : 'New', color: 'bg-blue-50 text-blue-700' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-[var(--color-text-label)]" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-text-label)]">
          {locale === 'ja' ? '顧客が見つかりません' : 'Customer not found'}
        </p>
        <Link href={`/${locale}/admin/customers`} className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline">
          {locale === 'ja' ? '顧客一覧に戻る' : 'Back to customers'}
        </Link>
      </div>
    );
  }

  const tier = getTier();
  const initials = customer.name?.split(' ').map((n: string) => n[0]).join('') || '?';

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={`/${locale}/admin/customers`}
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors"
      >
        <ArrowLeft size={16} />
        {locale === 'ja' ? '顧客一覧に戻る' : 'Back to customers'}
      </Link>

      {/* Header */}
      <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-[var(--color-bg-input)] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-semibold text-[var(--color-text-body)]">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-[var(--color-title-active)]">
                {customer.name}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${tier.color}`}>
                {tier.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-[var(--color-text-label)]">ID: {customerId.slice(-8).toUpperCase()}</span>
              <button onClick={copyId} className="p-1 hover:bg-[var(--color-bg-element)] rounded transition-colors">
                <Copy size={12} className="text-[var(--color-text-label)]" />
              </button>
              {copied && <span className="text-xs text-emerald-600">{locale === 'ja' ? 'コピー' : 'Copied'}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4 text-center">
              <p className="text-2xl font-semibold text-[var(--color-title-active)]">{customer.total_orders}</p>
              <p className="text-xs text-[var(--color-text-label)] mt-1">
                {locale === 'ja' ? '総注文数' : 'Total Orders'}
              </p>
            </div>
            <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4 text-center">
              <p className="text-2xl font-semibold text-[var(--color-accent)]">{formatCurrency(customer.total_spent)}</p>
              <p className="text-xs text-[var(--color-text-label)] mt-1">
                {locale === 'ja' ? '総購入額' : 'Total Spent'}
              </p>
            </div>
            <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4 text-center">
              <p className="text-2xl font-semibold text-[var(--color-title-active)]">
                {customer.total_orders > 0
                  ? formatCurrency(Math.round(customer.total_spent / customer.total_orders))
                  : formatCurrency(0)}
              </p>
              <p className="text-xs text-[var(--color-text-label)] mt-1">
                {locale === 'ja' ? '平均注文額' : 'Avg. Order'}
              </p>
            </div>
          </div>

          {/* Order History */}
          <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)]">
            <div className="p-4 border-b border-[var(--color-line)]">
              <h2 className="text-sm font-semibold text-[var(--color-title-active)]">
                {locale === 'ja' ? '注文履歴' : 'Order History'}
              </h2>
            </div>
            {ordersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingBag size={32} className="mx-auto text-[var(--color-text-label)] mb-2" />
                <p className="text-sm text-[var(--color-text-label)]">
                  {locale === 'ja' ? '注文履歴がありません' : 'No orders yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-line)]">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/${locale}/admin/orders/${order.id}`}
                    className="flex items-center justify-between p-4 hover:bg-[var(--color-bg-element)] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-title-active)]">
                          #{order.id.slice(-6).toUpperCase()}
                        </p>
                        <p className="text-xs text-[var(--color-text-label)]">
                          {formatDateTime(order.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[order.status] || 'bg-gray-50 text-gray-700'}`}>
                        {statusLabels[order.status]?.[locale as 'ja' | 'en'] || order.status}
                      </span>
                      <span className="text-sm font-medium text-[var(--color-title-active)]">
                        {formatPrice(order.total, order.currency.toUpperCase(), locale, true)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Customer Info */}
        <div className="space-y-6">
          {/* Contact Info */}
          <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4">
            <h2 className="text-sm font-semibold text-[var(--color-title-active)] mb-4">
              {locale === 'ja' ? '連絡先' : 'Contact'}
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-[var(--color-text-label)] flex-shrink-0" />
                <span className="text-sm text-[var(--color-text-body)] break-all">{customer.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-[var(--color-text-label)] flex-shrink-0" />
                <span className="text-sm text-[var(--color-text-body)]">{customer.phone || '-'}</span>
              </div>
            </div>
          </div>

          {/* LINE Status */}
          <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4">
            <h2 className="text-sm font-semibold text-[var(--color-title-active)] mb-4 flex items-center gap-2">
              <MessageCircle size={16} />
              LINE
            </h2>
            {customer.line_user_id ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-emerald-700">
                  {locale === 'ja' ? '連携済み' : 'Connected'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-300" />
                <span className="text-sm text-[var(--color-text-label)]">
                  {locale === 'ja' ? '未連携' : 'Not connected'}
                </span>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4">
            <h2 className="text-sm font-semibold text-[var(--color-title-active)] mb-4">
              {locale === 'ja' ? '日付情報' : 'Dates'}
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-label)] flex items-center gap-2">
                  <Calendar size={14} />
                  {locale === 'ja' ? '登録日' : 'Registered'}
                </span>
                <span className="text-[var(--color-text-body)]">{formatDate(customer.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-label)] flex items-center gap-2">
                  <Calendar size={14} />
                  {locale === 'ja' ? '最終更新' : 'Last updated'}
                </span>
                <span className="text-[var(--color-text-body)]">{formatDate(customer.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

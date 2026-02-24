'use client';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const statusConfig: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '注文受付', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  confirmed: { label: '確認済み', color: 'text-blue-700', bg: 'bg-blue-50' },
  processing: { label: '準備中', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  shipped: { label: '発送済み', color: 'text-purple-700', bg: 'bg-purple-50' },
  delivered: { label: '配達完了', color: 'text-green-700', bg: 'bg-green-50' },
  cancelled: { label: 'キャンセル', color: 'text-red-700', bg: 'bg-red-50' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bg}`}>
      {config.label}
    </span>
  );
}

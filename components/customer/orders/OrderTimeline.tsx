'use client';

import { Check } from 'lucide-react';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const steps = [
  { key: 'confirmed', label: '注文確認' },
  { key: 'processing', label: '準備中' },
  { key: 'shipped', label: '発送済み' },
  { key: 'delivered', label: '配達完了' },
];

const statusOrder: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
};

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') {
    return (
      <div className="text-center py-4">
        <span className="text-sm text-red-600 font-medium">この注文はキャンセルされました</span>
      </div>
    );
  }

  const currentStep = statusOrder[status] || 0;

  return (
    <div className="flex items-center justify-between px-2">
      {steps.map((step, i) => {
        const stepIndex = statusOrder[step.key];
        const isCompleted = currentStep >= stepIndex;
        const isActive = currentStep === stepIndex;

        return (
          <div key={step.key} className="flex flex-col items-center flex-1 relative">
            {/* Connector line */}
            {i > 0 && (
              <div
                className={`absolute top-3 -left-1/2 w-full h-0.5 ${
                  currentStep >= stepIndex ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-line)]'
                }`}
              />
            )}

            {/* Circle */}
            <div
              className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${
                isCompleted
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-element)] text-[var(--color-text-label)]'
              } ${isActive ? 'ring-2 ring-[var(--color-accent)]/30' : ''}`}
            >
              {isCompleted ? <Check size={14} /> : <span className="text-[10px]">{i + 1}</span>}
            </div>

            {/* Label */}
            <span
              className={`text-[10px] mt-1.5 ${
                isCompleted ? 'text-[var(--color-title-active)] font-medium' : 'text-[var(--color-text-label)]'
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { CreditCard, Plus, Power } from 'lucide-react';
import { Button } from '@/components/ui';

interface PaymentMethod {
  id: string;
  type: 'stripe' | 'paypal' | 'credit_card';
  lastFour: string;
  isActive: boolean;
  transactions: number;
  revenue: string;
}

const mockPaymentMethod: PaymentMethod = {
  id: '1',
  type: 'stripe',
  lastFour: '2345',
  isActive: true,
  transactions: 1250,
  revenue: '$50,000',
};

export function PaymentMethodCard() {
  const t = useTranslations('admin.transactions');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
    >
      <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-4">
        {t('paymentMethod')}
      </h3>

      {/* Card Display */}
      <div className="bg-gradient-to-br from-[var(--color-title-active)] to-gray-700 rounded-[var(--radius-md)] p-5 text-white mb-4">
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-2">
            <CreditCard size={24} />
            <span className="text-sm font-medium">Stripe</span>
          </div>
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            mockPaymentMethod.isActive ? 'bg-emerald-500' : 'bg-gray-500'
          }`}>
            {mockPaymentMethod.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-lg tracking-widest mb-2">
          <span>****</span>
          <span>****</span>
          <span>****</span>
          <span>{mockPaymentMethod.lastFour}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="opacity-70">Transactions: {mockPaymentMethod.transactions}</span>
          <span className="font-medium">{mockPaymentMethod.revenue}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="secondary" size="sm" leftIcon={<Plus size={14} />} fullWidth>
          {t('addCard')}
        </Button>
        <Button variant="ghost" size="sm" leftIcon={<Power size={14} />} fullWidth>
          {t('deactivate')}
        </Button>
      </div>

      {/* View Transactions Link */}
      <button className="w-full mt-4 py-2 text-sm text-[var(--color-accent)] hover:underline">
        {t('viewTransactions')} →
      </button>
    </motion.div>
  );
}

export default PaymentMethodCard;

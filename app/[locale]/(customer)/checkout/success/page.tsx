'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check, Package, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';

export default function CheckoutSuccessPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const t = useTranslations('customer.payment');

  const [orderDetails, setOrderDetails] = useState<{
    orderId?: string;
    amount?: number;
  } | null>(null);

  useEffect(() => {
    // In production, you could verify the session with Stripe here
    // For now, we just show success
    if (sessionId) {
      setOrderDetails({
        orderId: sessionId.slice(-8).toUpperCase(),
        amount: 0, // Could fetch from API
      });
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Success Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="w-24 h-24 mb-8 rounded-full bg-[var(--color-success)] flex items-center justify-center"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Check size={48} className="text-white" />
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-medium tracking-[0.1em] text-[var(--color-title-active)] uppercase mb-2 text-center"
      >
        {t('success')}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-[var(--color-text-body)] mb-2 text-center"
      >
        Thank you for your purchase!
      </motion.p>

      {orderDetails && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xs text-[var(--color-text-label)] mb-8 text-center"
        >
          Order ID: #{orderDetails.orderId}
        </motion.p>
      )}

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm p-6 bg-[var(--color-bg-element)] rounded-[var(--radius-lg)] mb-8"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
            <Package size={24} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-title-active)]">
              Order Confirmed
            </p>
            <p className="text-xs text-[var(--color-text-label)]">
              We&apos;ll send you shipping updates via email
            </p>
          </div>
        </div>
        <div className="border-t border-[var(--color-line)] pt-4">
          <p className="text-xs text-[var(--color-text-label)]">
            Your order is being processed. You will receive a confirmation email shortly with your order details and tracking information.
          </p>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-sm space-y-3"
      >
        <Link href={`/${locale}`} className="block">
          <Button variant="primary" fullWidth rightIcon={<ArrowRight size={18} />}>
            Continue Shopping
          </Button>
        </Link>
        <Link href={`/${locale}/orders`} className="block">
          <Button variant="secondary" fullWidth>
            View Orders
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}

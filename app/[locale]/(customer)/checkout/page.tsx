'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, MapPin, Truck, CreditCard, Tag, Plus, Lock, Check } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

const mockAddress = {
  name: 'Iris Watson',
  address: '606-3727 Ullamcorper. Street',
  city: 'Roseville NH 11523',
  phone: '(786) 713-8616',
};

const shippingMethods = [
  { id: 'pickup', label: 'Pickup at store', price: 'FREE' },
  { id: 'standard', label: 'Standard Shipping', price: '$5.00' },
  { id: 'express', label: 'Express Shipping', price: '$15.00' },
];

const paymentMethods = [
  { id: 'card', label: 'Credit/Debit Card', icon: CreditCard },
  { id: 'cod', label: 'Cash on Delivery', icon: null },
];

export default function CheckoutPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('customer.checkout');
  const tPayment = useTranslations('customer.payment');

  const [selectedShipping, setSelectedShipping] = useState('pickup');
  const [selectedPayment, setSelectedPayment] = useState('card');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setShowSuccessModal(true);
  };

  const subtotal = 419;
  const shipping = selectedShipping === 'pickup' ? 0 : selectedShipping === 'standard' ? 5 : 15;
  const total = subtotal + shipping;

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="px-4 py-6 text-center border-b border-[var(--color-line)]">
        <h1 className="text-lg font-medium tracking-[0.15em] text-[var(--color-title-active)] uppercase">
          {t('title')}
        </h1>
        <div className="w-12 h-0.5 bg-[var(--color-title-active)] mx-auto mt-2" />
      </div>

      {/* Shipping Address */}
      <section className="px-4 py-6 border-b border-[var(--color-line)]">
        <h2 className="text-sm font-medium tracking-[0.1em] text-[var(--color-text-label)] uppercase mb-4">
          {t('shippingAddress')}
        </h2>
        <div className="flex items-start gap-3">
          <MapPin size={18} className="text-[var(--color-text-label)] mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--color-title-active)]">{mockAddress.name}</p>
            <p className="text-sm text-[var(--color-text-body)]">{mockAddress.address}</p>
            <p className="text-sm text-[var(--color-text-body)]">{mockAddress.city}</p>
            <p className="text-sm text-[var(--color-text-body)]">{mockAddress.phone}</p>
          </div>
          <ChevronRight size={18} className="text-[var(--color-text-label)]" />
        </div>
        <button className="flex items-center gap-2 mt-4 text-sm text-[var(--color-accent)]">
          <Plus size={14} />
          {t('addShippingAddress')}
        </button>
      </section>

      {/* Shipping Method */}
      <section className="px-4 py-6 border-b border-[var(--color-line)]">
        <h2 className="text-sm font-medium tracking-[0.1em] text-[var(--color-text-label)] uppercase mb-4">
          {t('shippingMethod')}
        </h2>
        <div className="space-y-2">
          {shippingMethods.map(method => (
            <button
              key={method.id}
              onClick={() => setSelectedShipping(method.id)}
              className={`w-full flex items-center justify-between p-4 rounded-[var(--radius-md)] border transition-colors ${
                selectedShipping === method.id
                  ? 'border-[var(--color-accent)] bg-[var(--color-bg-element)]'
                  : 'border-[var(--color-line)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedShipping === method.id
                    ? 'border-[var(--color-accent)]'
                    : 'border-[var(--color-line)]'
                }`}>
                  {selectedShipping === method.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />
                  )}
                </div>
                <span className="text-sm text-[var(--color-text-body)]">{method.label}</span>
              </div>
              <span className="text-sm font-medium text-[var(--color-title-active)]">{method.price}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Payment Method */}
      <section className="px-4 py-6 border-b border-[var(--color-line)]">
        <h2 className="text-sm font-medium tracking-[0.1em] text-[var(--color-text-label)] uppercase mb-4">
          {t('paymentMethod')}
        </h2>
        <div className="space-y-2">
          {paymentMethods.map(method => (
            <button
              key={method.id}
              onClick={() => setSelectedPayment(method.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-[var(--radius-md)] border transition-colors ${
                selectedPayment === method.id
                  ? 'border-[var(--color-accent)] bg-[var(--color-bg-element)]'
                  : 'border-[var(--color-line)]'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedPayment === method.id
                  ? 'border-[var(--color-accent)]'
                  : 'border-[var(--color-line)]'
              }`}>
                {selectedPayment === method.id && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />
                )}
              </div>
              {method.icon && <method.icon size={18} className="text-[var(--color-text-label)]" />}
              <span className="text-sm text-[var(--color-text-body)]">{method.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Promo Code & Delivery */}
      <section className="px-4 py-6 border-b border-[var(--color-line)]">
        <button className="flex items-center gap-3 w-full py-3">
          <Tag size={18} className="text-[var(--color-text-label)]" />
          <span className="text-sm text-[var(--color-text-body)]">{t('addPromoCode')}</span>
          <ChevronRight size={18} className="text-[var(--color-text-label)] ml-auto" />
        </button>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Truck size={18} className="text-[var(--color-text-label)]" />
            <span className="text-sm text-[var(--color-text-body)]">{t('delivery')}</span>
          </div>
          <span className="text-sm font-medium text-[var(--color-title-active)]">
            {shipping === 0 ? t('free') : `$${shipping.toFixed(2)}`}
          </span>
        </div>
      </section>

      {/* Fixed Bottom */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-line)] p-4 z-20"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium tracking-[0.1em] text-[var(--color-text-body)] uppercase">
            {t('title')}
          </span>
          <span className="text-xl font-semibold text-[var(--color-title-active)]">
            ${total.toFixed(2)}
          </span>
        </div>
        <Button
          variant="inverse"
          size="lg"
          fullWidth
          leftIcon={<Lock size={18} />}
          isLoading={isProcessing}
          onClick={handlePlaceOrder}
        >
          {t('placeOrder')}
        </Button>
      </motion.div>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.push(`/${locale}`);
        }}
        title=""
      >
        <div className="text-center py-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--color-success)] flex items-center justify-center"
          >
            <Check size={40} className="text-white" />
          </motion.div>
          <h2 className="text-xl font-medium tracking-[0.1em] text-[var(--color-title-active)] uppercase mb-2">
            {tPayment('success')}
          </h2>
          <p className="text-sm text-[var(--color-text-body)] mb-2">
            Your payment was successful
          </p>
          <p className="text-xs text-[var(--color-text-label)] mb-8">
            {tPayment('paymentId')} #15263541
          </p>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowSuccessModal(false)}
            >
              {tPayment('submit')}
            </Button>
            <Link href={`/${locale}`} className="flex-1">
              <Button variant="primary" fullWidth>
                {tPayment('backToHome')}
              </Button>
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  );
}

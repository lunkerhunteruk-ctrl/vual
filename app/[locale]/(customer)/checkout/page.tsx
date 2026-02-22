'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ChevronRight, MapPin, Truck, CreditCard, Tag, Plus, Lock, ShoppingBag, AlertCircle } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { useCartStore } from '@/lib/store/cart';

const shippingMethods = [
  { id: 'pickup', label: 'Pickup at store', price: 0 },
  { id: 'standard', label: 'Standard Shipping', price: 5 },
  { id: 'express', label: 'Express Shipping', price: 15 },
];

export default function CheckoutPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('customer.checkout');

  // Connect to real cart store
  const { items: cartItems, subtotal, total, shippingCost, setShippingCost, clearCart } = useCartStore();

  const [selectedShipping, setSelectedShipping] = useState('pickup');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shipping address state
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'JP',
    phone: '',
  });

  const handleShippingChange = (methodId: string) => {
    setSelectedShipping(methodId);
    const method = shippingMethods.find(m => m.id === methodId);
    if (method) {
      setShippingCost(method.price);
    }
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      setError('Your cart is empty');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Call the real checkout API
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          shippingCost,
          locale,
          shippingAddress: shippingAddress.name ? {
            name: shippingAddress.name,
            address: {
              line1: shippingAddress.address,
              city: shippingAddress.city,
              state: shippingAddress.state,
              postal_code: shippingAddress.postal_code,
              country: shippingAddress.country,
            },
          } : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle inventory errors
        if (data.unavailableItems) {
          setError(`Stock unavailable: ${data.unavailableItems.join(', ')}`);
        } else {
          setError(data.error || 'Failed to create checkout session');
        }
        return;
      }

      // Redirect to Stripe checkout
      if (data.url) {
        // Clear cart before redirecting (will be confirmed by webhook)
        clearCart();
        window.location.href = data.url;
      } else {
        setError('Failed to get checkout URL');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('An error occurred during checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  // If cart is empty, show empty state
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 mb-6 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center">
          <ShoppingBag size={32} className="text-[var(--color-text-label)]" />
        </div>
        <p className="text-sm text-[var(--color-text-body)] mb-6 text-center">
          Your cart is empty. Add items before checkout.
        </p>
        <Link href={`/${locale}`}>
          <Button variant="primary">Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="px-4 py-6 text-center border-b border-[var(--color-line)]">
        <h1 className="text-lg font-medium tracking-[0.15em] text-[var(--color-title-active)] uppercase">
          {t('title')}
        </h1>
        <div className="w-12 h-0.5 bg-[var(--color-title-active)] mx-auto mt-2" />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-[var(--radius-md)] flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Order Summary */}
      <section className="px-4 py-6 border-b border-[var(--color-line)]">
        <h2 className="text-sm font-medium tracking-[0.1em] text-[var(--color-text-label)] uppercase mb-4">
          Order Summary ({cartItems.length} items)
        </h2>
        <div className="space-y-3">
          {cartItems.map(item => (
            <div key={`${item.productId}-${item.variantId || ''}`} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[var(--color-bg-element)] rounded-[var(--radius-sm)] overflow-hidden flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-title-active)] truncate">{item.name}</p>
                <p className="text-xs text-[var(--color-text-label)]">Qty: {item.quantity}</p>
              </div>
              <p className="text-sm font-medium text-[var(--color-title-active)]">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Shipping Address */}
      <section className="px-4 py-6 border-b border-[var(--color-line)]">
        <h2 className="text-sm font-medium tracking-[0.1em] text-[var(--color-text-label)] uppercase mb-4">
          {t('shippingAddress')}
        </h2>
        <p className="text-xs text-[var(--color-text-label)] mb-4">
          Leave empty to enter address during Stripe checkout
        </p>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Full Name"
            value={shippingAddress.name}
            onChange={(e) => setShippingAddress(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-3 border border-[var(--color-line)] rounded-[var(--radius-md)] text-sm"
          />
          <input
            type="text"
            placeholder="Address"
            value={shippingAddress.address}
            onChange={(e) => setShippingAddress(prev => ({ ...prev, address: e.target.value }))}
            className="w-full px-4 py-3 border border-[var(--color-line)] rounded-[var(--radius-md)] text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="City"
              value={shippingAddress.city}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-4 py-3 border border-[var(--color-line)] rounded-[var(--radius-md)] text-sm"
            />
            <input
              type="text"
              placeholder="Postal Code"
              value={shippingAddress.postal_code}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, postal_code: e.target.value }))}
              className="w-full px-4 py-3 border border-[var(--color-line)] rounded-[var(--radius-md)] text-sm"
            />
          </div>
        </div>
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
              onClick={() => handleShippingChange(method.id)}
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
              <span className="text-sm font-medium text-[var(--color-title-active)]">
                {method.price === 0 ? 'FREE' : `$${method.price.toFixed(2)}`}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Price Summary */}
      <section className="px-4 py-6 border-b border-[var(--color-line)]">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-body)]">Subtotal</span>
            <span className="text-sm text-[var(--color-title-active)]">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-body)]">Shipping</span>
            <span className="text-sm text-[var(--color-title-active)]">
              {shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}
            </span>
          </div>
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
            Total
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
          disabled={cartItems.length === 0}
        >
          {t('placeOrder')} - Pay with Stripe
        </Button>
        <p className="text-xs text-center text-[var(--color-text-label)] mt-2">
          You will be redirected to Stripe for secure payment
        </p>
      </motion.div>
    </div>
  );
}

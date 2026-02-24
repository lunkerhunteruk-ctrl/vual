'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Lock, Tag, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { CartItem } from '@/components/customer/cart';
import { useCartStore } from '@/lib/store/cart';

export default function CartPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('customer.cart');

  // Use real cart store instead of mock data
  const { items: cartItems, subtotal, discount, couponCode, total, updateQuantity, removeItem, applyCoupon, removeCoupon } = useCartStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const handleUpdateQuantity = (productId: string, quantity: number, variantId?: string) => {
    updateQuantity(productId, quantity, variantId);
  };

  const handleRemoveItem = (productId: string, variantId?: string) => {
    removeItem(productId, variantId);
  };

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-14 z-10 bg-white border-b border-[var(--color-line)] px-4 py-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 text-[var(--color-title-active)]"
        >
          <X size={24} />
        </button>
        <h1 className="text-lg font-medium tracking-[0.15em] text-[var(--color-title-active)] uppercase">
          {t('title')}
        </h1>
        <div className="w-6" /> {/* Spacer for centering */}
      </div>

      {/* Cart Content */}
      <div className="px-4">
        <AnimatePresence>
          {cartItems.length > 0 ? (
            cartItems.map(item => (
              <CartItem
                key={`${item.productId}-${item.variantId || ''}`}
                id={item.productId}
                name={item.name}
                brand={item.options?.brand || ''}
                price={`$${item.price}`}
                quantity={item.quantity}
                size={item.options?.size || ''}
                color={item.options?.color || ''}
                image={item.image}
                onQuantityChange={(qty) => handleUpdateQuantity(item.productId, qty, item.variantId)}
                onRemove={() => handleRemoveItem(item.productId, item.variantId)}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-20 h-20 mb-6 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center">
                <ShoppingBag size={32} className="text-[var(--color-text-label)]" />
              </div>
              <p className="text-sm text-[var(--color-text-body)] mb-6">
                {t('empty')}
              </p>
              <Link href={`/${locale}`}>
                <Button variant="primary">
                  Continue Shopping
                </Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Coupon & Summary */}
      {cartItems.length > 0 && (
        <div className="px-4 mt-4 space-y-4">
          {/* Coupon Input */}
          {couponCode ? (
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-[var(--radius-md)]">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">{couponCode}</span>
                <span className="text-xs text-emerald-600">
                  (-{discount > 0 ? `$${discount.toFixed(2)}` : ''})
                </span>
              </div>
              <button
                onClick={() => { removeCoupon(); setCouponInput(''); setCouponError(null); }}
                className="text-xs text-emerald-600 hover:text-emerald-800"
              >
                {locale === 'ja' ? '削除' : 'Remove'}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                    placeholder={locale === 'ja' ? 'クーポンコード' : 'Coupon code'}
                    className="w-full h-10 pl-9 pr-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)] uppercase"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!couponInput.trim()) return;
                    setCouponLoading(true);
                    setCouponError(null);
                    const ok = await applyCoupon(couponInput.trim());
                    if (!ok) {
                      setCouponError(locale === 'ja' ? '無効なクーポンコードです' : 'Invalid coupon code');
                    }
                    setCouponLoading(false);
                  }}
                  disabled={couponLoading || !couponInput.trim()}
                  className="h-10 px-4 text-sm font-medium text-[var(--color-accent)] border border-[var(--color-accent)] rounded-[var(--radius-md)] hover:bg-[var(--color-accent)]/5 transition-colors disabled:opacity-50"
                >
                  {couponLoading ? <Loader2 size={14} className="animate-spin" /> : locale === 'ja' ? '適用' : 'Apply'}
                </button>
              </div>
              {couponError && (
                <p className="text-xs text-red-500 mt-1.5">{couponError}</p>
              )}
            </div>
          )}

          {/* Order Summary */}
          <div className="space-y-2 py-3 border-t border-[var(--color-line)]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-body)]">{locale === 'ja' ? '小計' : 'Subtotal'}</span>
              <span className="text-[var(--color-text-body)]">${subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-body)]">{locale === 'ja' ? '割引' : 'Discount'}</span>
                <span className="text-emerald-600">-${discount.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fixed Bottom */}
      {cartItems.length > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-line)] p-4 z-20"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium tracking-[0.1em] text-[var(--color-text-body)] uppercase">
              {t('total')}
            </span>
            <span className="text-xl font-semibold text-[var(--color-title-active)]">
              ${total.toFixed(2)}
            </span>
          </div>
          <Link href={`/${locale}/checkout`}>
            <Button variant="inverse" size="lg" fullWidth leftIcon={<Lock size={18} />}>
              {t('checkout')}
            </Button>
          </Link>
        </motion.div>
      )}
    </div>
  );
}

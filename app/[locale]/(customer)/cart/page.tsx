'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Lock } from 'lucide-react';
import { Button } from '@/components/ui';
import { CartItem } from '@/components/customer/cart';
import { useCartStore } from '@/lib/store/cart';

export default function CartPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('customer.cart');

  // Use real cart store instead of mock data
  const { items: cartItems, total, updateQuantity, removeItem } = useCartStore();

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

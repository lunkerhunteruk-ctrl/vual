import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Cart } from '../types';

interface CartStore extends Cart {
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  setShippingCost: (cost: number) => void;
}

const calculateTotals = (items: CartItem[], shippingCost: number, discount: number) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Math.max(0, subtotal + shippingCost - discount);
  return { subtotal, total };
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      subtotal: 0,
      shippingCost: 0,
      discount: 0,
      total: 0,
      couponCode: undefined,

      addItem: (item) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.productId === item.productId && i.variantId === item.variantId
          );

          let newItems: CartItem[];
          if (existingIndex >= 0) {
            newItems = state.items.map((i, index) =>
              index === existingIndex
                ? { ...i, quantity: i.quantity + (item.quantity || 1) }
                : i
            );
          } else {
            newItems = [...state.items, { ...item, quantity: item.quantity || 1 }];
          }

          const totals = calculateTotals(newItems, state.shippingCost, state.discount);
          return { items: newItems, ...totals };
        });
      },

      removeItem: (productId, variantId) => {
        set((state) => {
          const newItems = state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          );
          const totals = calculateTotals(newItems, state.shippingCost, state.discount);
          return { items: newItems, ...totals };
        });
      },

      updateQuantity: (productId, quantity, variantId) => {
        set((state) => {
          if (quantity <= 0) {
            const newItems = state.items.filter(
              (i) => !(i.productId === productId && i.variantId === variantId)
            );
            const totals = calculateTotals(newItems, state.shippingCost, state.discount);
            return { items: newItems, ...totals };
          }

          const newItems = state.items.map((i) =>
            i.productId === productId && i.variantId === variantId
              ? { ...i, quantity }
              : i
          );
          const totals = calculateTotals(newItems, state.shippingCost, state.discount);
          return { items: newItems, ...totals };
        });
      },

      clearCart: () => {
        set({
          items: [],
          subtotal: 0,
          shippingCost: 0,
          discount: 0,
          total: 0,
          couponCode: undefined,
        });
      },

      applyCoupon: async (code) => {
        // In production, validate coupon via API
        try {
          const response = await fetch('/api/coupons/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, subtotal: get().subtotal }),
          });

          if (!response.ok) {
            return false;
          }

          const { discount } = await response.json();
          set((state) => {
            const totals = calculateTotals(state.items, state.shippingCost, discount);
            return { couponCode: code, discount, ...totals };
          });
          return true;
        } catch {
          return false;
        }
      },

      removeCoupon: () => {
        set((state) => {
          const totals = calculateTotals(state.items, state.shippingCost, 0);
          return { couponCode: undefined, discount: 0, ...totals };
        });
      },

      setShippingCost: (cost) => {
        set((state) => {
          const totals = calculateTotals(state.items, cost, state.discount);
          return { shippingCost: cost, ...totals };
        });
      },
    }),
    {
      name: 'vual-cart',
      partialize: (state) => ({
        items: state.items,
        couponCode: state.couponCode,
      }),
    }
  )
);

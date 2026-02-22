import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Customer } from '../types';

interface AuthStore {
  // Admin auth (Firebase)
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signOut: () => void;

  // Customer auth (LINE LIFF)
  customer: Customer | null;
  isCustomerLoading: boolean;
  setCustomer: (customer: Customer | null) => void;
  setCustomerLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // Admin auth
      user: null,
      isLoading: true,
      error: null,
      setUser: (user) => set({ user, isLoading: false, error: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),
      signOut: () => set({ user: null, customer: null, error: null }),

      // Customer auth
      customer: null,
      isCustomerLoading: true,
      setCustomer: (customer) => set({ customer, isCustomerLoading: false }),
      setCustomerLoading: (isCustomerLoading) => set({ isCustomerLoading }),
    }),
    {
      name: 'vual-auth',
      partialize: (state) => ({
        // Only persist minimal data, re-validate on load
        user: state.user ? { id: state.user.id, role: state.user.role } : null,
      }),
    }
  )
);

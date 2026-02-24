import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CustomerContextStore {
  /** The storeId this customer entered from (via LIFF URL param) */
  storeId: string | null;
  /** Store display name (fetched once) */
  storeName: string | null;
  setStoreId: (storeId: string | null) => void;
  setStoreName: (name: string | null) => void;
  clear: () => void;
}

export const useCustomerContext = create<CustomerContextStore>()(
  persist(
    (set) => ({
      storeId: null,
      storeName: null,
      setStoreId: (storeId) => set({ storeId }),
      setStoreName: (storeName) => set({ storeName }),
      clear: () => set({ storeId: null, storeName: null }),
    }),
    {
      name: 'vual-customer-context',
    }
  )
);

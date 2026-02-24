import { create } from 'zustand';
import type { StoreInfo } from '../store-resolver';

interface StoreContextState {
  store: StoreInfo | null;
  isRootDomain: boolean;
  setStore: (store: StoreInfo | null) => void;
  setIsRootDomain: (val: boolean) => void;
}

export const useStoreContext = create<StoreContextState>((set) => ({
  store: null,
  isRootDomain: false,
  setStore: (store) => set({ store }),
  setIsRootDomain: (isRootDomain) => set({ isRootDomain }),
}));

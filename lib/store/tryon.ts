import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VTONCategory } from '@/lib/utils/vton-category';

export interface TryOnListItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  currency: string;
  category: VTONCategory;
  subCategory?: string; // 'tops' | 'outer' | 'pants' | 'skirts' | 'dresses' | 'shoes'
  storeId: string;
  addedAt: string;
}

export interface Portrait {
  id: string;
  name: string;
  dataUrl: string; // base64 data URL
  createdAt: string;
}

export interface TryOnResult {
  id: string;
  portraitId: string;
  garmentName: string;
  garmentImageUrl?: string;
  resultImage: string; // base64
  createdAt: string;
}

export interface ConsumerCredits {
  freeTickets: number;
  dailyFreeLimit: number;
  paidCredits: number;
  subscriptionCredits: number;
  isSubscribed: boolean;
}

interface TryOnStore {
  portraits: Portrait[];
  results: TryOnResult[];
  credits: ConsumerCredits | null;
  creditsLoading: boolean;

  // Pool: all items the user has added
  tryOnPool: TryOnListItem[];
  // Slots: 3 named slots, each can hold any item
  tryOnSlots: Record<string, TryOnListItem | null>;
  // Model settings
  modelGender: 'female' | 'male';
  modelHeight: number;

  // Portrait actions
  addPortrait: (portrait: Portrait) => void;
  removePortrait: (id: string) => void;
  // Result actions
  addResult: (result: TryOnResult) => void;
  clearResults: () => void;
  // Credit actions
  loadCredits: (lineUserId?: string, customerId?: string) => Promise<void>;
  setCredits: (credits: ConsumerCredits | null) => void;
  // Pool actions
  addToPool: (item: TryOnListItem) => void;
  removeFromPool: (productId: string) => void;
  clearPool: () => void;
  // Slot actions
  assignToSlot: (slotId: string, item: TryOnListItem) => void;
  unassignSlot: (slotId: string) => void;
  swapSlots: (fromSlotId: string, toSlotId: string) => void;
  clearSlots: () => void;
  // Model settings actions
  setModelGender: (gender: 'female' | 'male') => void;
  setModelHeight: (height: number) => void;

  // Backward compat (delegates to pool)
  addToTryOnList: (item: TryOnListItem) => void;
  removeFromTryOnList: (category: string) => void;
  clearTryOnList: () => void;
}

const DEFAULT_SLOTS: Record<string, TryOnListItem | null> = {
  upper_body: null,
  lower_body: null,
  footwear: null,
};

export const useTryOnStore = create<TryOnStore>()(
  persist(
    (set) => ({
      portraits: [],
      results: [],
      credits: null,
      creditsLoading: false,
      tryOnPool: [],
      tryOnSlots: { ...DEFAULT_SLOTS },
      modelGender: 'female' as const,
      modelHeight: 165,

      addPortrait: (portrait) =>
        set((state) => ({
          portraits: [portrait, ...state.portraits].slice(0, 5),
        })),
      removePortrait: (id) =>
        set((state) => ({
          portraits: state.portraits.filter((p) => p.id !== id),
        })),
      addResult: (result) =>
        set((state) => ({
          results: [result, ...state.results].slice(0, 20),
        })),
      clearResults: () => set({ results: [] }),
      loadCredits: async (lineUserId?: string, customerId?: string) => {
        set({ creditsLoading: true });
        try {
          const params = new URLSearchParams();
          if (customerId) params.set('customerId', customerId);
          else if (lineUserId) params.set('lineUserId', lineUserId);
          else {
            set({ creditsLoading: false });
            return;
          }

          const res = await fetch(`/api/billing/balance?${params}`);
          const data = await res.json();
          if (data.success) {
            set({
              credits: {
                freeTickets: data.freeTickets ?? 0,
                dailyFreeLimit: data.dailyFreeLimit ?? 3,
                paidCredits: data.paidCredits ?? 0,
                subscriptionCredits: data.subscriptionCredits ?? 0,
                isSubscribed: data.subscriptionStatus === 'active',
              },
            });
          }
        } catch {
          console.error('Failed to load credits');
        } finally {
          set({ creditsLoading: false });
        }
      },
      setCredits: (credits) => set({ credits }),

      // Pool actions
      addToPool: (item) =>
        set((state) => {
          if (state.tryOnPool.some((p) => p.productId === item.productId)) {
            return state; // Already in pool
          }
          return { tryOnPool: [item, ...state.tryOnPool].slice(0, 10) };
        }),
      removeFromPool: (productId) =>
        set((state) => {
          const newSlots = { ...state.tryOnSlots };
          for (const key of Object.keys(newSlots)) {
            if (newSlots[key]?.productId === productId) {
              newSlots[key] = null;
            }
          }
          return {
            tryOnPool: state.tryOnPool.filter((p) => p.productId !== productId),
            tryOnSlots: newSlots,
          };
        }),
      clearPool: () => set({ tryOnPool: [], tryOnSlots: { ...DEFAULT_SLOTS } }),

      // Slot actions
      assignToSlot: (slotId, item) =>
        set((state) => {
          const newSlots = { ...state.tryOnSlots };
          // Remove item from any other slot first
          for (const key of Object.keys(newSlots)) {
            if (newSlots[key]?.productId === item.productId) {
              newSlots[key] = null;
            }
          }
          newSlots[slotId] = item;
          return { tryOnSlots: newSlots };
        }),
      unassignSlot: (slotId) =>
        set((state) => ({
          tryOnSlots: { ...state.tryOnSlots, [slotId]: null },
        })),
      swapSlots: (fromSlotId, toSlotId) =>
        set((state) => {
          const newSlots = { ...state.tryOnSlots };
          const temp = newSlots[fromSlotId];
          newSlots[fromSlotId] = newSlots[toSlotId];
          newSlots[toSlotId] = temp;
          return { tryOnSlots: newSlots };
        }),
      clearSlots: () => set({ tryOnSlots: { ...DEFAULT_SLOTS } }),

      // Model settings
      setModelGender: (gender) => set({ modelGender: gender }),
      setModelHeight: (height) => set({ modelHeight: height }),

      // Backward compat
      addToTryOnList: (item) =>
        set((state) => {
          // Add to pool
          const inPool = state.tryOnPool.some((p) => p.productId === item.productId);
          const newPool = inPool ? state.tryOnPool : [item, ...state.tryOnPool].slice(0, 10);
          // Auto-assign to matching slot
          const slotKey = item.category === 'dresses' ? 'upper_body' : item.category;
          const newSlots = { ...state.tryOnSlots };
          // Remove from other slots if already there
          for (const key of Object.keys(newSlots)) {
            if (newSlots[key]?.productId === item.productId) {
              newSlots[key] = null;
            }
          }
          newSlots[slotKey] = item;
          return { tryOnPool: newPool, tryOnSlots: newSlots };
        }),
      removeFromTryOnList: (category) =>
        set((state) => ({
          tryOnSlots: { ...state.tryOnSlots, [category]: null },
        })),
      clearTryOnList: () => set({ tryOnPool: [], tryOnSlots: { ...DEFAULT_SLOTS } }),
    }),
    {
      name: 'vual-tryon',
      version: 2,
      partialize: (state) => ({
        portraits: state.portraits,
        results: state.results,
        tryOnPool: state.tryOnPool,
        tryOnSlots: state.tryOnSlots,
        modelGender: state.modelGender,
        modelHeight: state.modelHeight,
      }),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version < 2) {
          // Migrate old tryOnList to pool + slots
          const oldList = (state?.tryOnList || {}) as Record<string, TryOnListItem>;
          const pool: TryOnListItem[] = Object.values(oldList);
          const slots: Record<string, TryOnListItem | null> = {
            upper_body: oldList.upper_body || null,
            lower_body: oldList.lower_body || null,
            footwear: oldList.footwear || null,
          };
          return {
            ...state,
            tryOnPool: pool,
            tryOnSlots: slots,
            modelGender: 'female',
            modelHeight: 165,
          };
        }
        return state;
      },
    }
  )
);

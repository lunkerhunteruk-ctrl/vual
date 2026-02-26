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
  paidCredits: number;
  subscriptionCredits: number;
  isSubscribed: boolean;
}

interface TryOnStore {
  portraits: Portrait[];
  results: TryOnResult[];
  credits: ConsumerCredits | null;
  creditsLoading: boolean;
  tryOnList: Record<string, TryOnListItem>;
  addPortrait: (portrait: Portrait) => void;
  removePortrait: (id: string) => void;
  addResult: (result: TryOnResult) => void;
  clearResults: () => void;
  loadCredits: (lineUserId?: string, customerId?: string) => Promise<void>;
  setCredits: (credits: ConsumerCredits | null) => void;
  addToTryOnList: (item: TryOnListItem) => void;
  removeFromTryOnList: (category: string) => void;
  clearTryOnList: () => void;
}

export const useTryOnStore = create<TryOnStore>()(
  persist(
    (set) => ({
      portraits: [],
      results: [],
      credits: null,
      creditsLoading: false,
      tryOnList: {},
      addPortrait: (portrait) =>
        set((state) => ({
          portraits: [portrait, ...state.portraits].slice(0, 5), // Max 5
        })),
      removePortrait: (id) =>
        set((state) => ({
          portraits: state.portraits.filter((p) => p.id !== id),
        })),
      addResult: (result) =>
        set((state) => ({
          results: [result, ...state.results].slice(0, 20), // Max 20
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
      addToTryOnList: (item) =>
        set((state) => {
          // dresses maps to upper_body slot
          const slotKey = item.category === 'dresses' ? 'upper_body' : item.category;
          return {
            tryOnList: { ...state.tryOnList, [slotKey]: item },
          };
        }),
      removeFromTryOnList: (category) =>
        set((state) => {
          const next = { ...state.tryOnList };
          delete next[category];
          return { tryOnList: next };
        }),
      clearTryOnList: () => set({ tryOnList: {} }),
    }),
    {
      name: 'vual-tryon',
      partialize: (state) => ({
        portraits: state.portraits,
        results: state.results,
        tryOnList: state.tryOnList,
      }),
    }
  )
);

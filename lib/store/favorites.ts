import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoriteItem {
  productId: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  addedAt: string;
}

interface FavoritesStore {
  items: FavoriteItem[];
  toggle: (item: Omit<FavoriteItem, 'addedAt'>) => void;
  remove: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      items: [],

      toggle: (item) => {
        const exists = get().items.some((i) => i.productId === item.productId);
        if (exists) {
          set((state) => ({
            items: state.items.filter((i) => i.productId !== item.productId),
          }));
        } else {
          set((state) => ({
            items: [...state.items, { ...item, addedAt: new Date().toISOString() }],
          }));
        }
      },

      remove: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },

      isFavorite: (productId) => {
        return get().items.some((i) => i.productId === productId);
      },

      clear: () => set({ items: [] }),
    }),
    {
      name: 'vual-favorites',
    }
  )
);

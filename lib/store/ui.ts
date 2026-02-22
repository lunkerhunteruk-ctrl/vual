import { create } from 'zustand';

type Theme = 'vual' | 'modern' | 'organic' | 'street' | 'elegant';

interface UIStore {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Sidebar (Admin)
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Mobile menu
  isMenuOpen: boolean;
  toggleMenu: () => void;
  setMenuOpen: (open: boolean) => void;

  // Search modal
  isSearchOpen: boolean;
  toggleSearch: () => void;
  setSearchOpen: (open: boolean) => void;

  // Cart drawer
  isCartOpen: boolean;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;

  // Global loading
  isPageLoading: boolean;
  setPageLoading: (loading: boolean) => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

let toastId = 0;

export const useUIStore = create<UIStore>((set) => ({
  // Theme
  theme: 'vual',
  setTheme: (theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    set({ theme });
  },

  // Sidebar
  isSidebarOpen: true,
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),

  // Mobile menu
  isMenuOpen: false,
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
  setMenuOpen: (isMenuOpen) => set({ isMenuOpen }),

  // Search modal
  isSearchOpen: false,
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
  setSearchOpen: (isSearchOpen) => set({ isSearchOpen }),

  // Cart drawer
  isCartOpen: false,
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
  setCartOpen: (isCartOpen) => set({ isCartOpen }),

  // Global loading
  isPageLoading: false,
  setPageLoading: (isPageLoading) => set({ isPageLoading }),

  // Toast notifications
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${++toastId}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
  clearToasts: () => set({ toasts: [] }),
}));

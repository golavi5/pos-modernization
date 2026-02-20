import { create } from 'zustand';
import { storage } from '@/services/storage';

export type Theme = 'light' | 'dark' | 'system';

interface UIStore {
  // Sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Mobile Menu
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;

  // Toast
  toastMessage: { message: string; type: 'success' | 'error' | 'warning' | 'info' } | null;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  clearToast: () => void;

  // Dialog
  dialogs: Record<string, boolean>;
  openDialog: (dialogId: string) => void;
  closeDialog: (dialogId: string) => void;
  toggleDialog: (dialogId: string) => void;

  // Breadcrumbs
  breadcrumbs: Array<{ label: string; path?: string }>;
  setBreadcrumbs: (breadcrumbs: Array<{ label: string; path?: string }>) => void;

  // Initialize from storage
  initialize: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Sidebar
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed: boolean) => {
    storage.setSidebarCollapsed(collapsed);
    set({ sidebarCollapsed: collapsed });
  },

  // Theme
  theme: 'light',
  setTheme: (theme: Theme) => {
    storage.setTheme(theme);
    set({ theme });

    // Apply theme to DOM
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },

  // Mobile Menu
  mobileMenuOpen: false,
  setMobileMenuOpen: (open: boolean) => set({ mobileMenuOpen: open }),

  // Toast
  toastMessage: null,
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    set({ toastMessage: { message, type } });

    // Auto-clear after delay
    setTimeout(() => {
      set({ toastMessage: null });
    }, 4000);
  },
  clearToast: () => set({ toastMessage: null }),

  // Dialog
  dialogs: {},
  openDialog: (dialogId: string) =>
    set((state) => ({
      dialogs: { ...state.dialogs, [dialogId]: true },
    })),
  closeDialog: (dialogId: string) =>
    set((state) => ({
      dialogs: { ...state.dialogs, [dialogId]: false },
    })),
  toggleDialog: (dialogId: string) =>
    set((state) => ({
      dialogs: { ...state.dialogs, [dialogId]: !state.dialogs[dialogId] },
    })),

  // Breadcrumbs
  breadcrumbs: [],
  setBreadcrumbs: (breadcrumbs: Array<{ label: string; path?: string }>) =>
    set({ breadcrumbs }),

  // Initialize from storage
  initialize: () => {
    const sidebarCollapsed = storage.isSidebarCollapsed();
    const theme = (storage.getTheme() || 'light') as Theme;

    set({ sidebarCollapsed, theme });

    // Apply theme to DOM
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  },
}));

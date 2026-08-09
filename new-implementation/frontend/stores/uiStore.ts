'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  /** Sidebar rail held open regardless of hover/focus. */
  sidebarPinned: boolean;
  toggleSidebarPinned: () => void;
}

/**
 * UI preferences. Deliberately separate from `authStore`: a display preference
 * must survive logout and must not be cleared by an auth reset.
 *
 * When `localStorage` is unavailable (private browsing), `persist` rehydration
 * fails silently and the default below stands — the sidebar then behaves
 * exactly as it did before the pin existed.
 */
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarPinned: false,
      toggleSidebarPinned: () => set((s) => ({ sidebarPinned: !s.sidebarPinned })),
    }),
    { name: 'ui-store' },
  ),
);

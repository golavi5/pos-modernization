'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { User } from '@/types/auth';
import { authAPI } from '@/lib/api/auth';

// The middleware (server-side) can't read the Zustand store, so it gates
// (panel) routes on the presence of an `accessToken` cookie. Keep that cookie
// in lockstep with real auth state: set it with the actual token on login /
// refresh, and clear it on logout.
const AUTH_COOKIE = 'accessToken';

function setAuthCookie(token: string) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  // max-age tracks the refresh-token lifetime (7d); the axios interceptor
  // renews the access token within that window.
  document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=604800; samesite=lax${secure}`;
}

// Exported: consumers that discover the cookie has outlived the auth state
// (see app/(panel)/layout.tsx) must be able to drop it, or middleware keeps
// redirecting /login back into the panel.
export function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshTokenValue: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // False until the persist middleware has restored state from localStorage.
  // Consumers that redirect based on `isAuthenticated` must wait for this —
  // otherwise they act on the pre-hydration default (false) first. See
  // app/(panel)/layout.tsx.
  hasHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshTokenMethod: () => Promise<void>;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setHasHydrated: (value: boolean) => void;
  hydrate: () => void;
}

// The slice that actually round-trips through localStorage (see `partialize`).
type PersistedAuthState = Pick<
  AuthState,
  'user' | 'accessToken' | 'refreshTokenValue' | 'isAuthenticated'
>;

// Built eagerly, because whether it is `undefined` is the exact condition
// persist bails on: `createJSONStorage` swallows a throwing `localStorage`
// access (blocked by browser policy, private mode, kiosk profiles) and returns
// `undefined`, and persist then returns before `hydrate()` — so
// `onRehydrateStorage` never fires and anything waiting on `hasHydrated` waits
// forever. Passing it explicitly is what zustand v4 defaults to anyway.
const jsonStorage = createJSONStorage<PersistedAuthState>(() => localStorage);

// A corrupt or truncated `auth-store` value makes `JSON.parse` throw inside
// `getItem`, which routes hydration into persist's `.catch` — and state set
// from there is *discarded*: with nothing restored, persist returns its
// pre-hydration `configResult` (zustand 4.5.7 middleware.js:590) and
// `createStore` installs that as the state, overwriting whatever the callback
// just set. Treat unreadable persisted state as absent instead, so hydration
// stays on the success path and simply finds nobody logged in.
const authStorage: typeof jsonStorage = jsonStorage && {
  ...jsonStorage,
  getItem: (name) => {
    try {
      return jsonStorage.getItem(name);
    } catch {
      return null;
    }
  },
};

// Nothing will ever be restored when there is no storage, so there is nothing
// to wait for — start hydrated and let consumers act on the in-memory defaults
// (logged out) instead of blocking on a callback that cannot arrive.
const INITIAL_HAS_HYDRATED = typeof window !== 'undefined' && !authStorage;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshTokenValue: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hasHydrated: INITIAL_HAS_HYDRATED,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login({ email, password });
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshTokenValue: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          setAuthCookie(response.accessToken);
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Login failed';
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
          });
          throw new Error(errorMessage);
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshTokenValue: null,
          isAuthenticated: false,
          error: null,
        });
        clearAuthCookie();
      },

      refreshTokenMethod: async () => {
        const { refreshTokenValue } = get();
        if (!refreshTokenValue) {
          throw new Error('No refresh token available');
        }

        try {
          const response = await authAPI.refreshToken(refreshTokenValue);
          set({
            accessToken: response.accessToken,
            refreshTokenValue: response.refreshToken ?? refreshTokenValue,
            error: null,
          });
          setAuthCookie(response.accessToken);
        } catch (error: any) {
          set({ isAuthenticated: false });
          throw error;
        }
      },

      setUser: (user: User | null) => {
        set({ user });
      },

      setAccessToken: (token: string | null) => {
        set({ accessToken: token });
      },

      setRefreshToken: (token: string | null) => {
        set({ refreshTokenValue: token });
      },

      setHasHydrated: (value: boolean) => {
        set({ hasHydrated: value });
      },

      hydrate: () => {
        // This is called automatically by Zustand persist middleware
      },
    }),
    {
      name: 'auth-store',
      storage: authStorage,
      partialize: (state): PersistedAuthState => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshTokenValue: state.refreshTokenValue,
        isAuthenticated: state.isAuthenticated,
      }),
      // Never reads the callback's own `state` argument: zustand passes
      // `undefined` there whenever rehydration throws, so `state?.` would
      // silently no-op on exactly the path that most needs the flag set. The
      // pre-hydration state handed to the outer function is always defined
      // (`get() ?? configResult`) and its actions close over the store's `set`.
      //
      // Timing differs per path and both matter:
      // - success: set synchronously, so the flag is already true on the first
      //   render (persist re-reads `get()` right after this callback and
      //   returns that, so the write survives). Deferring here would gate the
      //   first render on `hasHydrated === false` for no reason.
      // - failure: a synchronous write would be thrown away — see the note on
      //   `authStorage` — so defer past `create()` and set it on the real store.
      onRehydrateStorage: (preHydrationState) => (_state, error) => {
        if (error) {
          queueMicrotask(() => preHydrationState.setHasHydrated(true));
        } else {
          preHydrationState.setHasHydrated(true);
        }
      },
    }
  )
);
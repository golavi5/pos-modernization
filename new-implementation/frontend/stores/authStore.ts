'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

function clearAuthCookie() {
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
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshTokenMethod: () => Promise<void>;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshTokenValue: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

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

      hydrate: () => {
        // This is called automatically by Zustand persist middleware
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshTokenValue: state.refreshTokenValue,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
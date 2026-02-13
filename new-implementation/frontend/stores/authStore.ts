'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/auth';
import { authAPI } from '@/lib/api/auth';

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
            accessToken: response.access_token,
            refreshTokenValue: response.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
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
      },

      refreshTokenMethod: async () => {
        const { refreshTokenValue } = get();
        if (!refreshTokenValue) {
          throw new Error('No refresh token available');
        }

        try {
          const response = await authAPI.refreshToken(refreshTokenValue);
          set({
            accessToken: response.access_token,
            error: null,
          });
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
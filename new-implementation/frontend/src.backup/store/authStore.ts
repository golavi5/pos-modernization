import { create } from 'zustand';
import { User, UserRole } from '@/types/auth.types';
import { authService } from '@/services/auth.service';
import { storage } from '@/services/storage';

interface AuthStore {
  // State
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, companyName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Helpers
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: storage.getUser<User>() || null,
  isAuthenticated: !!storage.getAccessToken(),
  loading: false,
  error: null,

  // Login action
  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await authService.login(email, password);
      set({
        user: response.user,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({
        error: message,
        loading: false,
      });
      throw error;
    }
  },

  // Register action
  register: async (email: string, password: string, name: string, companyName?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await authService.register(email, password, name, companyName);
      set({
        user: response.user,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      set({
        error: message,
        loading: false,
      });
      throw error;
    }
  },

  // Logout action
  logout: async () => {
    set({ loading: true, error: null });
    try {
      await authService.logout();
      set({
        user: null,
        isAuthenticated: false,
        loading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      set({
        error: message,
        loading: false,
      });
    }
  },

  // Refresh token action
  refreshToken: async () => {
    try {
      await authService.refreshToken();
      const user = storage.getUser<User>();
      set({ user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed';
      set({
        error: message,
        isAuthenticated: false,
        user: null,
      });
      storage.clearAuth();
    }
  },

  // Set user
  setUser: (user: User | null) => {
    if (user) {
      storage.setUser(user);
    } else {
      storage.removeUser();
    }
    set({ user });
  },

  // Set error
  setError: (error: string | null) => set({ error }),

  // Clear error
  clearError: () => set({ error: null }),

  // Check if user has role
  hasRole: (roles: UserRole | UserRole[]) => {
    const { user } = get();
    if (!user) return false;

    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return user.roles.some((role) => rolesArray.includes(role.name as UserRole));
  },

  // Check if user has permission
  hasPermission: (permission: string) => {
    const { user } = get();
    if (!user) return false;

    return user.roles.some((role) =>
      role.permissions.some((p) => p.name === permission || p.slug === permission)
    );
  },

  // Initialize auth from storage
  initializeAuth: () => {
    const storedUser = storage.getUser<User>();
    const accessToken = storage.getAccessToken();

    if (storedUser && accessToken) {
      set({
        user: storedUser,
        isAuthenticated: true,
      });
    } else {
      storage.clearAuth();
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },
}));

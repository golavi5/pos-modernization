import { useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/auth.types';

/**
 * Hook to access auth state and actions
 */
export function useAuth() {
  const state = useAuthStore();

  const login = useCallback(
    (email: string, password: string) => state.login(email, password),
    [state]
  );

  const register = useCallback(
    (email: string, password: string, name: string, companyName?: string) =>
      state.register(email, password, name, companyName),
    [state]
  );

  const logout = useCallback(() => state.logout(), [state]);

  const refreshToken = useCallback(() => state.refreshToken(), [state]);

  const hasRole = useCallback(
    (role: UserRole | UserRole[]) => state.hasRole(role),
    [state]
  );

  const hasPermission = useCallback(
    (permission: string) => state.hasPermission(permission),
    [state]
  );

  return {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,

    // Actions
    login,
    register,
    logout,
    refreshToken,
    setUser: state.setUser,
    setError: state.setError,
    clearError: state.clearError,

    // Helpers
    hasRole,
    hasPermission,
    initializeAuth: state.initializeAuth,
  };
}

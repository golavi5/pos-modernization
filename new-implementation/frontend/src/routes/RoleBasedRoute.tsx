import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/auth.types';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  requiredRoles: UserRole[];
  fallback?: React.ReactNode;
}

/**
 * RoleBasedRoute - Checks user roles and returns 403 if insufficient
 */
export function RoleBasedRoute({
  children,
  requiredRoles,
  fallback,
}: RoleBasedRouteProps): React.ReactElement {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasRequiredRole = user.roles.some((role) =>
    requiredRoles.includes(role.name as UserRole)
  );

  if (!hasRequiredRole) {
    return fallback ? <>{fallback}</> : <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

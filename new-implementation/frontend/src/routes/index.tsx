import { Suspense, lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleBasedRoute } from './RoleBasedRoute';
import { UserRole } from '@/types/auth.types';

// Layout Components
import { MainLayout } from '@/components/layouts/MainLayout';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { AdminLayout } from '@/components/layouts/AdminLayout';

// Page Components (lazy loaded)
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage'));

// Lazy Loading Component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

export const routes: RouteObject[] = [
  // Public Routes
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      {
        path: '',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <LoginPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/register',
    element: <AuthLayout />,
    children: [
      {
        path: '',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <RegisterPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/forgot-password',
    element: <AuthLayout />,
    children: [
      {
        path: '',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ForgotPasswordPage />
          </Suspense>
        ),
      },
    ],
  },

  // Protected Routes
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <DashboardPage />
          </Suspense>
        ),
      },
    ],
  },

  // Admin Routes
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <RoleBasedRoute requiredRoles={[UserRole.ADMIN]}>
          <AdminLayout />
        </RoleBasedRoute>
      </ProtectedRoute>
    ),
    children: [
      {
        path: '',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <DashboardPage />
          </Suspense>
        ),
      },
    ],
  },

  // Error Routes
  {
    path: '/unauthorized',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <UnauthorizedPage />
      </Suspense>
    ),
  },
  {
    path: '/404',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },

  // Catch-all route
  {
    path: '*',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
];

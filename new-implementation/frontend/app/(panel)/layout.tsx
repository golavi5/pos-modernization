'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/stores/authStore';
import { canAccessRoute } from '@/lib/auth/roles';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, hasHydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const forbidden = isAuthenticated && !canAccessRoute(pathname, user?.roles);

  useEffect(() => {
    // Wait for the persist middleware to restore state from localStorage —
    // until then `isAuthenticated` is its pre-hydration default (false), and
    // redirecting on that would bounce an actually-authenticated user to
    // /login, which middleware then bounces again to /dashboard (a real
    // accessToken cookie is present), stranding them off their intended route
    // on every hard reload / full navigation.
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
    } else if (forbidden) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, isAuthenticated, forbidden, router]);

  if (!hasHydrated || !isAuthenticated || forbidden) {
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

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
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // Only apply the role check once `user` is actually hydrated — otherwise the
  // Zustand-persist rehydration tick (user briefly null) would bounce an
  // allowed user off a restricted page on hard refresh.
  const roleChecked = isAuthenticated && !!user;
  const forbidden = roleChecked && !canAccessRoute(pathname, user?.roles);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (forbidden) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, forbidden, router]);

  if (!isAuthenticated || forbidden) {
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const sidebarPinned = useUIStore((s) => s.sidebarPinned);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside
        className={cn(
          'group relative flex-shrink-0 transition-[width] duration-200 ease-in-out border-r border-border bg-card overflow-hidden z-30',
          sidebarPinned ? 'w-[220px]' : 'w-[52px] hover:w-[220px] focus-within:w-[220px]',
        )}
        data-pinned={sidebarPinned}
      >
        <Sidebar />
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

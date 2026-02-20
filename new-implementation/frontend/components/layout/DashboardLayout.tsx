'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PageToolbar } from './PageToolbar';
import { useToolbar } from './ToolbarContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { config, isHidden, sidebarCollapsed } = useToolbar();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} border-r bg-surface-1 transition-all duration-300`}>
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page Toolbar */}
        {!isHidden && <PageToolbar {...config} />}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useToolbar } from './ToolbarContext';
import { Button } from '@/components/ui/button';

const menuItems = [
  { href: '/dashboard', icon: Home, key: 'dashboard' },
  { href: '/products', icon: Package, key: 'products' },
  { href: '/sales', icon: ShoppingCart, key: 'sales' },
  { href: '/customers', icon: Users, key: 'customers' },
  { href: '/reports', icon: BarChart3, key: 'reports' },
  { href: '/settings', icon: Settings, key: 'settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useToolbar();
  const t = useTranslations('sidebar');

  return (
    <div className="flex flex-col gap-4 py-4 h-full relative">
      <div className="px-4 py-2 flex items-center justify-between">
        {!sidebarCollapsed && (
          <h1 className="text-lg font-bold">{t('posSystem')}</h1>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="ml-auto"
          title={sidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')}
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      <nav className="space-y-1 px-2">
        {menuItems.map(({ href, icon: Icon, key }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          const label = t(key);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-subtle text-primary'
                  : 'hover:bg-hover-bg'
              }`}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
'use client';

import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';
import { NotificationBell } from '@/components/notifications/NotificationBell';

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/sales':         'Ventas',
  '/products':      'Productos',
  '/inventory':     'Inventario',
  '/customers':     'Clientes',
  '/users':         'Usuarios',
  '/reports':       'Reportes',
  '/notifications': 'Notificaciones',
  '/settings':      'Configuración',
};

function getLabel(pathname: string): string {
  const key = Object.keys(ROUTE_LABELS).find(
    (k) => pathname === k || pathname.startsWith(k + '/')
  );
  return key ? ROUTE_LABELS[key] : '';
}

export function Header() {
  const pathname = usePathname();
  const label = getLabel(pathname);

  return (
    <header className="h-[52px] shrink-0 border-b border-border bg-card flex items-center px-4 gap-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs shrink-0">
        <span className="text-muted-foreground">POS</span>
        {label && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-foreground">{label}</span>
          </>
        )}
      </div>

      {/* Search bar */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground w-full max-w-xs cursor-text hover:border-primary/50 transition-colors">
          <Search size={12} className="shrink-0" />
          <span>Buscar...</span>
          <kbd className="ml-auto bg-muted border border-border rounded px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 shrink-0">
        <ThemeToggle />
        <LanguageSwitcher />
        <NotificationBell />
      </div>
    </header>
  );
}

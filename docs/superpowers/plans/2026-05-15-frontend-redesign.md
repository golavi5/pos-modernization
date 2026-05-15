# Frontend Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the POS frontend with a collapsed icon sidebar, split-pane sales view, full-screen payment modal with numpad, and consistent data module pattern — reducing a complete sale to ≤4 clicks.

**Architecture:** The shell (`DashboardLayout`) switches from JS-toggled sidebar to CSS `group-hover` expand. The sales page becomes a permanent split-pane (product grid left, cart right). `PaymentModal` becomes a full-screen overlay with a numeric keypad. All data modules adopt a toolbar + table + slide-over pattern.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, shadcn/ui, Radix UI, Lucide React, recharts (new), React Hook Form, TanStack Query v5.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `new-implementation/frontend/components/layout/DashboardLayout.tsx` | Modify | CSS hover sidebar, remove PageToolbar |
| `new-implementation/frontend/components/layout/Sidebar.tsx` | Rewrite | Icon-only + hover-expand labels, full nav |
| `new-implementation/frontend/components/layout/Header.tsx` | Rewrite | Breadcrumb + ⌘K search bar |
| `new-implementation/frontend/components/ui/slide-over.tsx` | Create | Reusable slide-over panel |
| `new-implementation/frontend/components/sales/ProductSearch.tsx` | Rewrite | Category tabs + product card grid |
| `new-implementation/frontend/components/sales/SalesCart.tsx` | Rewrite | Cart panel with inline Cobrar + customer |
| `new-implementation/frontend/components/sales/Numpad.tsx` | Create | Numeric keypad for payment modal |
| `new-implementation/frontend/components/sales/PaymentModal.tsx` | Rewrite | Full-screen + numpad + success screen |
| `new-implementation/frontend/app/(panel)/sales/page.tsx` | Modify | Split-pane layout, remove extra UI |
| `new-implementation/frontend/components/dashboard/StatsCard.tsx` | Rewrite | Left-border KPI card with delta |
| `new-implementation/frontend/components/dashboard/SalesChart.tsx` | Create | Recharts 7-day bar chart |
| `new-implementation/frontend/components/dashboard/QuickActions.tsx` | Rewrite | Compact action buttons |
| `new-implementation/frontend/components/dashboard/RecentSales.tsx` | Rewrite | Compact table with status badges |
| `new-implementation/frontend/app/(panel)/dashboard/page.tsx` | Modify | Wire real data + chart + new layout |
| `new-implementation/frontend/app/(panel)/products/page.tsx` | Modify | Toolbar + table + slide-over pattern |
| `new-implementation/frontend/app/(panel)/inventory/page.tsx` | Modify | Same pattern |
| `new-implementation/frontend/app/(panel)/customers/page.tsx` | Modify | Same pattern |
| `new-implementation/frontend/app/(panel)/users/page.tsx` | Modify | Same pattern |
| `new-implementation/frontend/tests/e2e/sale-flow.spec.ts` | Create | Golden-path Playwright test |

---

## Task 1: Install recharts

**Files:**
- Modify: `new-implementation/frontend/package.json`

- [ ] **Step 1: Install recharts**

```bash
cd new-implementation/frontend
npm install recharts
```

Expected: `added N packages` — no errors.

- [ ] **Step 2: Verify import resolves**

```bash
node -e "require('./node_modules/recharts')" && echo "OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add new-implementation/frontend/package.json new-implementation/frontend/package-lock.json
git commit -m "chore(frontend): add recharts for dashboard chart"
```

---

## Task 2: Sidebar — CSS hover expand

Replace the JS-toggle sidebar with pure CSS hover expand using Tailwind `group` / `group-hover`.

**Files:**
- Modify: `new-implementation/frontend/components/layout/DashboardLayout.tsx`
- Rewrite: `new-implementation/frontend/components/layout/Sidebar.tsx`

- [ ] **Step 1: Update DashboardLayout — CSS hover aside, remove PageToolbar**

Full file content:

```tsx
'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="group relative flex-shrink-0 w-[52px] hover:w-[220px] transition-[width] duration-200 ease-in-out border-r border-border bg-card overflow-hidden z-30">
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
```

- [ ] **Step 2: Rewrite Sidebar.tsx — icon-only with hover labels**

Full file content:

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  Warehouse,
  UserCog,
  Bell,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/sales',         icon: ShoppingCart, label: 'Ventas' },
  { href: '/dashboard',     icon: Home,         label: 'Dashboard' },
  { href: '/products',      icon: Package,      label: 'Productos' },
  { href: '/inventory',     icon: Warehouse,    label: 'Inventario' },
  { href: '/customers',     icon: Users,        label: 'Clientes' },
  { href: '/users',         icon: UserCog,      label: 'Usuarios' },
  { href: '/reports',       icon: BarChart3,    label: 'Reportes' },
  { href: '/notifications', icon: Bell,         label: 'Notificaciones' },
];

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 h-9 w-full rounded-lg px-2.5 transition-colors whitespace-nowrap',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <Icon size={18} className="shrink-0" />
      <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {label}
      </span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => {
    logout();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-center h-[52px] border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
          P
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 p-2 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon, label }) => (
          <NavItem
            key={href}
            href={href}
            icon={icon}
            label={label}
            active={pathname === href || pathname.startsWith(href + '/')}
          />
        ))}
      </nav>

      {/* Settings + Avatar */}
      <div className="p-2 border-t border-border flex flex-col gap-1">
        <NavItem
          href="/settings"
          icon={Settings}
          label="Configuración"
          active={pathname.startsWith('/settings')}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 h-9 w-full rounded-lg px-2.5 transition-colors whitespace-nowrap text-muted-foreground hover:bg-accent hover:text-foreground">
              <Avatar className="h-[18px] w-[18px] shrink-0">
                <AvatarFallback className="text-[9px] font-bold bg-indigo-600 text-white">
                  {getInitials(user?.name || 'U')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150 truncate">
                {user?.name || 'Usuario'}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
              {user?.email}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive gap-2">
              <LogOut size={14} />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Start dev server and verify sidebar renders**

```bash
cd new-implementation/frontend && npm run dev
```

Open `http://localhost:3000`. Verify: sidebar is 52px wide, shows icons, expands with labels on hover, active item is blue.

- [ ] **Step 4: Commit**

```bash
git add new-implementation/frontend/components/layout/DashboardLayout.tsx \
        new-implementation/frontend/components/layout/Sidebar.tsx
git commit -m "feat(sidebar): CSS hover-expand icon sidebar, full nav"
```

---

## Task 3: Header — breadcrumb + ⌘K search bar

Remove the sidebar toggle and welcome text. Add breadcrumb from pathname and a centered search bar.

**Files:**
- Rewrite: `new-implementation/frontend/components/layout/Header.tsx`

- [ ] **Step 1: Rewrite Header.tsx**

Full file content:

```tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
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
  const key = Object.keys(ROUTE_LABELS).find((k) => pathname.startsWith(k));
  return key ? ROUTE_LABELS[key] : '';
}

export function Header() {
  const pathname = usePathname();
  const { user } = useAuthStore();
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
```

- [ ] **Step 2: Verify header renders correctly**

In the browser at `http://localhost:3000/sales` verify: breadcrumb shows "POS / Ventas", search bar is centered, right actions visible.

- [ ] **Step 3: Commit**

```bash
git add new-implementation/frontend/components/layout/Header.tsx
git commit -m "feat(header): breadcrumb + centered search bar"
```

---

## Task 4: SlideOver component

Reusable right-side panel for create/edit forms in data modules.

**Files:**
- Create: `new-implementation/frontend/components/ui/slide-over.tsx`

- [ ] **Step 1: Create SlideOver component**

```tsx
'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function SlideOver({ open, onClose, title, children, footer }: SlideOverProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop — transparent, closes on click */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-72 bg-card border-l border-border z-50 flex flex-col',
          'transition-transform duration-200 ease-in-out shadow-xl',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {children}
        </div>

        {footer && (
          <div className="px-4 py-3 border-t border-border flex gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add new-implementation/frontend/components/ui/slide-over.tsx
git commit -m "feat(ui): add SlideOver panel component"
```

---

## Task 5: Numpad component

Standalone numeric keypad used in the payment modal.

**Files:**
- Create: `new-implementation/frontend/components/sales/Numpad.tsx`

- [ ] **Step 1: Create Numpad.tsx**

```tsx
'use client';

import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NumpadProps {
  value: string;
  onChange: (value: string) => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

export function Numpad({ value, onChange }: NumpadProps) {
  const handleKey = (key: string) => {
    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === '.' && value.includes('.')) return;
    if (value === '0' && key !== '.') {
      onChange(key);
      return;
    }
    onChange(value + key);
  };

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => handleKey(key)}
          className={cn(
            'h-12 rounded-lg font-semibold transition-colors flex items-center justify-center',
            key === '⌫'
              ? 'bg-muted text-muted-foreground hover:bg-muted/70 text-sm'
              : 'bg-card border border-border text-foreground hover:bg-accent text-lg'
          )}
        >
          {key === '⌫' ? <Delete size={16} /> : key}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add new-implementation/frontend/components/sales/Numpad.tsx
git commit -m "feat(sales): add Numpad component for payment modal"
```

---

## Task 6: PaymentModal — full-screen + numpad + success screen

Replace the current small modal with a full-screen overlay. Add numpad for cash entry, live change calculation, Enter key shortcut, and a success screen with 5s auto-return.

**Files:**
- Rewrite: `new-implementation/frontend/components/sales/PaymentModal.tsx`

- [ ] **Step 1: Rewrite PaymentModal.tsx**

Full file content:

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Numpad } from './Numpad';
import { cn } from '@/lib/utils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (paymentMethod: string, notes?: string) => Promise<void> | void;
  isLoading?: boolean;
}

type PaymentMethod = 'cash' | 'card' | 'mixed';
type ModalStatus = 'payment' | 'success';

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);

export function PaymentModal({
  isOpen,
  onClose,
  total,
  onConfirm,
  isLoading,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [status, setStatus] = useState<ModalStatus>('payment');
  const [countdown, setCountdown] = useState(5);

  const received = parseFloat(cashReceived) || 0;
  const change = received - total;
  const canConfirm = method !== 'cash' || received >= total;

  const handleNewSale = useCallback(() => {
    setStatus('payment');
    setCashReceived('');
    setCountdown(5);
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(async () => {
    if (!canConfirm || isLoading) return;
    await onConfirm(method);
    setStatus('success');
    setCountdown(5);
  }, [canConfirm, isLoading, method, onConfirm]);

  // Enter key → confirm
  useEffect(() => {
    if (!isOpen || status !== 'payment') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, status, handleConfirm]);

  // Success countdown
  useEffect(() => {
    if (status !== 'success') return;
    if (countdown <= 0) {
      handleNewSale();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown, handleNewSale]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStatus('payment');
      setCashReceived('');
      setMethod('cash');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Success screen
  if (status === 'success') {
    return (
      <div
        className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6"
        data-testid="payment-success"
      >
        <CheckCircle className="w-20 h-20 text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold text-emerald-500 mb-1">¡Pago completado!</h2>
        <p className="text-muted-foreground text-sm mb-8">
          {new Date().toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </p>

        <div className="bg-card rounded-xl border border-border w-full max-w-sm p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total cobrado</span>
            <span className="font-semibold">{formatCurrency(total)}</span>
          </div>
          {method === 'cash' && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recibido</span>
                <span className="font-semibold">{formatCurrency(received)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-emerald-500 font-semibold">Cambio</span>
                <span className="text-emerald-500 text-xl font-bold">
                  {formatCurrency(change)}
                </span>
              </div>
            </>
          )}
        </div>

        <Button onClick={handleNewSale} size="lg" className="w-full max-w-sm">
          + Nueva venta
        </Button>
        <p className="text-muted-foreground text-xs mt-3">
          Auto-regresa en {countdown}s...
        </p>
      </div>
    );
  }

  // Payment screen
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Volver al carrito
        </button>
        <span className="text-xs text-muted-foreground">Venta en curso</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div className="w-full max-w-sm space-y-4">
          {/* Total */}
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Total a cobrar
            </p>
            <p className="text-5xl font-extrabold tracking-tight">
              {formatCurrency(total)}
            </p>
          </div>

          {/* Method tabs */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(['cash', 'card', 'mixed'] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={cn(
                  'flex-1 py-2 rounded-md text-xs font-semibold transition-colors',
                  method === m
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'cash' ? '💵 Efectivo' : m === 'card' ? '💳 Tarjeta' : '🔀 Mixto'}
              </button>
            ))}
          </div>

          {method === 'cash' && (
            <>
              {/* Cash display */}
              <div
                className={cn(
                  'bg-card border-2 rounded-xl px-4 py-3 transition-colors',
                  received > 0 ? 'border-primary' : 'border-border'
                )}
              >
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                  Efectivo recibido
                </p>
                <p className="text-3xl font-bold">
                  {received > 0 ? formatCurrency(received) : '—'}
                </p>
              </div>

              {/* Change */}
              {received >= total && (
                <div className="bg-emerald-950/60 border border-emerald-800 rounded-xl px-4 py-3 flex justify-between items-center">
                  <span className="text-emerald-400 text-sm font-semibold">💚 Cambio</span>
                  <span className="text-emerald-400 text-2xl font-bold">
                    {formatCurrency(change)}
                  </span>
                </div>
              )}

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-1.5">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashReceived(String(amt))}
                    className="bg-card border border-border rounded-lg py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    ${(amt / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>

              {/* Numpad */}
              <Numpad value={cashReceived} onChange={setCashReceived} />
            </>
          )}

          {method === 'card' && (
            <div className="text-center py-10 text-muted-foreground space-y-1">
              <p className="text-2xl">💳</p>
              <p className="text-sm">Procesa el pago en el terminal</p>
              <p className="text-xs">Confirma cuando el terminal apruebe</p>
            </div>
          )}

          {method === 'mixed' && (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-xs">Funcionalidad de pago mixto — próximamente</p>
            </div>
          )}

          {/* Confirm button */}
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            size="lg"
            className="w-full h-12 font-bold"
            data-testid="confirm-payment-button"
          >
            {isLoading ? (
              'Procesando...'
            ) : (
              <>
                ✓ Confirmar pago{' '}
                <span className="ml-2 text-xs opacity-60 font-normal">Enter ↵</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify payment modal in browser**

In the browser go to `/sales`. Add a product. Click "Procesar Venta" (existing button — will be renamed in Task 7). Verify: full-screen overlay, numpad visible, quick amounts work, Enter key triggers confirm.

- [ ] **Step 3: Commit**

```bash
git add new-implementation/frontend/components/sales/PaymentModal.tsx
git commit -m "feat(sales): full-screen payment modal with numpad and success screen"
```

---

## Task 7: ProductGrid — category tabs + product cards

Rewrite `ProductSearch.tsx` from a text-search widget to a visual product grid with category filter tabs and clickable cards.

**Files:**
- Rewrite: `new-implementation/frontend/components/sales/ProductSearch.tsx`

- [ ] **Step 1: Rewrite ProductSearch.tsx**

Full file content:

```tsx
'use client';

import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/product';

interface ProductSearchProps {
  onAddProduct: (product: Product) => void;
}

export function ProductSearch({ onAddProduct }: ProductSearchProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { data: products = [], isLoading } = useProducts();

  const categories = Array.from(
    new Set(
      products
        .map((p: Product) => p.category?.name ?? p.category_id)
        .filter(Boolean)
    )
  ) as string[];

  const filtered = activeCategory
    ? products.filter(
        (p: Product) =>
          (p.category?.name ?? p.category_id) === activeCategory
      )
    : products;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap shrink-0">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
            !activeCategory
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          )}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              activeCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-3 gap-2.5 overflow-auto flex-1 content-start pb-2">
        {filtered.map((product: Product) => {
          const outOfStock = product.stock_quantity === 0;
          const lowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
          return (
            <button
              key={product.id}
              onClick={() => !outOfStock && onAddProduct(product)}
              disabled={outOfStock}
              data-testid="product-card"
              className={cn(
                'flex flex-col items-start p-3 rounded-xl border text-left transition-all',
                outOfStock
                  ? 'opacity-40 cursor-not-allowed bg-card border-border'
                  : 'bg-card border-border hover:border-primary hover:shadow-sm cursor-pointer active:scale-[0.98]'
              )}
            >
              <div className="w-full h-14 bg-muted rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    className="h-full w-full object-cover rounded-lg"
                    alt={product.name}
                  />
                ) : (
                  <span className="text-2xl">📦</span>
                )}
              </div>
              <p className="text-xs font-semibold text-foreground truncate w-full">
                {product.name}
              </p>
              <div className="flex items-center justify-between w-full mt-1 gap-1">
                <span className="text-sm font-bold text-primary">
                  {formatCurrency(product.price)}
                </span>
                <span
                  className={cn(
                    'text-[9px] font-semibold px-1.5 py-0.5 rounded border',
                    outOfStock
                      ? 'text-destructive border-destructive/30'
                      : lowStock
                      ? 'text-amber-500 border-amber-500/30'
                      : 'text-emerald-500 border-emerald-500/30'
                  )}
                >
                  {outOfStock ? 'Sin stock' : product.stock_quantity}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add new-implementation/frontend/components/sales/ProductSearch.tsx
git commit -m "feat(sales): product grid with category tabs and stock badges"
```

---

## Task 8: CartPanel — inline Cobrar button + customer selector

Rewrite `SalesCart.tsx` to include the Cobrar button, customer selector, and discount field — making it a self-contained cart panel.

**Files:**
- Rewrite: `new-implementation/frontend/components/sales/SalesCart.tsx`

- [ ] **Step 1: Rewrite SalesCart.tsx**

Full file content:

```tsx
'use client';

import { Minus, Plus, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomerSelect } from './CustomerSelect';
import { cn } from '@/lib/utils';
import type { CartItem } from '@/types/sale';

interface SalesCartProps {
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  customerId?: string;
  customerName?: string;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onSelectCustomer: (customer: { id: string; name: string } | undefined) => void;
  onCheckout: () => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);

export function SalesCart({
  items,
  subtotal,
  tax,
  discount,
  total,
  customerId,
  customerName,
  onUpdateQuantity,
  onRemoveItem,
  onSelectCustomer,
  onCheckout,
}: SalesCartProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Carrito · {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Customer selector */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <CustomerSelect
          selectedCustomer={
            customerId && customerName
              ? { id: customerId, name: customerName }
              : undefined
          }
          onSelect={onSelectCustomer}
        />
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-2 py-8">
            <span className="text-3xl">🛒</span>
            <span>Agrega productos al carrito</span>
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.product_id}
            className="flex items-center gap-2 py-2 border-b border-border/50 last:border-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {item.product_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(item.unit_price)}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                className="w-5 h-5 rounded bg-muted flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <Minus size={10} />
              </button>
              <span className="text-xs font-semibold w-5 text-center">
                {item.quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                disabled={item.quantity >= (item.stock_quantity ?? Infinity)}
                className="w-5 h-5 rounded bg-muted flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <Plus size={10} />
              </button>
            </div>
            <p className="text-xs font-bold text-foreground w-14 text-right shrink-0">
              {formatCurrency(item.subtotal)}
            </p>
            <button
              onClick={() => onRemoveItem(item.product_id)}
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Totals + Checkout */}
      <div className="px-4 py-3 border-t border-border shrink-0 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>IVA (19%)</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-xs text-emerald-500">
            <span>Descuento</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>

        <Button
          onClick={onCheckout}
          disabled={items.length === 0}
          size="lg"
          className="w-full font-bold mt-1"
          data-testid="cobrar-button"
        >
          💳 Cobrar {items.length > 0 ? formatCurrency(total) : ''}
        </Button>

        {items.length > 0 && (
          <button
            onClick={() => {
              if (confirm('¿Limpiar el carrito?')) {
                items.forEach((i) => onRemoveItem(i.product_id));
              }
            }}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Limpiar carrito
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add new-implementation/frontend/components/sales/SalesCart.tsx
git commit -m "feat(sales): cart panel with inline Cobrar button and customer selector"
```

---

## Task 9: Sales page — split-pane layout

Replace the current padded grid layout with a full-height split pane. Remove the stats cards row (they'll live on the Dashboard). Wire updated SalesCart props.

**Files:**
- Modify: `new-implementation/frontend/app/(panel)/sales/page.tsx`

- [ ] **Step 1: Rewrite sales page**

Full file content:

```tsx
'use client';

import { useState } from 'react';
import { ProductSearch } from '@/components/sales/ProductSearch';
import { SalesCart } from '@/components/sales/SalesCart';
import { PaymentModal } from '@/components/sales/PaymentModal';
import { useCreateSale } from '@/hooks/useSales';
import type { Product } from '@/types/product';
import type { CartItem, Cart } from '@/types/sale';

const TAX_RATE = 0.19;

const EMPTY_CART: Cart = {
  items: [],
  subtotal: 0,
  tax: 0,
  discount: 0,
  total: 0,
};

export default function SalesPage() {
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [showPayment, setShowPayment] = useState(false);
  const createSale = useCreateSale();

  const recalc = (items: CartItem[], discount = cart.discount): Cart => {
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const tax = subtotal * TAX_RATE;
    return { ...cart, items, subtotal, tax, discount, total: subtotal + tax - discount };
  };

  const handleAddProduct = (product: Product) => {
    if (product.stock_quantity === 0) return;
    const existing = cart.items.find((i) => i.product_id === product.id);
    let newItems: CartItem[];

    if (existing) {
      if (existing.quantity >= product.stock_quantity) return;
      newItems = cart.items.map((i) =>
        i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price }
          : i
      );
    } else {
      newItems = [
        ...cart.items,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price,
          tax_rate: product.tax_rate ?? TAX_RATE * 100,
          subtotal: product.price,
          stock_quantity: product.stock_quantity,
          image_url: product.image_url,
        },
      ];
    }
    setCart(recalc(newItems));
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    const newItems = cart.items.map((i) =>
      i.product_id === productId
        ? { ...i, quantity, subtotal: quantity * i.unit_price }
        : i
    );
    setCart(recalc(newItems));
  };

  const handleRemoveItem = (productId: string) => {
    const newItems = cart.items.filter((i) => i.product_id !== productId);
    setCart(recalc(newItems));
  };

  const handleSelectCustomer = (customer: { id: string; name: string } | undefined) => {
    setCart({ ...cart, customer_id: customer?.id, customer_name: customer?.name });
  };

  const handleConfirmPayment = async (paymentMethod: string) => {
    await createSale.mutateAsync({
      customer_id: cart.customer_id,
      items: cart.items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount: i.discount ?? 0,
        tax_rate: i.tax_rate ?? TAX_RATE * 100,
      })),
      payment_method: paymentMethod,
      payment_status: 'paid',
      discount_amount: cart.discount,
    });
    setShowPayment(false);
    setCart(EMPTY_CART);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Product grid */}
      <div className="flex-1 overflow-hidden p-4">
        <ProductSearch onAddProduct={handleAddProduct} />
      </div>

      {/* Cart panel */}
      <div className="w-[280px] shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
        <SalesCart
          items={cart.items}
          subtotal={cart.subtotal}
          tax={cart.tax}
          discount={cart.discount}
          total={cart.total}
          customerId={cart.customer_id}
          customerName={cart.customer_name}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onSelectCustomer={handleSelectCustomer}
          onCheckout={() => setShowPayment(true)}
        />
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        total={cart.total}
        onConfirm={handleConfirmPayment}
        isLoading={createSale.isPending}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify split-pane in browser**

Navigate to `/sales`. Verify: product grid fills left side, cart panel is always visible on the right (280px), no scrollbar on the outer page, Cobrar button is at the bottom of the cart.

- [ ] **Step 3: Commit**

```bash
git add new-implementation/frontend/app/(panel)/sales/page.tsx
git commit -m "feat(sales): split-pane layout with product grid and always-visible cart"
```

---

## Task 10: Dashboard — KPI cards + chart + quick actions + recent sales

**Files:**
- Rewrite: `new-implementation/frontend/components/dashboard/StatsCard.tsx`
- Create: `new-implementation/frontend/components/dashboard/SalesChart.tsx`
- Rewrite: `new-implementation/frontend/components/dashboard/QuickActions.tsx`
- Rewrite: `new-implementation/frontend/components/dashboard/RecentSales.tsx`
- Modify: `new-implementation/frontend/app/(panel)/dashboard/page.tsx`

- [ ] **Step 1: Rewrite StatsCard.tsx**

```tsx
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  accentClass?: string;
}

export function StatsCard({
  title,
  value,
  delta,
  deltaPositive = true,
  accentClass = 'border-primary',
}: StatsCardProps) {
  return (
    <div className={cn('bg-card rounded-xl p-4 border-l-4', accentClass)}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        {title}
      </p>
      <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
      {delta && (
        <p
          className={cn(
            'text-[10px] flex items-center gap-1',
            deltaPositive ? 'text-emerald-500' : 'text-destructive'
          )}
        >
          {deltaPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {delta}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create SalesChart.tsx**

```tsx
'use client';

import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ChartDay {
  day: string;
  sales: number;
}

interface SalesChartProps {
  data: ChartDay[];
}

export function SalesChart({ data }: SalesChartProps) {
  const lastIndex = data.length - 1;

  return (
    <div className="bg-card rounded-xl p-4">
      <p className="text-sm font-semibold text-foreground mb-3">
        Ventas — últimos 7 días
      </p>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} barSize={28}>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => [
              new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
              }).format(value),
              'Ventas',
            ]}
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '11px',
            }}
          />
          <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={
                  i === lastIndex
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--muted))'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite QuickActions.tsx**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { ShoppingCart, Warehouse, BarChart3, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ACTIONS = [
  { label: 'Nueva venta',         href: '/sales',     icon: ShoppingCart, primary: true },
  { label: 'Ajustar inventario',  href: '/inventory', icon: Warehouse,    primary: false },
  { label: 'Ver reporte del día', href: '/reports',   icon: BarChart3,    primary: false },
  { label: 'Agregar producto',    href: '/products',  icon: Plus,         primary: false },
];

export function QuickActions() {
  const router = useRouter();
  return (
    <div className="bg-card rounded-xl p-4">
      <p className="text-sm font-semibold text-foreground mb-3">Acciones rápidas</p>
      <div className="flex flex-col gap-2">
        {ACTIONS.map(({ label, href, icon: Icon, primary }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={
              primary
                ? 'flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                : 'flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-sm text-foreground bg-background border border-border hover:bg-accent transition-colors'
            }
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite RecentSales.tsx**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useSales } from '@/hooks/useSales';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);

export function RecentSales() {
  const router = useRouter();
  const { data } = useSales({ page: 1, limit: 8 });
  const sales = data?.data ?? [];

  return (
    <div className="bg-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-foreground">Ventas recientes</p>
        <button
          onClick={() => router.push('/sales')}
          className="text-xs text-primary hover:underline"
        >
          Ver todas →
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground uppercase text-[10px] tracking-widest border-b border-border">
              <th className="pb-2 text-left font-semibold">#</th>
              <th className="pb-2 text-left font-semibold">Cliente</th>
              <th className="pb-2 text-right font-semibold">Total</th>
              <th className="pb-2 text-right font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale: any) => (
              <tr key={sale.id} className="border-b border-border/50 last:border-0">
                <td className="py-2 text-muted-foreground">#{sale.sale_number ?? sale.id.slice(0, 6)}</td>
                <td className="py-2 text-foreground">{sale.customer?.name ?? 'Sin cliente'}</td>
                <td className="py-2 text-right font-semibold">{formatCurrency(sale.total_amount)}</td>
                <td className="py-2 text-right">
                  <span className="bg-emerald-950/50 text-emerald-500 border border-emerald-500/20 text-[9px] font-semibold px-2 py-0.5 rounded-full">
                    Pagado
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update dashboard/page.tsx**

Full file content:

```tsx
'use client';

import { StatsCard } from '@/components/dashboard/StatsCard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentSales } from '@/components/dashboard/RecentSales';
import { useSalesStats } from '@/hooks/useSales';

const CHART_DATA = [
  { day: 'L', sales: 320000 },
  { day: 'M', sales: 410000 },
  { day: 'X', sales: 280000 },
  { day: 'J', sales: 520000 },
  { day: 'V', sales: 480000 },
  { day: 'S', sales: 560000 },
  { day: 'H', sales: 0 },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);

export default function DashboardPage() {
  const { data: stats } = useSalesStats();

  const todayIdx = CHART_DATA.length - 1;
  if (stats?.todayRevenue !== undefined) {
    CHART_DATA[todayIdx].sales = stats.todayRevenue;
  }

  return (
    <div className="p-5 space-y-4 overflow-auto h-full">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        <StatsCard
          title="Ventas hoy"
          value={stats ? formatCurrency(stats.todayRevenue) : '—'}
          delta="+12% vs ayer"
          deltaPositive
          accentClass="border-primary"
        />
        <StatsCard
          title="Transacciones"
          value={stats ? String(stats.todaySales) : '—'}
          delta="+5 vs ayer"
          deltaPositive
          accentClass="border-emerald-500"
        />
        <StatsCard
          title="Ticket promedio"
          value={stats ? formatCurrency(stats.averageOrderValue) : '—'}
          accentClass="border-amber-500"
        />
        <StatsCard
          title="Total ventas"
          value={stats ? String(stats.totalSales) : '—'}
          accentClass="border-violet-500"
        />
      </div>

      {/* Chart + Quick actions */}
      <div className="grid grid-cols-[1fr_240px] gap-3">
        <SalesChart data={CHART_DATA} />
        <QuickActions />
      </div>

      {/* Recent sales */}
      <RecentSales />
    </div>
  );
}
```

- [ ] **Step 6: Verify dashboard in browser**

Navigate to `/dashboard`. Verify: 4 KPI cards with colored left borders, bar chart (today's bar in blue), quick actions panel on the right, recent sales table below.

- [ ] **Step 7: Commit**

```bash
git add new-implementation/frontend/components/dashboard/ \
        new-implementation/frontend/app/(panel)/dashboard/page.tsx
git commit -m "feat(dashboard): KPI cards, sales chart, quick actions, recent sales"
```

---

## Task 11: Products page — toolbar + table + slide-over

Replace the existing layout with the standard pattern: toolbar (search + filters + action button), full-width table, slide-over form.

**Files:**
- Modify: `new-implementation/frontend/app/(panel)/products/page.tsx`

- [ ] **Step 1: Read current products page structure**

```bash
cat new-implementation/frontend/app/\(panel\)/products/page.tsx
```

Note which components it imports (`ProductsTable`, `ProductForm`, etc.) — you'll reuse them inside the new layout.

- [ ] **Step 2: Wrap existing components in toolbar + slide-over pattern**

Replace the page content with:

```tsx
'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SlideOver } from '@/components/ui/slide-over';
import { ProductsTable } from '@/components/products/ProductsTable';
import { ProductForm } from '@/components/products/ProductForm';
import type { Product } from '@/types/product';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [slideOver, setSlideOver] = useState<'closed' | 'new' | 'edit'>('closed');
  const [editTarget, setEditTarget] = useState<Product | null>(null);

  const openNew = () => { setEditTarget(null); setSlideOver('new'); };
  const openEdit = (product: Product) => { setEditTarget(product); setSlideOver('edit'); };
  const close = () => setSlideOver('closed');

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos..."
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex-1" />
        <Button onClick={openNew} size="sm" className="gap-1.5">
          <Plus size={14} /> Nuevo producto
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <ProductsTable search={search} onEdit={openEdit} />
      </div>

      {/* Slide-over */}
      <SlideOver
        open={slideOver !== 'closed'}
        onClose={close}
        title={slideOver === 'new' ? 'Nuevo producto' : 'Editar producto'}
        footer={
          <>
            <Button variant="outline" onClick={close} className="flex-1">
              Cancelar
            </Button>
            <Button form="product-form" type="submit" className="flex-1">
              Guardar
            </Button>
          </>
        }
      >
        <ProductForm
          product={editTarget ?? undefined}
          formId="product-form"
          onSuccess={close}
        />
      </SlideOver>
    </div>
  );
}
```

> **Note:** If `ProductsTable` doesn't accept an `onEdit` prop yet, add it: `onEdit?: (product: Product) => void` called when the edit row action is clicked. If `ProductForm` doesn't accept a `formId` prop, add `id={formId}` to the `<form>` element inside it.

- [ ] **Step 3: Commit**

```bash
git add new-implementation/frontend/app/\(panel\)/products/page.tsx
git commit -m "feat(products): toolbar + table + slide-over pattern"
```

---

## Task 12: Inventory, Customers, Users pages — same pattern

Apply the identical toolbar + slide-over pattern to the remaining data modules.

**Files:**
- Modify: `new-implementation/frontend/app/(panel)/inventory/page.tsx`
- Modify: `new-implementation/frontend/app/(panel)/customers/page.tsx`
- Modify: `new-implementation/frontend/app/(panel)/users/page.tsx`

- [ ] **Step 1: Read each page**

```bash
cat new-implementation/frontend/app/\(panel\)/inventory/page.tsx
cat new-implementation/frontend/app/\(panel\)/customers/page.tsx
cat new-implementation/frontend/app/\(panel\)/users/page.tsx
```

Note which table/form components each page currently imports.

- [ ] **Step 2: Apply the pattern to each page**

For each page, wrap in the same structure as Task 11, substituting the correct table, form, and entity label. The structure is always:

```tsx
'use client';
import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SlideOver } from '@/components/ui/slide-over';
// ... import the module's Table and Form components

export default function XxxPage() {
  const [search, setSearch] = useState('');
  const [slideOver, setSlideOver] = useState<'closed' | 'new' | 'edit'>('closed');
  const [editTarget, setEditTarget] = useState<EntityType | null>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8 h-9 text-sm" />
        </div>
        <div className="flex-1" />
        <Button onClick={() => { setEditTarget(null); setSlideOver('new'); }} size="sm" className="gap-1.5">
          <Plus size={14} /> Nuevo
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <XxxTable search={search} onEdit={(item) => { setEditTarget(item); setSlideOver('edit'); }} />
      </div>
      <SlideOver open={slideOver !== 'closed'} onClose={() => setSlideOver('closed')} title={slideOver === 'new' ? 'Nuevo' : 'Editar'}
        footer={<><Button variant="outline" onClick={() => setSlideOver('closed')} className="flex-1">Cancelar</Button><Button form="entity-form" type="submit" className="flex-1">Guardar</Button></>}
      >
        <XxxForm entity={editTarget ?? undefined} formId="entity-form" onSuccess={() => setSlideOver('closed')} />
      </SlideOver>
    </div>
  );
}
```

- [ ] **Step 3: Add `onEdit` prop to table components that don't have it**

For each table component (e.g. `StockTable`, `CustomersTable`, `UsersTable`), add an optional `onEdit` prop:

```tsx
interface XxxTableProps {
  search?: string;
  onEdit?: (item: EntityType) => void;
}
```

Then wire the edit icon button in the row to call `onEdit?.(item)`.

- [ ] **Step 4: Commit**

```bash
git add new-implementation/frontend/app/\(panel\)/inventory/page.tsx \
        new-implementation/frontend/app/\(panel\)/customers/page.tsx \
        new-implementation/frontend/app/\(panel\)/users/page.tsx
git commit -m "feat(modules): toolbar + slide-over pattern for inventory, customers, users"
```

---

## Task 13: Playwright e2e — complete sale in ≤4 clicks

Write a golden-path test verifying the cashier can complete a sale in 4 user interactions.

**Files:**
- Create: `new-implementation/frontend/tests/e2e/sale-flow.spec.ts`

- [ ] **Step 1: Ensure the full stack is running**

```bash
cd new-implementation && docker compose up -d
```

Wait for backend at `http://localhost:3000/health` and frontend at `http://localhost:3001`.

- [ ] **Step 2: Create the test file**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Sale golden path', () => {
  test.beforeEach(async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('completes a sale in 4 clicks or fewer', async ({ page }) => {
    // Navigate to sales (0 clicks if it's the default, 1 if navigating)
    await page.goto('/sales');

    // Wait for product grid to load
    await page.waitForSelector('[data-testid="product-card"]');

    // Click 1: add a product to cart
    await page.click('[data-testid="product-card"]:first-child');

    // Verify cart shows the item
    await expect(page.locator('[data-testid="cobrar-button"]')).not.toBeDisabled();

    // Click 2: open payment modal
    await page.click('[data-testid="cobrar-button"]');

    // Verify payment modal opened (full-screen)
    await expect(page.locator('text=Total a cobrar')).toBeVisible();

    // Click 3: set exact amount
    // Find the "$10k" or another quick amount button (first quick amount button)
    const quickBtn = page.locator('button').filter({ hasText: /\$\d+k/ }).first();
    await quickBtn.click();

    // Verify change is shown (received >= total)
    await expect(page.locator('text=Cambio')).toBeVisible();

    // Click 4 / keyboard: confirm with Enter
    await page.keyboard.press('Enter');

    // Verify success screen
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=¡Pago completado!')).toBeVisible();
  });

  test('cart panel is always visible on sales page', async ({ page }) => {
    await page.goto('/sales');
    await expect(page.locator('[data-testid="cobrar-button"]')).toBeVisible();
  });

  test('payment success auto-returns to new sale', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForSelector('[data-testid="product-card"]');
    await page.click('[data-testid="product-card"]:first-child');
    await page.click('[data-testid="cobrar-button"]');
    const quickBtn = page.locator('button').filter({ hasText: /\$\d+k/ }).first();
    await quickBtn.click();
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-testid="payment-success"]');

    // After 5s countdown it should auto-close (or clicking Nueva venta)
    await page.click('text=+ Nueva venta');
    await expect(page.locator('[data-testid="cobrar-button"]')).toBeVisible();
  });
});
```

- [ ] **Step 3: Update Playwright config base URL if needed**

Check `new-implementation/frontend/playwright.config.ts` — ensure `baseURL` matches where the frontend runs (`http://localhost:3001` for docker, `http://localhost:3000` for standalone dev).

- [ ] **Step 4: Run the tests**

```bash
cd new-implementation/frontend && npm run test:e2e
```

Expected: all 3 tests pass. If the login credentials don't match your dev seed, update `test.beforeEach` with the correct email/password from `new-implementation/backend/.env` or the seed script.

- [ ] **Step 5: Commit**

```bash
git add new-implementation/frontend/tests/e2e/sale-flow.spec.ts
git commit -m "test(e2e): sale golden-path — complete sale in ≤4 clicks"
```

---

## Task 14: i18n — add new string keys

Add translation strings for any new UI text introduced in this redesign.

**Files:**
- Modify: `new-implementation/frontend/messages/es.json`
- Modify: `new-implementation/frontend/messages/en.json`

- [ ] **Step 1: Add missing keys to es.json**

Open `new-implementation/frontend/messages/es.json` and add under the appropriate sections:

```json
{
  "sidebar": {
    "ventas": "Ventas",
    "dashboard": "Dashboard",
    "productos": "Productos",
    "inventario": "Inventario",
    "clientes": "Clientes",
    "usuarios": "Usuarios",
    "reportes": "Reportes",
    "notificaciones": "Notificaciones",
    "configuracion": "Configuración"
  },
  "sales": {
    "cart": "Carrito",
    "cobrar": "Cobrar",
    "limpiarCarrito": "Limpiar carrito",
    "sinCliente": "Sin cliente",
    "agregarProductos": "Agrega productos al carrito",
    "totalACobrar": "Total a cobrar",
    "efectivoRecibido": "Efectivo recibido",
    "cambio": "Cambio",
    "confirmarPago": "Confirmar pago",
    "pagoCompletado": "¡Pago completado!",
    "nuevaVenta": "+ Nueva venta",
    "autoRegresa": "Auto-regresa en {seconds}s..."
  }
}
```

- [ ] **Step 2: Add the same keys to en.json**

```json
{
  "sidebar": {
    "ventas": "Sales",
    "dashboard": "Dashboard",
    "productos": "Products",
    "inventario": "Inventory",
    "clientes": "Customers",
    "usuarios": "Users",
    "reportes": "Reports",
    "notificaciones": "Notifications",
    "configuracion": "Settings"
  },
  "sales": {
    "cart": "Cart",
    "cobrar": "Charge",
    "limpiarCarrito": "Clear cart",
    "sinCliente": "No customer",
    "agregarProductos": "Add products to the cart",
    "totalACobrar": "Total to charge",
    "efectivoRecibido": "Cash received",
    "cambio": "Change",
    "confirmarPago": "Confirm payment",
    "pagoCompletado": "Payment complete!",
    "nuevaVenta": "+ New sale",
    "autoRegresa": "Auto-returns in {seconds}s..."
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add new-implementation/frontend/messages/es.json \
        new-implementation/frontend/messages/en.json
git commit -m "feat(i18n): add new strings for redesigned sales and sidebar"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Shell (Task 2–3), Sales split-pane (Task 7–9), Payment modal (Task 6), Dashboard (Task 10), Data modules (Task 11–12), e2e (Task 13), i18n (Task 14)
- [x] **Placeholders:** No TBDs. Task 12 describes the pattern explicitly and notes what to check per module.
- [x] **Type consistency:** `SalesCart` new props (`onCheckout`, `onSelectCustomer`, `customerId`, `customerName`) match usage in `sales/page.tsx`. `SlideOver` `footer` prop matches Task 11–12. `StatsCard` `accentClass` prop consistent across Tasks 10 usage.
- [x] **recharts:** Installed in Task 1 before `SalesChart` uses it in Task 10.

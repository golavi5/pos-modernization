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
  type LucideIcon,
} from 'lucide-react';
import type { CommandRoute } from '@/types/command';

/**
 * Single source of truth for the app's primary navigation routes.
 *
 * `Sidebar.tsx` and the ⌘K command palette (`lib/navigation/command-items.ts`)
 * both derive their route list from this array instead of hand-copying
 * hrefs, so adding/removing/reordering a route here updates both surfaces —
 * they cannot silently drift out of sync.
 *
 * `labelKey` indexes the `sidebar` i18n namespace, which both consumers
 * translate through, so the sidebar and the palette always show the same
 * name for the same route.
 */
export interface NavItem extends CommandRoute {
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/sales', icon: ShoppingCart, labelKey: 'sales' },
  { href: '/dashboard', icon: Home, labelKey: 'dashboard' },
  { href: '/products', icon: Package, labelKey: 'products' },
  { href: '/inventory', icon: Warehouse, labelKey: 'inventory' },
  { href: '/customers', icon: Users, labelKey: 'customers' },
  { href: '/users', icon: UserCog, labelKey: 'users' },
  { href: '/reports', icon: BarChart3, labelKey: 'reports' },
  { href: '/notifications', icon: Bell, labelKey: 'notifications' },
];

/**
 * `/settings` is rendered separately in the sidebar footer (not in the main
 * nav list) but is still a real palette destination, so it's kept alongside
 * `NAV_ITEMS` rather than folded into it.
 */
export const SETTINGS_NAV_ITEM: NavItem = {
  href: '/settings',
  icon: Settings,
  labelKey: 'settings',
};

/**
 * Longest-prefix match from a pathname to its `sidebar` i18n key, so the header
 * breadcrumb names a route exactly as the sidebar and palette do.
 *
 * Matches the route itself or a path below it (`/products/123/edit` →
 * `products`) but never a sibling that merely shares a prefix
 * (`/salesperson` ↛ `/sales`). Returns `undefined` for unknown routes; the
 * breadcrumb then renders `POS` alone, as it does today.
 */
export function findNavLabelKey(pathname: string): string | undefined {
  const all = [...NAV_ITEMS, SETTINGS_NAV_ITEM];
  const match = all
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.labelKey;
}

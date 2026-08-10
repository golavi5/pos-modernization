import { canAccessRoute } from '@/lib/auth/roles';
import { NAV_ITEMS, SETTINGS_NAV_ITEM } from '@/lib/navigation/nav-items';
import type { CommandItem, CommandRoute } from '@/types/command';
import type { Translate } from '@/types/i18n';

/**
 * Routes the palette can jump to: `NAV_ITEMS` — the same array `Sidebar.tsx`
 * renders its nav from — plus `/settings`, which the sidebar renders
 * separately in its footer. Derived, not hand-copied: add/remove/reorder a
 * route in `lib/navigation/nav-items.ts` and both the sidebar and the
 * palette pick it up, so they cannot drift out of sync.
 *
 * `labelKey` indexes the `sidebar` i18n namespace so the palette and the
 * sidebar cannot drift into different names for the same page.
 */
export const COMMAND_ROUTES: readonly CommandRoute[] = [...NAV_ITEMS, SETTINGS_NAV_ITEM];

/**
 * Translate the route table and drop anything this user may not open.
 *
 * The RBAC filter is the same `canAccessRoute` the sidebar uses: the palette
 * must not surface a page the sidebar hides, or it becomes a way around the
 * UI's own role gating. (UX-level only — the backend `RolesGuard` is the real
 * boundary, see `lib/auth/roles.ts`.)
 */
export function buildCommandItems(
  t: Translate<'sidebar'>,
  userRoles: string[] | undefined,
): CommandItem[] {
  return COMMAND_ROUTES.filter((r) => canAccessRoute(r.href, userRoles)).map((r) => ({
    href: r.href,
    label: t(r.labelKey),
  }));
}

/**
 * Fold case and strip diacritics so `configuracion` matches `Configuración`
 * — Spanish is the default locale and accents are the common typo.
 *
 * NFD splits an accented letter into base + combining mark, then the combining
 * range U+0300–U+036F is dropped. Written as an explicit range rather than
 * `\p{Diacritic}`: this project's `tsconfig` targets ES5, where the regex `u`
 * flag that property escapes require is a compile error.
 */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Substring match over the label and the route itself, so both `ventas` and
 * `/sales` find the sales page whatever locale the user is in. An empty query
 * returns everything (the palette opens showing the full list).
 */
export function filterCommandItems(items: CommandItem[], query: string): CommandItem[] {
  const q = normalize(query.trim());
  if (!q) return items;
  return items.filter(
    (item) => normalize(item.label).includes(q) || normalize(item.href).includes(q),
  );
}

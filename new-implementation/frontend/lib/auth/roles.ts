/**
 * Frontend route → role policy. Mirrors the backend `@Roles` read access on
 * each module's controller so the UI doesn't surface pages the API will 403.
 *
 * This is UX-level authorization. The real security boundary is the backend
 * `RolesGuard` (verified JWT) — see SPEC-CUT-001 B-09.
 *
 * Routes NOT listed here are accessible to any authenticated user
 * (e.g. `/dashboard`, `/products`).
 */
/** Roles with unconditional access to every panel route (never locked out). */
export const SUPERUSER_ROLES = ['admin', 'superadmin'];

export const ROUTE_ROLES: Record<string, string[]> = {
  '/sales': ['admin', 'manager', 'cashier'],
  '/inventory': ['admin', 'manager', 'inventory_manager'],
  '/customers': ['admin', 'manager', 'cashier', 'viewer'],
  '/users': ['admin', 'manager'],
  '/reports': ['admin', 'manager', 'staff'],
  '/notifications': ['admin', 'manager', 'staff'],
  '/settings': ['admin', 'manager'],
};

/** Case-insensitive role membership check; tolerates an undefined role list. */
export function hasAnyRole(
  userRoles: string[] | undefined,
  allowed: string[],
): boolean {
  const owned = new Set((userRoles ?? []).map((r) => r.toLowerCase()));
  return allowed.some((r) => owned.has(r.toLowerCase()));
}

/** Allowed roles for a path (longest prefix match), or null if unrestricted. */
export function findRoutePolicy(pathname: string): string[] | null {
  const base = Object.keys(ROUTE_ROLES)
    .filter((b) => pathname === b || pathname.startsWith(b + '/'))
    .sort((a, b) => b.length - a.length)[0];
  return base ? ROUTE_ROLES[base] : null;
}

/** True if the user may view `pathname`. Unrestricted routes return true. */
export function canAccessRoute(
  pathname: string,
  userRoles: string[] | undefined,
): boolean {
  if (hasAnyRole(userRoles, SUPERUSER_ROLES)) return true;
  const allowed = findRoutePolicy(pathname);
  if (!allowed) return true;
  return hasAnyRole(userRoles, allowed);
}

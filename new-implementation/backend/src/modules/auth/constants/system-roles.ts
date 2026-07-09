import { AUTH_CONSTANTS } from './auth.constants';

export interface SystemRoleDef {
  name: string;
  description: string;
}

/** Canonical system-wide roles. Ordered superadmin → accountant. */
export const SYSTEM_ROLES: readonly SystemRoleDef[] = [
  { name: AUTH_CONSTANTS.ROLES.SUPERADMIN, description: 'Platform operator (cross-tenant provisioning)' },
  { name: AUTH_CONSTANTS.ROLES.ADMIN, description: 'Tenant administrator' },
  { name: AUTH_CONSTANTS.ROLES.MANAGER, description: 'Store manager' },
  { name: AUTH_CONSTANTS.ROLES.CASHIER, description: 'Cashier / POS operator' },
  { name: AUTH_CONSTANTS.ROLES.INVENTORY_MANAGER, description: 'Inventory manager' },
  // RESERVED: `accountant` is seeded so it exists as an assignable role, but no
  // route gates on it yet. It is intentionally reserved for M5 fiscal work
  // (SPEC-FISC-001) — do NOT wire it into a @Roles() check until that spec is
  // approved and defines the endpoints it should protect.
  { name: AUTH_CONSTANTS.ROLES.ACCOUNTANT, description: 'Accountant' },
];

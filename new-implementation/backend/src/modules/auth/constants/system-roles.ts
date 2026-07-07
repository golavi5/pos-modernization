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
  { name: AUTH_CONSTANTS.ROLES.ACCOUNTANT, description: 'Accountant' },
];

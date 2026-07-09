import { AUTH_CONSTANTS } from './auth.constants';

/**
 * Roles above the tenant admin (platform-level, cross-tenant). Two invariants
 * key off this list:
 *  - RolesGuard: the admin superuser bypass does NOT cover routes requiring one.
 *  - UsersService: a non-elevated actor cannot assign or see these roles.
 */
export const ELEVATED_ROLES: string[] = [AUTH_CONSTANTS.ROLES.SUPERADMIN];

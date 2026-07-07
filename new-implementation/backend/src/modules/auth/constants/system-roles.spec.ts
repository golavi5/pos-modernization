import { AUTH_CONSTANTS } from './auth.constants';
import { SYSTEM_ROLES } from './system-roles';

describe('SYSTEM_ROLES catalog', () => {
  it('exposes superadmin in the role constants', () => {
    expect(AUTH_CONSTANTS.ROLES.SUPERADMIN).toBe('superadmin');
  });

  it('defines the six system roles with a name and description', () => {
    const names = SYSTEM_ROLES.map((r) => r.name);
    expect(names).toEqual([
      'superadmin', 'admin', 'manager', 'cashier', 'inventory_manager', 'accountant',
    ]);
    for (const r of SYSTEM_ROLES) {
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.description.length).toBeGreaterThan(0);
    }
  });
});

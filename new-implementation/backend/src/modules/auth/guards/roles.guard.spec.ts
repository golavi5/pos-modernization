import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';

/** Build a User carrying the given role names (enough for hasAnyRole). */
function userWithRoles(...names: string[]): User {
  const user = new User();
  user.roles = names.map((name) => ({ name }) as Role);
  return user;
}

/** Minimal ExecutionContext whose handler resolves to `requiredRoles`. */
function contextFor(requiredRoles: string[] | undefined, user: User | undefined): ExecutionContext {
  return {
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { get: jest.Mock };

  beforeEach(() => {
    reflector = { get: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows when no roles are required', () => {
    reflector.get.mockReturnValue(undefined);
    expect(guard.canActivate(contextFor(undefined, userWithRoles('cashier')))).toBe(true);
  });

  it('allows a user that holds one of the required roles', () => {
    reflector.get.mockReturnValue(['cashier', 'manager']);
    expect(guard.canActivate(contextFor(['cashier', 'manager'], userWithRoles('cashier')))).toBe(true);
  });

  it('denies a user that holds none of the required roles', () => {
    reflector.get.mockReturnValue(['manager']);
    expect(() => guard.canActivate(contextFor(['manager'], userWithRoles('cashier')))).toThrow(
      ForbiddenException,
    );
  });

  it('throws when no user is present on the request', () => {
    reflector.get.mockReturnValue(['manager']);
    expect(() => guard.canActivate(contextFor(['manager'], undefined))).toThrow(ForbiddenException);
  });

  // Superuser-within-tenant: admin satisfies operational @Roles it does not literally hold.
  it('lets admin pass an operational route it does not literally hold (manager)', () => {
    reflector.get.mockReturnValue(['manager']);
    expect(guard.canActivate(contextFor(['manager'], userWithRoles('admin')))).toBe(true);
  });

  it('lets admin pass a cashier-only sale route', () => {
    reflector.get.mockReturnValue(['cashier', 'manager']);
    expect(guard.canActivate(contextFor(['cashier', 'manager'], userWithRoles('admin')))).toBe(true);
  });

  // Boundary preserved: admin is NOT superadmin.
  it('still denies admin on a superadmin-only route', () => {
    reflector.get.mockReturnValue(['superadmin']);
    expect(() => guard.canActivate(contextFor(['superadmin'], userWithRoles('admin')))).toThrow(
      ForbiddenException,
    );
  });

  it('allows admin on a route that lists admin alongside superadmin (literal membership)', () => {
    reflector.get.mockReturnValue(['admin', 'superadmin']);
    expect(guard.canActivate(contextFor(['admin', 'superadmin'], userWithRoles('admin')))).toBe(true);
  });
});

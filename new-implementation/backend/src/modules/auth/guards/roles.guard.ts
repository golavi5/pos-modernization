import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../entities/user.entity';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { ELEVATED_ROLES } from '../constants/elevated-roles';

/**
 * RolesGuard
 * Checks if the authenticated user has the required roles.
 * Must be used in combination with JwtAuthGuard and @Roles() decorator.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin', 'manager')
 * @Get('dashboard')
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    // If no roles specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get the authenticated user from request
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      throw new ForbiddenException('User not found in request');
    }

    // Check if user has at least one of the required roles. The tenant admin is
    // a superuser for operational routes: it satisfies any required role unless
    // the route demands an elevated (platform-level) role it does not literally
    // hold — see ELEVATED_ROLES.
    const routeIsElevated = requiredRoles.some((r) => ELEVATED_ROLES.includes(r));
    const hasRole =
      user.hasAnyRole(requiredRoles) ||
      (!routeIsElevated && user.hasAnyRole([AUTH_CONSTANTS.ROLES.ADMIN]));

    if (!hasRole) {
      throw new ForbiddenException(
        `User does not have required role(s): ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}

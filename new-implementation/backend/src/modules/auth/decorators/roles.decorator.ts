import { SetMetadata } from '@nestjs/common';

/**
 * @Roles() decorator
 * Used to specify required roles for a route handler.
 * Must be used in combination with RolesGuard.
 *
 * @example
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin', 'manager')
 * @Get('dashboard')
 * getDashboard() {
 *   return { message: 'Admin/Manager only' };
 * }
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

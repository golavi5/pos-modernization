import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard
 * Guard that validates JWT tokens on protected routes.
 * Relies on the JwtStrategy for validation.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

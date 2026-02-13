import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { User } from '../entities/user.entity';

/**
 * JwtStrategy
 * Passport strategy for JWT token validation.
 * Validates tokens and injects user into request context.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: AUTH_CONSTANTS.JWT.SECRET_KEY,
    });
  }

  /**
   * Validate JWT payload and return user
   * This is called after JWT signature is verified
   */
  async validate(payload: any): Promise<User> {
    // The payload contains the user information encoded in the JWT
    // We fetch the full user object from the database to ensure latest role data
    const user = await this.authService.getUserById(payload.sub);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.is_active) {
      throw new Error('User account is inactive');
    }

    return user;
  }
}

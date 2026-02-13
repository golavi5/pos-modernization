import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { AUTH_CONSTANTS } from './constants/auth.constants';

@Module({
  imports: [
    // Import User and Role entities for repository
    TypeOrmModule.forFeature([User, Role]),

    // Configure Passport for local and JWT strategies
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Configure JWT module with secrets and expiration times
    JwtModule.register({
      secret: AUTH_CONSTANTS.JWT.SECRET_KEY,
      signOptions: {
        expiresIn: AUTH_CONSTANTS.JWT.ACCESS_TOKEN_EXPIRY,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService, JwtModule], // Export for use in other modules
})
export class AuthModule {}

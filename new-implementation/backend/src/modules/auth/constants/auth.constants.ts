/**
 * Authentication Constants
 * Centralized configuration for JWT, timeouts, and security parameters
 */
import { PASSWORD_MIN_LENGTH } from '../../../common/password-policy';

export const AUTH_CONSTANTS = {
  // JWT Configuration
  JWT: {
    ACCESS_TOKEN_EXPIRY: process.env.JWT_EXPIRES_IN || '1h', // 1 hour
    REFRESH_TOKEN_EXPIRY: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // 7 days
    // Dev-only fallbacks. In production, main.ts validateProductionEnv()
    // throws on startup if these env vars are unset, so the literals below
    // are never reachable in prod.
    SECRET_KEY: process.env.JWT_SECRET || 'dev-only-secret-change-in-production',
    REFRESH_SECRET_KEY:
      process.env.JWT_REFRESH_SECRET ||
      'dev-only-refresh-secret-change-in-production',
  },

  // Password Configuration — mirrors src/common/password-policy.ts. Enforced by
  // auth.service.validatePasswordStrength (register + change password).
  PASSWORD: {
    BCRYPT_ROUNDS: 10,
    MIN_LENGTH: PASSWORD_MIN_LENGTH,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
  },

  // Error Messages
  ERRORS: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    USER_NOT_FOUND: 'User not found',
    USER_INACTIVE: 'User account is inactive',
    DUPLICATE_EMAIL: 'Email already exists',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Insufficient permissions',
    INVALID_TOKEN: 'Invalid or expired token',
    WEAK_PASSWORD: 'Password does not meet security requirements',
    PASSWORD_MISMATCH: 'Current password is incorrect',
    REFRESH_TOKEN_EXPIRED: 'Refresh token has expired',
  },

  // Token Types
  TOKEN_TYPE: {
    ACCESS: 'access',
    REFRESH: 'refresh',
  },

  // Default Roles
  ROLES: {
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin',
    MANAGER: 'manager',
    CASHIER: 'cashier',
    INVENTORY_MANAGER: 'inventory_manager',
    ACCOUNTANT: 'accountant',
  },

  // Cache Keys
  CACHE: {
    INVALID_TOKENS: 'invalid_tokens:',
    USER_PROFILE: 'user_profile:',
  },
};

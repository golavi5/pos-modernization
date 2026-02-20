/**
 * Authentication Constants
 * Centralized configuration for JWT, timeouts, and security parameters
 */

export const AUTH_CONSTANTS = {
  // JWT Configuration
  JWT: {
    ACCESS_TOKEN_EXPIRY: '1h', // 1 hour
    REFRESH_TOKEN_EXPIRY: '7d', // 7 days
    SECRET_KEY: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  },

  // Password Configuration
  PASSWORD: {
    BCRYPT_ROUNDS: 10,
    MIN_LENGTH: 6,
    REQUIRE_UPPERCASE: false,
    REQUIRE_LOWERCASE: false,
    REQUIRE_NUMBERS: false,
    REQUIRE_SPECIAL_CHARS: false,
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

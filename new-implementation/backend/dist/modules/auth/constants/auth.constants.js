"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_CONSTANTS = void 0;
exports.AUTH_CONSTANTS = {
    JWT: {
        ACCESS_TOKEN_EXPIRY: '1h',
        REFRESH_TOKEN_EXPIRY: '7d',
        SECRET_KEY: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    },
    PASSWORD: {
        BCRYPT_ROUNDS: 10,
        MIN_LENGTH: 8,
        REQUIRE_UPPERCASE: true,
        REQUIRE_LOWERCASE: true,
        REQUIRE_NUMBERS: true,
        REQUIRE_SPECIAL_CHARS: true,
    },
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
    TOKEN_TYPE: {
        ACCESS: 'access',
        REFRESH: 'refresh',
    },
    ROLES: {
        ADMIN: 'admin',
        MANAGER: 'manager',
        CASHIER: 'cashier',
        INVENTORY_MANAGER: 'inventory_manager',
        ACCOUNTANT: 'accountant',
    },
    CACHE: {
        INVALID_TOKENS: 'invalid_tokens:',
        USER_PROFILE: 'user_profile:',
    },
};
//# sourceMappingURL=auth.constants.js.map
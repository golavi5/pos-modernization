export declare const AUTH_CONSTANTS: {
    JWT: {
        ACCESS_TOKEN_EXPIRY: string;
        REFRESH_TOKEN_EXPIRY: string;
        SECRET_KEY: string;
    };
    PASSWORD: {
        BCRYPT_ROUNDS: number;
        MIN_LENGTH: number;
        REQUIRE_UPPERCASE: boolean;
        REQUIRE_LOWERCASE: boolean;
        REQUIRE_NUMBERS: boolean;
        REQUIRE_SPECIAL_CHARS: boolean;
    };
    ERRORS: {
        INVALID_CREDENTIALS: string;
        USER_NOT_FOUND: string;
        USER_INACTIVE: string;
        DUPLICATE_EMAIL: string;
        UNAUTHORIZED: string;
        FORBIDDEN: string;
        INVALID_TOKEN: string;
        WEAK_PASSWORD: string;
        PASSWORD_MISMATCH: string;
        REFRESH_TOKEN_EXPIRED: string;
    };
    TOKEN_TYPE: {
        ACCESS: string;
        REFRESH: string;
    };
    ROLES: {
        ADMIN: string;
        MANAGER: string;
        CASHIER: string;
        INVENTORY_MANAGER: string;
        ACCOUNTANT: string;
    };
    CACHE: {
        INVALID_TOKENS: string;
        USER_PROFILE: string;
    };
};

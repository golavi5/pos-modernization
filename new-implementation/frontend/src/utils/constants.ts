// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
export const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10);
export const API_RETRY_COUNT = parseInt(import.meta.env.VITE_API_RETRY_COUNT || '3', 10);

// App Configuration
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'POS System';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
export const APP_ENVIRONMENT = import.meta.env.MODE || 'development';

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  LANGUAGE: 'language',
} as const;

// Token Configuration
export const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes in ms
export const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes in ms

// Routes
export const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
];

export const PROTECTED_ROUTES = {
  DASHBOARD: '/dashboard',
  SALES: '/dashboard/sales',
  ORDERS: '/dashboard/orders',
  PRODUCTS: '/dashboard/products',
  CUSTOMERS: '/dashboard/customers',
  INVENTORY: '/dashboard/inventory',
  REPORTS: '/dashboard/reports',
  ADMIN: '/admin',
  SETTINGS: '/admin/settings',
  USERS: '/admin/users',
  AUDIT_LOG: '/admin/audit-log',
};

// Role-based Routes
export const ROLE_BASED_ROUTES = {
  CASHIER: [
    PROTECTED_ROUTES.DASHBOARD,
    PROTECTED_ROUTES.SALES,
    PROTECTED_ROUTES.CUSTOMERS,
  ],
  MANAGER: [
    PROTECTED_ROUTES.DASHBOARD,
    PROTECTED_ROUTES.SALES,
    PROTECTED_ROUTES.PRODUCTS,
    PROTECTED_ROUTES.CUSTOMERS,
    PROTECTED_ROUTES.INVENTORY,
    PROTECTED_ROUTES.REPORTS,
  ],
  ADMIN: Object.values(PROTECTED_ROUTES),
};

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  UNAUTHORIZED: 'You do not have permission to access this resource',
  SERVER_ERROR: 'An error occurred. Please try again later.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  TOKEN_REFRESH_FAILED: 'Failed to refresh session. Please login again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Logged in successfully',
  LOGOUT_SUCCESS: 'Logged out successfully',
  REGISTER_SUCCESS: 'Account created successfully',
  OPERATION_SUCCESS: 'Operation completed successfully',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZES: [10, 20, 50, 100],
} as const;

// Debounce and Throttle
export const DEBOUNCE_DELAY = 300; // ms
export const THROTTLE_DELAY = 500; // ms

// Toast Messages Duration
export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  INFO: 3000,
  WARNING: 4000,
} as const;

// Breakpoints (Tailwind)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// Date Format
export const DATE_FORMAT = 'MM/dd/yyyy';
export const DATETIME_FORMAT = 'MM/dd/yyyy HH:mm:ss';
export const TIME_FORMAT = 'HH:mm:ss';

// Regular Expressions
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^(\+\d{1,3}[- ]?)?\d{10,}$/,
  URL: /^https?:\/\/.+/i,
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
} as const;

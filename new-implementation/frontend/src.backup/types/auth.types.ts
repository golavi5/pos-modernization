export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  CASHIER = 'cashier',
}

export interface PermissionData {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Role {
  id: string;
  name: UserRole;
  displayName: string;
  permissions: PermissionData[];
  description?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  companyId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  companyName?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthError {
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

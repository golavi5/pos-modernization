export interface User {
  id: string;
  email: string;
  name: string;
  company_id: string;
  roles: string[];
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
  name: string;
}

// POST /auth/register returns the created user (no tokens — the user logs in
// afterward). Was previously typed with dead snake_case token fields.
export type AuthResponse = User;

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface MeResponse {
  user: User;
}
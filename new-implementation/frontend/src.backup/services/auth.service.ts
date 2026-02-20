import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '@/types/auth.types';
import { api } from './api';
import { storage } from './storage';

/**
 * Authentication Service
 */
export class AuthService {
  private tokenRefreshTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const request: LoginRequest = { email, password };

    const response = await api.post<LoginResponse>('/auth/login', request, {
      retry: false,
    });

    if (response.data) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
      storage.setUser(response.data.user);
    }

    return response.data;
  }

  /**
   * Register new user
   */
  async register(
    email: string,
    password: string,
    name: string,
    companyName?: string
  ): Promise<LoginResponse> {
    const request: RegisterRequest = {
      email,
      password,
      confirmPassword: password,
      name,
      companyName,
    };

    const response = await api.post<LoginResponse>('/auth/register', request, {
      retry: false,
    });

    if (response.data) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
      storage.setUser(response.data.user);
    }

    return response.data;
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = storage.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const request: RefreshTokenRequest = { refreshToken };

    const response = await api.post<RefreshTokenResponse>('/auth/refresh-token', request, {
      retry: false,
    });

    if (response.data) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
    }

    return response.data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    this.clearTokenRefreshTimeout();

    try {
      await api.post('/auth/logout', {}, { retry: false });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }

    storage.clearAuth();
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email }, { retry: false });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string): Promise<void> {
    await api.post(
      '/auth/reset-password',
      { token, password, confirmPassword: password },
      { retry: false }
    );
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    await api.post('/auth/verify-email', { token }, { retry: false });
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    const response = await api.get('/auth/me', { retry: false });
    if (response.data) {
      storage.setUser(response.data);
    }
    return response.data;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!storage.getAccessToken();
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return storage.getAccessToken();
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return storage.getRefreshToken();
  }

  /**
   * Set tokens and schedule refresh
   */
  private setTokens(accessToken: string, refreshToken: string): void {
    storage.setAccessToken(accessToken);
    storage.setRefreshToken(refreshToken);
    this.scheduleTokenRefresh(accessToken);
  }

  /**
   * Schedule token refresh before expiry
   */
  private scheduleTokenRefresh(token: string): void {
    this.clearTokenRefreshTimeout();

    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return;

      const expiryTime = decoded.exp * 1000; // Convert to ms
      const currentTime = Date.now();
      const timeUntilRefresh = expiryTime - currentTime - 5 * 60 * 1000; // Refresh 5 minutes before expiry

      if (timeUntilRefresh > 0) {
        this.tokenRefreshTimeout = setTimeout(() => {
          this.refreshToken().catch((error) => {
            console.error('Token refresh failed:', error);
            storage.clearAuth();
            window.location.href = '/login';
          });
        }, timeUntilRefresh);
      }
    } catch (error) {
      console.error('Failed to schedule token refresh:', error);
    }
  }

  /**
   * Decode JWT token (basic decoding, doesn't verify signature)
   */
  private decodeToken(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const decoded = JSON.parse(atob(parts[1]));
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Clear token refresh timeout
   */
  private clearTokenRefreshTimeout(): void {
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    const token = storage.getAccessToken();
    if (!token) return true;

    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    return decoded.exp * 1000 < Date.now();
  }
}

export const authService = new AuthService();

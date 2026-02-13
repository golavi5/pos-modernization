import { STORAGE_KEYS } from '@/utils/constants';

/**
 * Storage service - Wrapper around localStorage with typed methods
 */
class StorageService {
  /**
   * Get item from localStorage
   */
  getItem<T = string>(key: string, fallback?: T): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return fallback ?? null;
      return JSON.parse(item) as T;
    } catch {
      return fallback ?? null;
    }
  }

  /**
   * Set item in localStorage
   */
  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to set item ${key}:`, error);
    }
  }

  /**
   * Remove item from localStorage
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove item ${key}:`, error);
    }
  }

  /**
   * Clear all items from localStorage
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  /**
   * Check if key exists in localStorage
   */
  hasItem(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Get all keys from localStorage
   */
  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  }

  // Token methods
  getAccessToken(): string | null {
    return this.getItem<string>(STORAGE_KEYS.ACCESS_TOKEN);
  }

  setAccessToken(token: string): void {
    this.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  }

  removeAccessToken(): void {
    this.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  getRefreshToken(): string | null {
    return this.getItem<string>(STORAGE_KEYS.REFRESH_TOKEN);
  }

  setRefreshToken(token: string): void {
    this.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  }

  removeRefreshToken(): void {
    this.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  // User methods
  getUser<T = any>(fallback?: T): T | null {
    return this.getItem<T>(STORAGE_KEYS.USER, fallback);
  }

  setUser<T>(user: T): void {
    this.setItem(STORAGE_KEYS.USER, user);
  }

  removeUser(): void {
    this.removeItem(STORAGE_KEYS.USER);
  }

  // Theme methods
  getTheme(): string | null {
    return this.getItem<string>(STORAGE_KEYS.THEME);
  }

  setTheme(theme: string): void {
    this.setItem(STORAGE_KEYS.THEME, theme);
  }

  // Sidebar methods
  isSidebarCollapsed(): boolean {
    return this.getItem<boolean>(STORAGE_KEYS.SIDEBAR_COLLAPSED, false) ?? false;
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
  }

  // Language methods
  getLanguage(): string | null {
    return this.getItem<string>(STORAGE_KEYS.LANGUAGE);
  }

  setLanguage(language: string): void {
    this.setItem(STORAGE_KEYS.LANGUAGE, language);
  }

  /**
   * Clear all auth-related storage
   */
  clearAuth(): void {
    this.removeAccessToken();
    this.removeRefreshToken();
    this.removeUser();
  }
}

export const storage = new StorageService();

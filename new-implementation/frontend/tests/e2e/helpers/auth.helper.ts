import { Page } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async login(email: string = 'admin@test.com', password: string = 'password123') {
    await this.page.goto('/login');
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }

  async logout() {
    // Click user menu
    await this.page.click('[data-testid="user-menu"]');
    // Click logout button
    await this.page.click('text=Cerrar sesión');
    // Wait for redirect to login
    await this.page.waitForURL('/login');
  }

  async isLoggedIn(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/dashboard');
  }

  async register(
    name: string,
    email: string,
    password: string,
    companyName: string
  ) {
    await this.page.goto('/register');
    await this.page.fill('input[name="name"]', name);
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.fill('input[name="companyName"]', companyName);
    await this.page.click('button[type="submit"]');
    
    // Wait for redirect
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }
}

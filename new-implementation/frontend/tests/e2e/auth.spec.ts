import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

test.describe('Authentication', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await authHelper.login('admin@test.com', 'password123');
    
    // Verify we're on dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Verify dashboard content is visible
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Credenciales inválidas')).toBeVisible();
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should logout successfully', async ({ page }) => {
    await authHelper.login();
    
    // Verify we're logged in
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Logout
    await authHelper.logout();
    
    // Verify we're back to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/dashboard/products');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should persist session after page reload', async ({ page }) => {
    await authHelper.login();
    
    // Reload page
    await page.reload();
    
    // Should still be logged in
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

// A string that only the dashboard renders (the page has no h1/h2).
const DASHBOARD_MARKER = 'Acciones rápidas';

test.describe('Authentication', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await authHelper.login();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(DASHBOARD_MARKER)).toBeVisible();
  });

  test('should show an error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // The banner's text is the backend's message (currently English), so assert
    // that an error is shown, not its language.
    await expect(page.locator('.bg-error-subtle')).toBeVisible();
    await expect(page).toHaveURL(/.*login/);
  });

  test('should logout successfully', async ({ page }) => {
    await authHelper.login();
    await expect(page).toHaveURL(/.*dashboard/);

    await authHelper.logout();

    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect to login when accessing a protected route without auth', async ({ page }) => {
    await page.goto('/products');

    await expect(page).toHaveURL(/.*login/);
  });

  test('should persist session after page reload', async ({ page }) => {
    await authHelper.login();

    await page.reload();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(DASHBOARD_MARKER)).toBeVisible();
  });
});

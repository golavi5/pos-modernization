import { test, expect } from '@playwright/test';

test.describe('Login errors', () => {
  test('wrong credentials show the translated message, not the backend English', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.getByText('Credenciales inválidas')).toBeVisible();
    await expect(page).toHaveURL(/.*login/);
  });
});

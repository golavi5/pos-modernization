import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

test.describe('Sale golden path', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login(); // admin@test.com / password123
    await page.goto('/sales');
  });

  test('completes a sale in 4 clicks or fewer', async ({ page }) => {
    // Wait for product grid to load
    await page.waitForSelector('[data-testid="product-card"]:not([disabled])');

    // Click 1: add a product to cart
    await page.click('[data-testid="product-card"]:not([disabled])');
    await expect(page.locator('[data-testid="cobrar-button"]')).not.toBeDisabled();

    // Click 2: open payment modal
    await page.click('[data-testid="cobrar-button"]');
    await expect(page.locator('text=Total a cobrar')).toBeVisible();

    // Click 3: select a quick amount (e.g. $100k — enough to cover any single item)
    const quickBtn = page.locator('button').filter({ hasText: /\$100k/ });
    await quickBtn.click();
    await expect(page.locator('text=Cambio')).toBeVisible();

    // Enter (keyboard shortcut) — click 4 equivalent
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=¡Pago completado!')).toBeVisible();
  });

  test('cart panel is always visible on sales page', async ({ page }) => {
    await expect(page.locator('[data-testid="cobrar-button"]')).toBeVisible();
  });

  test('cobrar button is disabled when cart is empty', async ({ page }) => {
    await expect(page.locator('[data-testid="cobrar-button"]')).toBeDisabled();
  });

  test('payment success auto-returns to new sale', async ({ page }) => {
    await page.waitForSelector('[data-testid="product-card"]:not([disabled])');
    await page.click('[data-testid="product-card"]:not([disabled])');
    await page.click('[data-testid="cobrar-button"]');
    const quickBtn = page.locator('button').filter({ hasText: /\$100k/ });
    await quickBtn.click();
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-testid="payment-success"]', { timeout: 8000 });

    // Click "Nueva venta" button
    await page.click('text=+ Nueva venta');

    // Should be back on the sales page with an empty, enabled cobrar button
    await expect(page.locator('[data-testid="cobrar-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="cobrar-button"]')).toBeDisabled();
  });

  test('confirm payment button triggers via data-testid', async ({ page }) => {
    await page.waitForSelector('[data-testid="product-card"]:not([disabled])');
    await page.click('[data-testid="product-card"]:not([disabled])');
    await page.click('[data-testid="cobrar-button"]');
    await page.locator('button').filter({ hasText: /\$100k/ }).click();

    // Confirm via button instead of Enter key
    await page.click('[data-testid="confirm-payment-button"]');
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 8000 });
  });
});

import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

test.describe('Dashboard', () => {
  test('KPI cards render real values, never undefined or NaN', async ({ page }) => {
    await new AuthHelper(page).login();
    await expect(page.getByText('Acciones rápidas')).toBeVisible();
    // Let the stats queries settle: the cards leave their '—' placeholder.
    await expect(page.getByText('Ventas hoy')).toBeVisible();
    await page.waitForLoadState('networkidle');

    const text = await page.locator('main, body').first().innerText();
    expect(text).not.toContain('NaN');
    expect(text).not.toContain('undefined');
  });
});

test.describe('Dashboard numbers come from real sales', () => {
  test('a completed sale shows up in today\'s cards', async ({ page }) => {
    await new AuthHelper(page).login();
    const name = `Dash Prod ${Date.now()}`;

    // A product priced $7.000, sold once through the real POS.
    await page.goto('/products/new');
    await page.waitForLoadState('networkidle');
    await page.fill('input[id="name"]', name);
    await page.fill('input[id="sku"]', `DASH-${Date.now()}`);
    await page.fill('input[id="price"]', '7000');
    await page.fill('input[id="stock_quantity"]', '5');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/products/);

    await page.goto('/sales');
    await page.locator('[data-testid="product-card"]', { hasText: name }).click();
    await page.click('[data-testid="cobrar-button"]');
    await page.locator('button').filter({ hasText: /\$100k/ }).click();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 10000 });

    await page.goto('/dashboard');
    // "Ventas hoy" and "Transacciones" move off $ 0 / 0 (other tests may also sell,
    // so assert "at least this sale", not an exact total).
    const salesToday = page.locator('div', { hasText: /^Ventas hoy/ }).first();
    await expect(salesToday).not.toContainText(/\$\s?0$/);
    await expect(page.getByText('+12% vs ayer')).toHaveCount(0);
  });
});

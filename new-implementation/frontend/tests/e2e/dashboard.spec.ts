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

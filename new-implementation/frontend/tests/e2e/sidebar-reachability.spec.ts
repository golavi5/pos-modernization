import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

test.describe('Sidebar reachability', () => {
  test.beforeEach(async ({ page }) => {
    await new AuthHelper(page).login();
  });

  test('reveals nav labels on keyboard focus, with no pointer', async ({ page }) => {
    const salesLabel = page.getByRole('link', { name: 'Ventas' }).locator('span');
    await expect(salesLabel).toHaveCSS('opacity', '0');

    await page.getByRole('link', { name: 'Ventas' }).focus();

    await expect(salesLabel).toHaveCSS('opacity', '1');
  });
});

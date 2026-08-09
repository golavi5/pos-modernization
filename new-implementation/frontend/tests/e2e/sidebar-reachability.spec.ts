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

  test('pin keeps labels visible after the pointer leaves', async ({ page }) => {
    await page.getByTestId('sidebar-pin').click();
    await page.mouse.move(600, 400);

    await expect(page.getByRole('link', { name: 'Ventas' }).locator('span'))
      .toHaveCSS('opacity', '1');
  });

  test('pin survives a reload', async ({ page }) => {
    await page.getByTestId('sidebar-pin').click();
    await page.reload();
    await page.mouse.move(600, 400);

    await expect(page.getByTestId('sidebar-pin')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('link', { name: 'Ventas' }).locator('span'))
      .toHaveCSS('opacity', '1');
  });

  test('unpinning hides the labels again', async ({ page }) => {
    await page.getByTestId('sidebar-pin').click();
    await page.getByTestId('sidebar-pin').click();
    // The click leaves the pin button focused, and the focus-within
    // variants alone would keep the labels visible — blur before asserting,
    // or this test fails against a correct implementation.
    await page.getByTestId('sidebar-pin').blur();
    await page.mouse.move(600, 400);

    await expect(page.getByRole('link', { name: 'Ventas' }).locator('span'))
      .toHaveCSS('opacity', '0');
  });
});

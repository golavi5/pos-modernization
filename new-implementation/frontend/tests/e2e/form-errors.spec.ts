import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

test.describe('Form errors reach the user', () => {
  test('a backend rejection shows in the customer slide-over instead of failing silently', async ({ page }) => {
    await new AuthHelper(page).login();
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    const phone = `+57 300 ${Date.now()}`;

    async function create(name: string, email: string) {
      await page.getByRole('button', { name: 'Nuevo cliente' }).click();
      await page.fill('input#name', name);
      await page.fill('input#email', email);
      await page.fill('input#phone', phone);
      await page.getByRole('button', { name: 'Guardar' }).click();
    }

    await create(`E2E Dup A ${Date.now()}`, `dupa${Date.now()}@example.com`);
    await expect(page.getByRole('button', { name: 'Nuevo cliente' })).toBeVisible();

    // Same phone again: the backend answers 400 "already exists".
    await create(`E2E Dup B ${Date.now()}`, `dupb${Date.now()}@example.com`);
    // Scoped to the form: Next's route announcer is also role=alert.
    await expect(page.locator('form').getByRole('alert')).toContainText(/already exists/i);
  });
});

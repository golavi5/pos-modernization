import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';
import { API_BASE_URL, apiSession } from './helpers/api.helper';

test.describe('Company timezone setting', () => {
  test('is saved from Settings and survives a reload', async ({ page }) => {
    await new AuthHelper(page).login();
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    const zone = page.locator('select#timezone');

    await expect(zone).toHaveValue('America/Bogota'); // the default for a new company
    try {
      await zone.selectOption('Europe/Madrid');
      await page.getByRole('button', { name: 'Guardar cambios' }).click();
      await expect(page.getByText('Configuración guardada')).toBeVisible();

      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('select#timezone')).toHaveValue('Europe/Madrid');
    } finally {
      // Leave the shared test company as we found it.
      await page.locator('select#timezone').selectOption('America/Bogota');
      await page.getByRole('button', { name: 'Guardar cambios' }).click();
      await expect(page.getByText('Configuración guardada')).toBeVisible();
    }
  });

  test('the API rejects a zone that does not exist', async ({ request }) => {
    const { headers } = await apiSession(request);

    const res = await request.patch(`${API_BASE_URL}/settings/company`, {
      headers,
      data: { timezone: 'Mars/Olympus_Mons' },
    });

    expect(res.status()).toBe(400);
  });
});

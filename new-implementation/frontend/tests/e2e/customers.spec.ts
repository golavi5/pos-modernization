import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';
import { API_BASE_URL, apiSession } from './helpers/api.helper';

test.describe('Customers', () => {
  test.beforeEach(async ({ page }) => {
    await new AuthHelper(page).login();
  });

  async function openCustomers(page: import('@playwright/test').Page) {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
  }

  async function seedCustomer(
    request: import('@playwright/test').APIRequestContext,
    extra: Record<string, unknown> = {}
  ) {
    const { headers } = await apiSession(request);
    const name = `E2E Cliente ${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
    const res = await request.post(`${API_BASE_URL}/customers`, {
      headers,
      data: { name, email: `e2e${Date.now()}${Math.floor(Math.random() * 1e4)}@example.com`, ...extra },
    });
    expect(res.ok()).toBeTruthy();
    return { name, headers, ...((await res.json()) as { id: string }) };
  }

  test('creates a customer through the slide-over form', async ({ page }) => {
    const name = `E2E Alta ${Date.now()}`;
    await openCustomers(page);

    await page.getByRole('button', { name: 'Nuevo cliente' }).click();
    await page.fill('input#name', name);
    await page.fill('input#email', `e2e${Date.now()}@example.com`);
    await page.fill('input#phone', `+57 300 ${Date.now()}`);
    await page.fill('textarea#address', 'Calle Test 123, Ciudad');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await page.getByPlaceholder('Buscar clientes...').fill(name);
    await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible();
  });

  test('edits a customer', async ({ page, request }) => {
    const { name } = await seedCustomer(request);
    const edited = `${name} EDITADO`;
    await openCustomers(page);
    await page.getByPlaceholder('Buscar clientes...').fill(name);

    await page.getByRole('row').filter({ hasText: name }).getByTitle('Editar').click();
    await page.fill('input#name', edited);
    await page.getByRole('button', { name: 'Guardar' }).click();

    await page.getByPlaceholder('Buscar clientes...').fill(edited);
    await expect(page.getByRole('row').filter({ hasText: edited })).toBeVisible();
  });

  test('soft-deletes a customer after confirming', async ({ page, request }) => {
    const { name } = await seedCustomer(request);
    await openCustomers(page);
    await page.getByPlaceholder('Buscar clientes...').fill(name);
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await row.getByTitle('Eliminar').click();

    // Soft delete: the customer leaves the list (it only shows active customers).
    await expect(row).toHaveCount(0);
  });

  test('searches customers by name', async ({ page, request }) => {
    const { name } = await seedCustomer(request);
    await openCustomers(page);

    await page.getByPlaceholder('Buscar clientes...').fill(name);

    await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible();
    // header row + the single match
    await expect(page.getByRole('row')).toHaveCount(2);
  });

  test('adds loyalty points', async ({ page, request }) => {
    const { name } = await seedCustomer(request);
    await openCustomers(page);
    await page.getByPlaceholder('Buscar clientes...').fill(name);

    await page.getByRole('row').filter({ hasText: name }).getByTitle('Gestionar puntos').click();
    await expect(page.getByRole('heading', { name: 'Gestionar Puntos' })).toBeVisible();
    await page.getByRole('button', { name: 'Agregar' }).click();
    await page.fill('input#points', '50');
    await expect(page.getByText('Nuevo balance:')).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page.getByRole('heading', { name: 'Gestionar Puntos' })).toBeHidden();
    await expect(page.getByRole('row').filter({ hasText: name })).toContainText('50');
  });

  test('refuses to subtract more points than the balance', async ({ page, request }) => {
    const { name } = await seedCustomer(request);
    await openCustomers(page);
    await page.getByPlaceholder('Buscar clientes...').fill(name);

    await page.getByRole('row').filter({ hasText: name }).getByTitle('Gestionar puntos').click();
    await page.getByRole('button', { name: 'Restar' }).click();
    await page.fill('input#points', '99999');
    const dialogMessage = new Promise<string>((resolve) =>
      page.once('dialog', async (dialog) => {
        resolve(dialog.message());
        await dialog.accept();
      })
    );
    await page.getByRole('button', { name: 'Confirmar' }).click();

    expect(await dialogMessage).toBe('No hay suficientes puntos para restar');
    await expect(page.getByRole('heading', { name: 'Gestionar Puntos' })).toBeVisible();
  });
});

import { test, expect, type Page } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';
import { seedProduct } from './helpers/api.helper';

const SEARCH = 'Buscar productos...';

async function openProducts(page: Page, search?: string) {
  await page.goto('/products');
  await page.waitForLoadState('networkidle');
  if (search) await page.getByPlaceholder(SEARCH).fill(search);
}

test.describe('Products', () => {
  test.beforeEach(async ({ page }) => {
    await new AuthHelper(page).login();
  });

  test('creates a product through the slide-over form', async ({ page }) => {
    const uid = Date.now();
    const name = `E2E Alta ${uid}`;
    await openProducts(page);

    await page.getByRole('button', { name: 'Nuevo Producto' }).click();
    await page.fill('input#name', name);
    await page.fill('input#sku', `E2E-${uid}`);
    await page.fill('input#price', '15000');
    await page.fill('input#stock_quantity', '100');
    await page.fill('textarea#description', 'Producto creado por E2E');
    await page.fill('input#cost', '10000');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await page.getByPlaceholder(SEARCH).fill(name);
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible();
    await expect(row).toContainText(`E2E-${uid}`);
    await expect(row).toContainText('100');
  });

  test('keeps the form open when required fields are empty', async ({ page }) => {
    await openProducts(page);

    await page.getByRole('button', { name: 'Nuevo Producto' }).click();
    await page.getByRole('button', { name: 'Guardar' }).click();

    // Native `required` validation blocks the submit: the form stays put.
    await expect(page.getByRole('heading', { name: 'Nuevo Producto' })).toBeVisible();
    await expect(page.locator('input#name:invalid')).toBeVisible();
  });

  test('searches products by name', async ({ page, request }) => {
    const { name } = await seedProduct(request);
    await openProducts(page, name);

    await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible();
    // header row + the single match
    await expect(page.getByRole('row')).toHaveCount(2);
  });

  test('edits a product name and price', async ({ page, request }) => {
    const { name } = await seedProduct(request);
    const edited = `${name} EDITADO`;
    await openProducts(page, name);

    await page.getByRole('row').filter({ hasText: name }).getByTitle('Editar').click();
    await page.fill('input#name', edited);
    await page.fill('input#price', '25000');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await page.getByPlaceholder(SEARCH).fill(edited);
    const row = page.getByRole('row').filter({ hasText: edited });
    await expect(row).toBeVisible();
    await expect(row).toContainText('25.000');
  });

  test('deletes a product after confirming', async ({ page, request }) => {
    const { name } = await seedProduct(request);
    await openProducts(page, name);
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await row.getByTitle('Eliminar').click();

    await expect(page.getByText('No se encontraron productos')).toBeVisible();
  });
});

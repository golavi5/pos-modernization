import { test, expect, type Page } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';
import { seedProduct } from './helpers/api.helper';

const SEARCH = 'Buscar producto o SKU...';

async function openInventory(page: Page, search: string) {
  await page.goto('/inventory');
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder(SEARCH).fill(search);
}

const rowOf = (page: Page, name: string) => page.getByRole('row').filter({ hasText: name });

async function openAdjust(page: Page, name: string) {
  await rowOf(page, name).getByRole('button', { name: 'Ajustar' }).click();
  await expect(page.getByRole('heading', { name: 'Ajustar Stock' })).toBeVisible();
}

test.describe('Inventory', () => {
  test.beforeEach(async ({ page }) => {
    await new AuthHelper(page).login();
  });

  test('lists one row per product with its quantity and status', async ({ page, request }) => {
    const { name, sku } = await seedProduct(request, { stock_quantity: 12, reorder_level: 2 });
    await openInventory(page, name);

    const row = rowOf(page, name);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(`SKU: ${sku}`);
    await expect(row).toContainText('12');
    await expect(row).toContainText('Disponible');
    // No warehouse dimension any more.
    await expect(page.getByRole('columnheader', { name: 'Almacén' })).toHaveCount(0);
  });

  test('flags out-of-stock and restock-level products', async ({ page, request }) => {
    const empty = await seedProduct(request, { stock_quantity: 0, reorder_level: 3 });
    const low = await seedProduct(request, { stock_quantity: 2, reorder_level: 5 });

    await openInventory(page, empty.name);
    await expect(rowOf(page, empty.name)).toContainText('Sin stock');

    await page.getByPlaceholder(SEARCH).fill(low.name);
    await expect(rowOf(page, low.name)).toContainText('Reabastecer');
  });

  test('adjusts stock IN and updates the row', async ({ page, request }) => {
    const { name } = await seedProduct(request, { stock_quantity: 10 });
    await openInventory(page, name);

    await openAdjust(page, name);
    await page.getByRole('button', { name: /^Entrada/ }).click();
    await page.fill('input#quantity', '50');
    await page.fill('input#reference', `PO-${Date.now()}`);
    await page.fill('textarea#notes', 'Ajuste E2E');
    await expect(page.getByText('Nuevo stock:')).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar Ajuste' }).click();

    await expect(page.getByRole('heading', { name: 'Ajustar Stock' })).toBeHidden();
    await expect(rowOf(page, name).getByText('60', { exact: true })).toBeVisible();
  });

  test('adjusts stock OUT and updates the row', async ({ page, request }) => {
    const { name } = await seedProduct(request, { stock_quantity: 10 });
    await openInventory(page, name);

    await openAdjust(page, name);
    await page.getByRole('button', { name: /^Salida/ }).click();
    await page.fill('input#quantity', '4');
    await page.getByRole('button', { name: 'Confirmar Ajuste' }).click();

    await expect(page.getByRole('heading', { name: 'Ajustar Stock' })).toBeHidden();
    await expect(rowOf(page, name).getByText('6', { exact: true })).toBeVisible();
  });

  test('DAMAGE decrements and RETURN increments', async ({ page, request }) => {
    const { name } = await seedProduct(request, { stock_quantity: 10 });
    await openInventory(page, name);

    await openAdjust(page, name);
    await page.getByRole('button', { name: /^Daño/ }).click();
    await page.fill('input#quantity', '5');
    await page.getByRole('button', { name: 'Confirmar Ajuste' }).click();
    await expect(rowOf(page, name).getByText('5', { exact: true })).toBeVisible();

    await openAdjust(page, name);
    await page.getByRole('button', { name: /^Devolución/ }).click();
    await page.fill('input#quantity', '3');
    await page.getByRole('button', { name: 'Confirmar Ajuste' }).click();
    await expect(rowOf(page, name).getByText('8', { exact: true })).toBeVisible();
  });

  test('blocks an OUT adjustment larger than the available stock', async ({ page, request }) => {
    const { name } = await seedProduct(request, { stock_quantity: 10 });
    await openInventory(page, name);

    await openAdjust(page, name);
    await page.getByRole('button', { name: /^Salida/ }).click();
    await page.fill('input#quantity', '999');

    await expect(page.getByText('Cantidad excede el stock disponible (10)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar Ajuste' })).toBeDisabled();
  });

  test('records the adjustment in the movements tab', async ({ page, request }) => {
    const { name } = await seedProduct(request, { stock_quantity: 10 });
    const reference = `REF-${Date.now()}`;
    await openInventory(page, name);

    await openAdjust(page, name);
    await page.getByRole('button', { name: /^Entrada/ }).click();
    await page.fill('input#quantity', '7');
    await page.fill('input#reference', reference);
    await page.getByRole('button', { name: 'Confirmar Ajuste' }).click();
    await expect(page.getByRole('heading', { name: 'Ajustar Stock' })).toBeHidden();

    await page.getByRole('button', { name: /^Movimientos/ }).click();
    await expect(page.getByRole('table')).toBeHidden();
    const movement = page.locator('div.rounded-lg').filter({ hasText: reference });
    await expect(movement.first()).toContainText(name);
    await expect(movement.first()).toContainText('Entrada');
    await expect(movement.first()).toContainText('+7');

    await page.getByRole('button', { name: 'Stock', exact: true }).click();
    await expect(page.getByRole('table')).toBeVisible();
  });
});

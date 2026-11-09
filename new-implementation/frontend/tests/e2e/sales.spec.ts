import { test, expect, type Page } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';
import { API_BASE_URL, apiSession, seedProduct } from './helpers/api.helper';

const card = (page: Page, name: string) =>
  page.getByTestId('product-card').filter({ hasText: name });
const cart = (page: Page) => page.getByTestId('cart-panel');

async function openSales(page: Page) {
  await page.goto('/sales');
  await page.waitForLoadState('networkidle');
}

test.describe('Sales cart', () => {
  test.beforeEach(async ({ page }) => {
    await new AuthHelper(page).login();
  });

  test('adds products to the cart and totals them', async ({ page, request }) => {
    const a = await seedProduct(request, { price: 10000 });
    const b = await seedProduct(request, { price: 20000 });
    await openSales(page);

    await card(page, a.name).click();
    await card(page, b.name).click();

    await expect(cart(page).getByText('Carrito · 2 items')).toBeVisible();
    await expect(cart(page).getByText(a.name)).toBeVisible();
    await expect(cart(page).getByText(b.name)).toBeVisible();
    // 30.000 subtotal + 19% IVA (5.700) = 35.700
    await expect(cart(page).getByText(/^\$\s?30\.000$/)).toBeVisible();
    await expect(cart(page).getByText('IVA (19%)')).toBeVisible();
    await expect(cart(page).getByText(/^\$\s?5\.700$/)).toBeVisible();
    await expect(cart(page).getByTestId('cobrar-button')).toContainText('35.700');
  });

  test('increases and decreases the quantity of a line', async ({ page, request }) => {
    const { name } = await seedProduct(request, { price: 10000, stock_quantity: 5 });
    await openSales(page);
    await card(page, name).click();
    const line = cart(page).locator('div.border-b').filter({ hasText: name });

    await line.locator('button').nth(1).click(); // plus
    await expect(line.getByText('2', { exact: true })).toBeVisible();
    await expect(cart(page).getByTestId('cobrar-button')).toContainText('23.800');

    await line.locator('button').nth(0).click(); // minus
    await expect(line.getByText('1', { exact: true })).toBeVisible();
    await expect(cart(page).getByTestId('cobrar-button')).toContainText('11.900');
  });

  test('cannot add more units than the stock available', async ({ page, request }) => {
    const { name } = await seedProduct(request, { stock_quantity: 1 });
    await openSales(page);
    await card(page, name).click();
    const line = cart(page).locator('div.border-b').filter({ hasText: name });

    await expect(line.locator('button').nth(1)).toBeDisabled();
  });

  test('disables a product with no stock', async ({ page, request }) => {
    const { name } = await seedProduct(request, { stock_quantity: 0 });
    await openSales(page);

    await expect(card(page, name)).toBeDisabled();
    await expect(card(page, name)).toContainText('Sin stock');
  });

  test('removes a line from the cart', async ({ page, request }) => {
    const { name } = await seedProduct(request);
    await openSales(page);
    await card(page, name).click();
    await expect(cart(page).getByText(name)).toBeVisible();

    await cart(page).locator('div.border-b').filter({ hasText: name }).locator('button').last().click();

    await expect(cart(page).getByText('Agrega productos al carrito')).toBeVisible();
    await expect(cart(page).getByTestId('cobrar-button')).toBeDisabled();
  });

  test('clears the whole cart after confirming', async ({ page, request }) => {
    const { name } = await seedProduct(request);
    await openSales(page);
    await card(page, name).click();

    page.once('dialog', (dialog) => dialog.accept());
    await cart(page).getByRole('button', { name: 'Limpiar carrito' }).click();

    await expect(cart(page).getByText('Carrito · 0 items')).toBeVisible();
  });

  test('selects a customer for the sale', async ({ page, request }) => {
    const { headers } = await apiSession(request);
    const name = `E2E Cliente Venta ${Date.now()}`;
    const res = await request.post(`${API_BASE_URL}/customers`, {
      headers,
      data: { name, email: `venta${Date.now()}@example.com` },
    });
    expect(res.ok()).toBeTruthy();
    await openSales(page);

    await cart(page).getByRole('button', { name: 'Buscar cliente...' }).click();
    await page.getByPlaceholder('Buscar por nombre, email o teléfono...').fill(name);
    await page.getByText(name).click();

    await expect(cart(page).getByText(name)).toBeVisible();
    await expect(cart(page).getByRole('button', { name: 'Buscar cliente...' })).toHaveCount(0);
  });

  test('switches the payment method between cash and card', async ({ page, request }) => {
    const { name } = await seedProduct(request);
    await openSales(page);
    await card(page, name).click();
    await page.getByTestId('cobrar-button').click();
    await expect(page.getByText('Total a cobrar')).toBeVisible();

    await expect(page.getByText('Efectivo recibido')).toBeVisible();

    await page.getByRole('button', { name: /Tarjeta/ }).click();
    await expect(page.getByText('Procesa el pago en el terminal')).toBeVisible();
    await expect(page.getByText('Efectivo recibido')).toBeHidden();

    await page.getByRole('button', { name: /Efectivo/ }).click();
    await expect(page.getByText('Efectivo recibido')).toBeVisible();
  });
});

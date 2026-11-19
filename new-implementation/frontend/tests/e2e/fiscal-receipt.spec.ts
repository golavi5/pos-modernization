import { test, expect, type Page } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

/**
 * SPEC-FISC-003 T-08: the electronic-document status on the payment success screen.
 * The status endpoint is mocked: the CI stack has no Plemsi, so the real answer is
 * always `not_applicable` (covered by the last test).
 */
async function sellOneItem(page: Page) {
  await page.waitForSelector('[data-testid="product-card"]:not([disabled])');
  await page.click('[data-testid="product-card"]:not([disabled])');
  await page.click('[data-testid="cobrar-button"]');
  await page.locator('button').filter({ hasText: /\$100k/ }).click();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 8000 });
}

test.describe('Receipt: electronic document status', () => {
  test.beforeEach(async ({ page }) => {
    await new AuthHelper(page).login();
    await page.goto('/sales');
  });

  test('a validated document shows its number and CUFE', async ({ page }) => {
    await page.route('**/fiscal/v1/sales/*/status', (route) =>
      route.fulfill({ json: { status: 'validated', prefix: 'POS', number: 5, cufe: 'cufe-abc-123', qr: null } }),
    );
    await sellOneItem(page);
    const line = page.locator('[data-testid="fiscal-status"]');
    await expect(line).toContainText('Validada por la DIAN');
    await expect(line).toContainText('POS5');
    await expect(line).toContainText('cufe-abc-123');
  });

  test('a pending document says "pending validation"', async ({ page }) => {
    await page.route('**/fiscal/v1/sales/*/status', (route) => route.fulfill({ json: { status: 'pending' } }));
    await sellOneItem(page);
    await expect(page.locator('[data-testid="fiscal-status"]')).toContainText('Pendiente de validación');
  });

  test('when fiscal is not in use, or the status cannot be read, nothing is shown and the sale still closes', async ({ page }) => {
    await sellOneItem(page); // real backend: not_applicable
    await expect(page.locator('[data-testid="fiscal-status"]')).toHaveCount(0);
  });
});

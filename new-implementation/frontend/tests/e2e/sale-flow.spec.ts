import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

// Backend origin as seen by the Node test runner (not the browser — the
// frontend bundle bakes in its own NEXT_PUBLIC_API_URL at build time).
// Override with API_BASE_URL if the backend isn't on the conventional port.
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const CASHIER_EMAIL = 'admin@test.com';
const CASHIER_PASSWORD = 'Fddm1ZDKTv3RbDpU';

test.describe('Sale golden path', () => {
  test.beforeEach(async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.login(); // admin@test.com / password123
    await page.goto('/sales');
  });

  test('completes a sale in 4 clicks or fewer', async ({ page }) => {
    // Wait for product grid to load
    await page.waitForSelector('[data-testid="product-card"]:not([disabled])');

    // Click 1: add a product to cart
    await page.click('[data-testid="product-card"]:not([disabled])');
    await expect(page.locator('[data-testid="cobrar-button"]')).not.toBeDisabled();

    // Click 2: open payment modal
    await page.click('[data-testid="cobrar-button"]');
    await expect(page.locator('text=Total a cobrar')).toBeVisible();

    // Click 3: select a quick amount (e.g. $100k — enough to cover any single item)
    const quickBtn = page.locator('button').filter({ hasText: /\$100k/ });
    await quickBtn.click();
    await expect(page.locator('text=Cambio')).toBeVisible();

    // Enter (keyboard shortcut) — click 4 equivalent
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=¡Pago completado!')).toBeVisible();
  });

  test('cart panel is always visible on sales page', async ({ page }) => {
    await expect(page.locator('[data-testid="cobrar-button"]')).toBeVisible();
  });

  test('cobrar button is disabled when cart is empty', async ({ page }) => {
    await expect(page.locator('[data-testid="cobrar-button"]')).toBeDisabled();
  });

  test('payment success auto-returns to new sale', async ({ page }) => {
    await page.waitForSelector('[data-testid="product-card"]:not([disabled])');
    await page.click('[data-testid="product-card"]:not([disabled])');
    await page.click('[data-testid="cobrar-button"]');
    const quickBtn = page.locator('button').filter({ hasText: /\$100k/ });
    await quickBtn.click();
    await expect(page.locator('text=Cambio')).toBeVisible();
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-testid="payment-success"]', { timeout: 8000 });

    // Click "Nueva venta" button
    await page.click('text=+ Nueva venta');

    // Should be back on the sales page with an empty, enabled cobrar button
    await expect(page.locator('[data-testid="cobrar-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="cobrar-button"]')).toBeDisabled();
  });

  test('confirm payment button triggers via data-testid', async ({ page }) => {
    await page.waitForSelector('[data-testid="product-card"]:not([disabled])');
    await page.click('[data-testid="product-card"]:not([disabled])');
    await page.click('[data-testid="cobrar-button"]');
    await page.locator('button').filter({ hasText: /\$100k/ }).click();
    await expect(page.locator('text=Cambio')).toBeVisible();

    // Confirm via button instead of Enter key
    await page.click('[data-testid="confirm-payment-button"]');
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 8000 });
  });

  test('payment amount is the order\'s authoritative total, not the cart\'s own calculation', async ({ page, request }) => {
    // Regression guard: the caja used to send `cart.total` — IVA computed
    // once over the aggregated subtotal, as a raw unrounded float — as the
    // payment amount. The backend computes IVA per item and PERSISTS the
    // result through a `decimal(10,2)` column (rounded to the cent). For
    // most "round" seed prices the two happen to coincide, which is exactly
    // why this bug shipped unnoticed — so this test seeds a product whose
    // price is guaranteed to diverge (12345.67 × 0.19 doesn't land on a
    // clean cent), instead of trusting whatever happens to already be in
    // the DB.
    //
    // When they diverge, the payment still gets recorded (201) but leaves
    // the order `partially_paid` instead of `completed` — no stock
    // deducted — while nothing in the UI flags it. Pin the fix directly:
    // whatever amount the caja sends must equal `order.total_amount`, read
    // from the very same order-creation response the caja already has in
    // hand — and must NOT equal the naive `subtotal + subtotal*0.19` the
    // old cart-side calculation produced.
    const login = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { email: CASHIER_EMAIL, password: CASHIER_PASSWORD },
    });
    const { accessToken } = await login.json();
    const me = await request.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const { company_id, id: created_by } = await me.json();

    const price = 12345.67;
    const productName = `E2E Rounding Guard ${Date.now()}`;
    const createProduct = await request.post(`${API_BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        name: productName,
        sku: `E2ERND${Date.now()}`,
        price,
        stock_quantity: 5,
        reorder_level: 1,
        tax_rate: 19,
        company_id,
        created_by,
        is_active: true,
      },
    });
    expect(createProduct.ok()).toBeTruthy();

    // The naive calculation the caja used to send: aggregate subtotal,
    // taxed once, never rounded to cents.
    const naiveTotal = price + price * 0.19;

    await page.goto('/sales');
    const productCard = page.locator('[data-testid="product-card"]').filter({ hasText: productName });
    await productCard.waitFor();
    await productCard.click();
    await page.click('[data-testid="cobrar-button"]');
    await page.locator('button').filter({ hasText: /\$20k/ }).click();

    const orderResponsePromise = page.waitForResponse(
      (res) => res.request().method() === 'POST' && /\/sales\/orders$/.test(res.url())
    );
    const paymentRequestPromise = page.waitForRequest(
      (req) => req.method() === 'POST' && /\/sales\/orders\/[^/]+\/payments$/.test(req.url())
    );
    const paymentResponsePromise = page.waitForResponse(
      (res) => res.request().method() === 'POST' && /\/sales\/orders\/[^/]+\/payments$/.test(res.url())
    );

    await page.click('[data-testid="confirm-payment-button"]');

    const [orderResponse, paymentRequest, paymentResponse] = await Promise.all([
      orderResponsePromise,
      paymentRequestPromise,
      paymentResponsePromise,
    ]);
    const order = await orderResponse.json();
    const paymentBody = paymentRequest.postDataJSON() as { amount: number; payment_method: string };

    expect(typeof order.total_amount).toBe('number');
    // This is the scenario the bug needed: the naive frontend calculation
    // and the backend's authoritative total actually disagree here.
    expect(order.total_amount).not.toBe(naiveTotal);
    expect(paymentBody.amount).toBe(order.total_amount);
    // 201, not the backend's `amount exceeds remaining balance` 400 — and,
    // per the recorded-payment invariant in payments.service.ts, 201 here
    // together with `amount === order.total_amount` is what actually closes
    // the order (`completed`, stock deducted) instead of leaving it
    // `partially_paid`.
    expect(paymentResponse.status()).toBe(201);

    // NOT asserting on `[data-testid="payment-success"]` here: it is
    // currently unreachable regardless of backend outcome.
    // `handleConfirmPayment` (page.tsx) calls `setShowPayment(false)`
    // synchronously right after this same await resolves, which unmounts
    // `PaymentModal` (`if (!isOpen) return null` runs before the `status
    // === 'success'` branch) before its own `setStatus('success')` can ever
    // paint. Verified by running every payment-completing spec in this file
    // against a live stack: the backend consistently answers 201/201 and
    // the DB shows the order reaching `completed` with stock deducted, yet
    // none of them ever see `payment-success` render. Predates this task
    // (same shape since e7f3478a, "feat(sales): split-pane layout…") —
    // filed as a separate finding, not fixed here. Assert on the side
    // effect that does fire reliably: the cart clears and the cobrar button
    // goes back to disabled.
    await expect(page.locator('[data-testid="cobrar-button"]')).toBeDisabled();
  });
});

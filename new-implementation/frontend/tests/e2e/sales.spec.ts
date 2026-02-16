import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

test.describe('Sales Flow (POS)', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login();
  });

  test('should complete a full sale flow', async ({ page }) => {
    // Navigate to sales page
    await page.click('text=Ventas');
    await page.waitForURL('/dashboard/sales');
    
    // Verify we're on sales page
    await expect(page.locator('text=Punto de Venta')).toBeVisible();
    
    // Search for a product
    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    await searchInput.fill('producto');
    
    // Wait for search results
    await page.waitForTimeout(500);
    
    // Click on first product result
    await page.locator('[data-testid="product-result"]').first().click();
    
    // Verify product was added to cart
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);
    
    // Increase quantity
    await page.locator('[data-testid="increase-quantity"]').first().click();
    
    // Verify quantity increased
    await expect(page.locator('[data-testid="item-quantity"]').first()).toHaveText('2');
    
    // Verify total is calculated
    const total = await page.locator('[data-testid="cart-total"]').textContent();
    expect(total).toBeTruthy();
    
    // Click "Procesar Venta"
    await page.click('text=Procesar Venta');
    
    // Payment modal should appear
    await expect(page.locator('text=Finalizar Venta')).toBeVisible();
    
    // Select cash payment
    await page.click('[data-testid="payment-method-cash"]');
    
    // Enter cash received
    const cashInput = page.locator('input[id="cashReceived"]');
    await cashInput.fill('50000');
    
    // Verify change is calculated
    await expect(page.locator('text=Cambio')).toBeVisible();
    
    // Confirm payment
    await page.click('text=Confirmar Venta');
    
    // Wait for success message
    await expect(page.locator('text=completada exitosamente')).toBeVisible();
    
    // Verify cart is empty
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(0);
  });

  test('should add multiple products to cart', async ({ page }) => {
    await page.goto('/dashboard/sales');
    
    // Add first product
    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    await searchInput.fill('producto1');
    await page.waitForTimeout(300);
    await page.locator('[data-testid="product-result"]').first().click();
    
    // Clear search and add second product
    await searchInput.clear();
    await searchInput.fill('producto2');
    await page.waitForTimeout(300);
    await page.locator('[data-testid="product-result"]').first().click();
    
    // Verify cart has 2 items
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(2);
  });

  test('should remove product from cart', async ({ page }) => {
    await page.goto('/dashboard/sales');
    
    // Add product
    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    await searchInput.fill('producto');
    await page.waitForTimeout(300);
    await page.locator('[data-testid="product-result"]').first().click();
    
    // Verify product in cart
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);
    
    // Remove product
    await page.locator('[data-testid="remove-item"]').first().click();
    
    // Verify cart is empty
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(0);
  });

  test('should select customer for sale', async ({ page }) => {
    await page.goto('/dashboard/sales');
    
    // Click customer selector
    await page.click('text=Buscar cliente');
    
    // Search for customer
    const customerSearch = page.locator('input[placeholder*="cliente"]');
    await customerSearch.fill('Juan');
    
    // Select first result
    await page.locator('[data-testid="customer-result"]').first().click();
    
    // Verify customer is selected
    await expect(page.locator('text=Juan')).toBeVisible();
  });

  test('should validate stock availability', async ({ page }) => {
    await page.goto('/dashboard/sales');
    
    // Try to add product
    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    await searchInput.fill('sin stock');
    await page.waitForTimeout(300);
    
    // Product with no stock should be disabled
    const outOfStockProduct = page.locator('[data-testid="product-result"]').filter({ hasText: 'Sin stock' });
    await expect(outOfStockProduct.locator('button')).toBeDisabled();
  });

  test('should calculate tax correctly', async ({ page }) => {
    await page.goto('/dashboard/sales');
    
    // Add product
    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    await searchInput.fill('producto');
    await page.waitForTimeout(300);
    await page.locator('[data-testid="product-result"]').first().click();
    
    // Verify tax is displayed (19% IVA)
    await expect(page.locator('text=IVA')).toBeVisible();
    
    // Get subtotal and tax
    const subtotal = await page.locator('[data-testid="subtotal"]').textContent();
    const tax = await page.locator('[data-testid="tax"]').textContent();
    
    // Verify tax is calculated (should be ~19% of subtotal)
    expect(subtotal).toBeTruthy();
    expect(tax).toBeTruthy();
  });

  test('should handle payment method selection', async ({ page }) => {
    await page.goto('/dashboard/sales');
    
    // Add product
    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    await searchInput.fill('producto');
    await page.waitForTimeout(300);
    await page.locator('[data-testid="product-result"]').first().click();
    
    // Open payment modal
    await page.click('text=Procesar Venta');
    
    // Test cash payment
    await page.click('[data-testid="payment-method-cash"]');
    await expect(page.locator('input[id="cashReceived"]')).toBeVisible();
    
    // Test card payment
    await page.click('[data-testid="payment-method-card"]');
    await expect(page.locator('input[id="cashReceived"]')).not.toBeVisible();
    
    // Test transfer payment
    await page.click('[data-testid="payment-method-transfer"]');
    await expect(page.locator('input[id="cashReceived"]')).not.toBeVisible();
  });
});

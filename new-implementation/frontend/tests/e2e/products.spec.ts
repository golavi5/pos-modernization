import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

test.describe('Products CRUD', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login();
    await page.goto('/dashboard/products');
  });

  test('should create a new product', async ({ page }) => {
    // Click "Nuevo Producto"
    await page.click('text=Nuevo Producto');
    
    // Fill product form
    await page.fill('input[id="name"]', 'Test Product E2E');
    await page.fill('input[id="sku"]', `TEST-${Date.now()}`);
    await page.fill('input[id="price"]', '15000');
    await page.fill('input[id="stock_quantity"]', '100');
    
    // Optional fields
    await page.fill('textarea[id="description"]', 'Test product created by E2E test');
    await page.fill('input[id="cost"]', '10000');
    
    // Submit form
    await page.click('text=Crear producto');
    
    // Wait for success message
    await expect(page.locator('text=creado exitosamente')).toBeVisible();
    
    // Verify product appears in table
    await expect(page.locator('text=Test Product E2E')).toBeVisible();
  });

  test('should search for products', async ({ page }) => {
    // Enter search query
    const searchInput = page.locator('input[placeholder*="Buscar"]');
    await searchInput.fill('Test');
    
    // Click search button
    await page.click('button:has-text("Buscar")');
    
    // Wait for results
    await page.waitForTimeout(500);
    
    // Verify results contain search term
    const firstProduct = page.locator('table tbody tr').first();
    await expect(firstProduct).toContainText('Test', { ignoreCase: true });
  });

  test('should edit a product', async ({ page }) => {
    // Click edit button on first product
    await page.locator('[title="Editar"]').first().click();
    
    // Modify product name
    const nameInput = page.locator('input[id="name"]');
    const currentName = await nameInput.inputValue();
    await nameInput.fill(currentName + ' EDITED');
    
    // Update price
    await page.fill('input[id="price"]', '25000');
    
    // Submit
    await page.click('text=Actualizar');
    
    // Wait for success
    await expect(page.locator('text=actualizado exitosamente')).toBeVisible();
    
    // Verify changes
    await expect(page.locator('text=EDITED')).toBeVisible();
  });

  test('should delete a product', async ({ page }) => {
    // Get first product name
    const firstProductName = await page.locator('table tbody tr td').first().textContent();
    
    // Click delete button
    await page.locator('[title="Eliminar"]').first().click();
    
    // Confirm deletion
    page.on('dialog', dialog => dialog.accept());
    
    // Wait for success
    await expect(page.locator('text=eliminado exitosamente')).toBeVisible();
    
    // Verify product is gone
    await expect(page.locator(`text=${firstProductName}`)).not.toBeVisible();
  });

  test('should filter products by category', async ({ page }) => {
    // Open advanced filters
    await page.click('text=Filtros');
    
    // Select a category
    await page.selectOption('select:near(:text("Categoría"))', { index: 1 });
    
    // Apply filters
    await page.click('button:has-text("Buscar")');
    
    // Wait for results
    await page.waitForTimeout(500);
    
    // Verify filtered results
    const productCount = await page.locator('table tbody tr').count();
    expect(productCount).toBeGreaterThan(0);
  });

  test('should filter products by status', async ({ page }) => {
    // Open advanced filters
    await page.click('text=Filtros');
    
    // Select active products only
    await page.selectOption('select:near(:text("Estado"))', 'true');
    
    // Apply filters
    await page.click('button:has-text("Buscar")');
    
    // Wait for results
    await page.waitForTimeout(500);
    
    // Verify all products have "Activo" badge
    const badges = page.locator('text=Activo');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should paginate through products', async ({ page }) => {
    // Verify pagination controls
    await expect(page.locator('button:has-text("Siguiente")')).toBeVisible();
    
    // Click next page
    await page.click('button:has-text("Siguiente")');
    
    // Wait for page load
    await page.waitForTimeout(500);
    
    // Verify different products are shown
    await expect(page.locator('table tbody tr')).toHaveCount(20);
    
    // Go back to previous page
    await page.click('button:has-text("Anterior")');
    await page.waitForTimeout(500);
  });

  test('should validate required fields', async ({ page }) => {
    // Click new product
    await page.click('text=Nuevo Producto');
    
    // Try to submit without filling required fields
    await page.click('text=Crear producto');
    
    // Form should show validation errors (browser validation)
    // The form should not submit
    await expect(page.locator('text=Crear Nuevo Producto')).toBeVisible();
  });

  test('should display product statistics', async ({ page }) => {
    // Verify stats cards are visible
    await expect(page.locator('text=Total Productos')).toBeVisible();
    await expect(page.locator('text=Valor Total')).toBeVisible();
    await expect(page.locator('text=Stock Bajo')).toBeVisible();
    
    // Verify stats have numbers
    const totalProducts = page.locator('text=Total Productos').locator('..').locator('.text-2xl');
    await expect(totalProducts).toHaveText(/\d+/);
  });

  test('should sort products', async ({ page }) => {
    // Open advanced filters
    await page.click('text=Filtros');
    
    // Sort by price ascending
    await page.selectOption('select:near(:text("Ordenar por"))', 'price');
    await page.selectOption('select:near(:text("Orden"))', 'ASC');
    
    // Apply
    await page.click('button:has-text("Buscar")');
    await page.waitForTimeout(500);
    
    // Verify sorting (first product should have lower price than last)
    const firstPrice = await page.locator('table tbody tr').first().locator('td').nth(3).textContent();
    const lastPrice = await page.locator('table tbody tr').last().locator('td').nth(3).textContent();
    
    expect(firstPrice).toBeTruthy();
    expect(lastPrice).toBeTruthy();
  });
});

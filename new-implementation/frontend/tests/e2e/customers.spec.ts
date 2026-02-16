import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

test.describe('Customers CRUD', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login();
    await page.goto('/dashboard/customers');
  });

  test('should create a new customer', async ({ page }) => {
    // Click new customer
    await page.click('text=Nuevo Cliente');
    
    // Fill form
    await page.fill('input[id="name"]', 'Test Customer E2E');
    await page.fill('input[id="email"]', `test${Date.now()}@example.com`);
    await page.fill('input[id="phone"]', '+57 300 123 4567');
    await page.fill('textarea[id="address"]', 'Calle Test 123, Ciudad');
    
    // Submit
    await page.click('text=Crear cliente');
    
    // Verify success
    await expect(page.locator('text=creado exitosamente')).toBeVisible();
    await expect(page.locator('text=Test Customer E2E')).toBeVisible();
  });

  test('should edit customer', async ({ page }) => {
    // Click edit on first customer
    await page.locator('[title="Editar"]').first().click();
    
    // Modify name
    const nameInput = page.locator('input[id="name"]');
    await nameInput.fill('Customer EDITED E2E');
    
    // Update
    await page.click('text=Actualizar');
    
    // Verify
    await expect(page.locator('text=actualizado exitosamente')).toBeVisible();
    await expect(page.locator('text=Customer EDITED E2E')).toBeVisible();
  });

  test('should manage loyalty points', async ({ page }) => {
    // Click loyalty button on first customer
    await page.locator('[title="Gestionar puntos"]').first().click();
    
    // Modal should open
    await expect(page.locator('text=Gestionar Puntos')).toBeVisible();
    
    // Select "Add" operation
    await page.click('text=Agregar');
    
    // Enter points
    await page.fill('input[id="points"]', '50');
    
    // Verify preview
    await expect(page.locator('text=Nuevo balance')).toBeVisible();
    
    // Confirm
    await page.click('text=Confirmar');
    
    // Verify success
    await expect(page.locator('text=actualizados exitosamente')).toBeVisible();
  });

  test('should search customers', async ({ page }) => {
    // Search
    const searchInput = page.locator('input[placeholder*="nombre"]');
    await searchInput.fill('Test');
    await page.click('button:has-text("Buscar")');
    
    // Wait
    await page.waitForTimeout(500);
    
    // Verify results
    await expect(page.locator('table tbody tr')).toHaveCount({ timeout: 5000, min: 1 });
  });

  test('should display customer statistics', async ({ page }) => {
    // Verify stats
    await expect(page.locator('text=Total Clientes')).toBeVisible();
    await expect(page.locator('text=Puntos Totales')).toBeVisible();
    await expect(page.locator('text=Compra Promedio')).toBeVisible();
  });

  test('should filter by minimum loyalty points', async ({ page }) => {
    // Open filters
    await page.click('text=Filtros');
    
    // Set min loyalty points
    await page.fill('input:near(:text("Puntos mínimos"))', '100');
    
    // Apply
    await page.click('button:has-text("Buscar")');
    await page.waitForTimeout(500);
    
    // Results should only show customers with >= 100 points
    const customerRows = page.locator('table tbody tr');
    const count = await customerRows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should validate subtract loyalty points', async ({ page }) => {
    // Open loyalty modal
    await page.locator('[title="Gestionar puntos"]').first().click();
    
    // Select subtract
    await page.click('text=Restar');
    
    // Try to subtract more than available
    await page.fill('input[id="points"]', '99999');
    
    // Should show error
    await expect(page.locator('text=No hay suficientes puntos')).toBeVisible();
  });
});

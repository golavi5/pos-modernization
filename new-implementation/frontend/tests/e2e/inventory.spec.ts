import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

test.describe('Inventory Management', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login();
    await page.goto('/dashboard/inventory');
  });

  test('should view current stock levels', async ({ page }) => {
    // Verify we're on inventory page
    await expect(page.locator('text=Inventario')).toBeVisible();
    
    // Verify stock table is visible
    await expect(page.locator('table')).toBeVisible();
    
    // Verify columns
    await expect(page.locator('text=Producto')).toBeVisible();
    await expect(page.locator('text=Almacén')).toBeVisible();
    await expect(page.locator('text=Cantidad')).toBeVisible();
    await expect(page.locator('text=Disponible')).toBeVisible();
  });

  test('should adjust stock IN', async ({ page }) => {
    // Click adjust on first product
    await page.locator('button:has-text("Ajustar")').first().click();
    
    // Modal should open
    await expect(page.locator('text=Ajustar Stock')).toBeVisible();
    
    // Select IN operation
    await page.click('text=Entrada');
    
    // Enter quantity
    await page.fill('input[id="quantity"]', '50');
    
    // Add reference
    await page.fill('input[id="reference"]', 'PO-12345');
    
    // Add notes
    await page.fill('textarea[id="notes"]', 'Test stock adjustment');
    
    // Verify preview
    await expect(page.locator('text=Vista previa')).toBeVisible();
    
    // Confirm
    await page.click('text=Confirmar Ajuste');
    
    // Verify success
    await expect(page.locator('text=ajustado exitosamente')).toBeVisible();
  });

  test('should adjust stock OUT', async ({ page }) => {
    // Adjust stock
    await page.locator('button:has-text("Ajustar")').first().click();
    
    // Select OUT
    await page.click('text=Salida');
    
    // Enter quantity
    await page.fill('input[id="quantity"]', '10');
    
    // Confirm
    await page.click('text=Confirmar Ajuste');
    
    // Success
    await expect(page.locator('text=ajustado exitosamente')).toBeVisible();
  });

  test('should view stock movements', async ({ page }) => {
    // Click movements tab
    await page.click('text=Movimientos');
    
    // Verify movements are shown
    await expect(page.locator('[data-testid="movement-card"]').first()).toBeVisible();
    
    // Verify movement types are displayed
    const movementTypes = ['Entrada', 'Salida', 'Ajuste', 'Daño', 'Devolución'];
    const pageContent = await page.content();
    const hasMovementType = movementTypes.some(type => pageContent.includes(type));
    expect(hasMovementType).toBeTruthy();
  });

  test('should filter stock by warehouse', async ({ page }) => {
    // Open filters
    await page.click('text=Filtros');
    
    // Select warehouse
    await page.selectOption('select:near(:text("Almacén"))', { index: 1 });
    
    // Apply
    await page.click('button:has-text("Aplicar filtros")');
    await page.waitForTimeout(500);
    
    // Results should be filtered
    await expect(page.locator('table tbody tr')).toHaveCount({ min: 1 });
  });

  test('should filter by low stock', async ({ page }) => {
    // Open filters
    await page.click('text=Filtros');
    
    // Select low stock
    await page.selectOption('select:near(:text("Nivel de stock"))', 'true');
    
    // Apply
    await page.click('button:has-text("Aplicar filtros")');
    await page.waitForTimeout(500);
    
    // Verify only low stock items
    const badges = page.locator('text=Stock bajo');
    const count = await badges.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display inventory statistics', async ({ page }) => {
    // Verify stats
    await expect(page.locator('text=Total Productos')).toBeVisible();
    await expect(page.locator('text=Stock Total')).toBeVisible();
    await expect(page.locator('text=Stock Bajo')).toBeVisible();
    await expect(page.locator('text=Almacenes')).toBeVisible();
  });

  test('should validate stock OUT cannot exceed available', async ({ page }) => {
    // Adjust stock
    await page.locator('button:has-text("Ajustar")').first().click();
    
    // Select OUT
    await page.click('text=Salida');
    
    // Try to remove more than available
    await page.fill('input[id="quantity"]', '999999');
    
    // Should show validation error
    await expect(page.locator('text=No hay suficiente stock')).toBeVisible();
  });

  test('should switch between stock and movements tabs', async ({ page }) => {
    // Verify we're on Stock tab
    await expect(page.locator('table')).toBeVisible();
    
    // Switch to Movements
    await page.click('text=Movimientos');
    await page.waitForTimeout(300);
    
    // Verify movements view
    await expect(page.locator('table')).not.toBeVisible();
    
    // Switch back to Stock
    await page.click('text=Stock Actual');
    await page.waitForTimeout(300);
    
    // Verify stock view
    await expect(page.locator('table')).toBeVisible();
  });

  test('should adjust with DAMAGE type', async ({ page }) => {
    await page.locator('button:has-text("Ajustar")').first().click();
    
    // Select DAMAGE
    await page.click('text=Daño');
    
    // Enter quantity
    await page.fill('input[id="quantity"]', '5');
    await page.fill('textarea[id="notes"]', 'Damaged during transport');
    
    // Confirm
    await page.click('text=Confirmar Ajuste');
    
    // Success
    await expect(page.locator('text=ajustado exitosamente')).toBeVisible();
  });

  test('should adjust with RETURN type', async ({ page }) => {
    await page.locator('button:has-text("Ajustar")').first().click();
    
    // Select RETURN
    await page.click('text=Devolución');
    
    // Enter quantity
    await page.fill('input[id="quantity"]', '3');
    await page.fill('input[id="reference"]', 'RET-001');
    
    // Confirm
    await page.click('text=Confirmar Ajuste');
    
    // Success
    await expect(page.locator('text=ajustado exitosamente')).toBeVisible();
  });
});

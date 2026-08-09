import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

/**
 * The header badge promises ⌘K. Before this suite existed the badge sat on a
 * non-interactive div and the shortcut did nothing — these tests exist so that
 * cannot regress silently.
 */
test.describe('Command palette (⌘K)', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login();
  });

  test('opens with the keyboard shortcut the badge advertises', async ({ page }) => {
    await expect(page.getByTestId('command-palette')).toBeHidden();

    await page.keyboard.press('ControlOrMeta+k');

    await expect(page.getByTestId('command-palette')).toBeVisible();
  });

  test('opens by clicking the header search affordance', async ({ page }) => {
    await page.getByTestId('command-palette-trigger').click();

    await expect(page.getByTestId('command-palette')).toBeVisible();
  });

  test('filters the list as the user types', async ({ page }) => {
    await page.getByTestId('command-palette-trigger').click();

    const options = page.getByRole('option');
    const total = await options.count();
    expect(total).toBeGreaterThan(1);

    // 'vent' deliberately not used here: it matches Ventas AND inVENTory,
    // since the filter is a substring match over label and route alike.
    await page.keyboard.type('ventas');

    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText('/sales');
  });

  test('matches despite a missing accent', async ({ page }) => {
    await page.getByTestId('command-palette-trigger').click();
    await page.keyboard.type('configuracion');

    await expect(page.getByRole('option').first()).toContainText('/settings');
  });

  test('navigates to the highlighted route on Enter', async ({ page }) => {
    await page.getByTestId('command-palette-trigger').click();
    await page.keyboard.type('ventas');
    await page.keyboard.press('Enter');

    await page.waitForURL('**/sales');
    await expect(page.getByTestId('command-palette')).toBeHidden();
  });

  test('navigates on click', async ({ page }) => {
    await page.getByTestId('command-palette-trigger').click();
    await page.keyboard.type('client');
    await page.getByRole('option').first().click();

    await page.waitForURL('**/customers');
  });

  test('closes on Escape without navigating', async ({ page }) => {
    const before = page.url();
    await page.getByTestId('command-palette-trigger').click();
    await page.keyboard.press('Escape');

    await expect(page.getByTestId('command-palette')).toBeHidden();
    expect(page.url()).toBe(before);
  });

  test('shows an empty state rather than a blank list', async ({ page }) => {
    await page.getByTestId('command-palette-trigger').click();
    await page.keyboard.type('zzzzzz');

    await expect(page.getByRole('option')).toHaveCount(0);
    await expect(page.getByTestId('command-palette')).toContainText(/Sin resultados|No results/);
  });

  test('Enter is inert when nothing matches', async ({ page }) => {
    const before = page.url();
    await page.getByTestId('command-palette-trigger').click();
    await page.keyboard.type('zzzzzz');
    await page.keyboard.press('Enter');

    expect(page.url()).toBe(before);
  });
});

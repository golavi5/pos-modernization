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

  test('returns focus to the trigger after Escape', async ({ page }) => {
    await page.getByTestId('command-palette-trigger').click();
    await expect(page.getByTestId('command-palette')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByTestId('command-palette-trigger')).toBeFocused();
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

  test('does not surface routes the sidebar hides from a restricted role', async ({ page }) => {
    // `buildCommandItems` filters through the same `canAccessRoute` policy the
    // sidebar uses (lib/auth/roles.ts) specifically so the palette can't become
    // a way around the UI's own role gating. Per ROUTE_ROLES, `cashier` can
    // reach /sales but not /users — that's the pairing this test locks in.
    const email = `palette-rbac-${Date.now()}@test.com`;
    const password = 'CashierPass1!';

    await page.goto('/users');
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    // Scoped to the form: the users table above it already renders "cashier"
    // role badges for seeded users, which would otherwise make this a
    // strict-mode-violating multi-match.
    const form = page.locator('#user-form');
    await form.getByLabel('Nombre completo').fill('Palette RBAC Cashier');
    await form.getByLabel('Email').fill(email);
    await form.getByLabel('Contraseña').fill(password);
    await form.getByText(/^cashier$/i).click();
    await page.getByRole('button', { name: 'Guardar' }).click();

    // Switch sessions: clear the admin's auth state and log back in as the
    // freshly-created cashier.
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await authHelper.login(email, password);

    await page.getByTestId('command-palette-trigger').click();
    const results = page.getByRole('option');

    await expect(results.filter({ hasText: '/sales' })).toHaveCount(1);
    await expect(results.filter({ hasText: '/users' })).toHaveCount(0);
  });
});

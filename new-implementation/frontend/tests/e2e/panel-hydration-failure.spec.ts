import { expect, test } from '@playwright/test';

/**
 * Regression cover for the failure paths of the `hasHydrated` gate in
 * `app/(panel)/layout.tsx`.
 *
 * The gate keeps the panel from acting on pre-hydration state — but zustand's
 * persist middleware does not always finish hydrating, and a gate with no
 * failure path renders `null` forever. This exercises the reachable one:
 * an `auth-store` value that fails `JSON.parse`, while a stale `accessToken`
 * cookie is still live (cookies and localStorage have independent lifetimes).
 *
 * Deliberately credential-free — it seeds cookie + storage directly, so it
 * runs against a clean checkout with no backend and no bootstrap admin.
 */
test.describe('(panel) layout — hydration failure paths', () => {
  test('corrupt auth-store lands on /login instead of hanging on a blank page', async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([
      { name: 'accessToken', value: 'stale-but-present', url: baseURL! },
    ]);
    await context.addInitScript(() => {
      window.localStorage.setItem(
        'auth-store',
        '{"state":{"isAuthenticated":true},,,BROKEN'
      );
    });

    await page.goto('/sales');

    // Pre-fix this hung: rehydration threw, `hasHydrated` stayed false, and the
    // layout returned `null` with neither redirect nor error.
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // The stale cookie must be gone, or middleware bounces /login straight
    // back into the panel and the URL flaps forever.
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === 'accessToken')?.value ?? '').toBe('');
  });
});

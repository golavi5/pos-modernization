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
const SEEDED_SESSION = {
  state: {
    isAuthenticated: true,
    user: {
      id: 'e2e-user',
      email: 'e2e@example.com',
      name: 'E2E User',
      company_id: 'e2e-company',
      roles: ['admin'],
    },
    accessToken: 'seeded-token',
    refreshTokenValue: 'seeded-refresh',
  },
  version: 0,
};

test.describe('(panel) layout — hydration', () => {
  test('a hard load into a deep panel route stays on that route', async ({
    context,
    page,
    baseURL,
  }) => {
    // Guards the healthy path: seeded session, cold load, no redirect, panel
    // chrome actually painted. Note it does NOT reproduce the original race
    // (it passes against pre-fix sources too — a cold seeded load hydrates
    // before first render); it exists to catch the healthy path breaking, e.g.
    // `hasHydrated` never arriving. Seeded rather than logged in so it runs
    // with no backend — see §4 of SPEC-FRONT-003.
    await context.addCookies([
      { name: 'accessToken', value: 'seeded-token', url: baseURL! },
    ]);
    await context.addInitScript((session) => {
      window.localStorage.setItem('auth-store', JSON.stringify(session));
    }, SEEDED_SESSION);

    await page.goto('/sales');

    await expect(page).toHaveURL(/\/sales$/);
    // Guard the timing too: with the flag arriving a tick late, the panel
    // would sit on `return null` past first paint even though the URL is right.
    await expect(page.locator('nav, aside').first()).toBeVisible({
      timeout: 10000,
    });
  });

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

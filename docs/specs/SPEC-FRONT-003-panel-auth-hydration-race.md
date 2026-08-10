# M3 — Panel layout auth-hydration race: hard reloads bounce to /dashboard

**Status**: APPROVED — 2026-08-10. Fix built in `app/(panel)/layout.tsx` +
`stores/authStore.ts`. Verified locally: reproduced with request/redirect
tracing (see §2), fix confirmed via the same repro plus 4 consecutive clean
runs of `tests/e2e/sidebar-reachability.spec.ts` (5/5, chromium, locale
pinned) and a logged-out direct-access regression check. Not yet merged — PR
open, unreviewed. Do not treat as DONE until the PR merges with
`Closes POS-FRONT-003`.

One Plane issue (`POS-FRONT-003`) tracking this fix.

## 1. Goal

Any hard reload, or direct/full-page navigation (`page.goto()`, a bookmark, a
typed URL, a `window.location.reload()`) into a `(panel)` route — while
already authenticated — silently lands the user on `/dashboard` instead of
the route they requested. This surfaced during `SPEC-FRONT-001` e2e
verification as a failure in the "locale switch" test, and was first
misdiagnosed as a bug in `components/language/LanguageSwitcher.tsx` (it
navigates via `window.location.reload()`, right before the redirect). It
isn't — that component is correct and untouched by this fix. The real defect
is a hydration race in the shared authenticated-routes layout, and it affects
every `(panel)` route on every fresh mount, not just the language switch.

## 2. Root cause (evidence)

`app/(panel)/layout.tsx` reads `isAuthenticated`/`user` from `useAuthStore()`
(Zustand `persist`, backed by `localStorage`). On the **first** render after
any fresh mount, before the persist middleware has restored state, both
fields hold their pre-hydration defaults (`isAuthenticated: false,
user: null`) — real values arrive a tick later, in one atomic `set()` call.

The layout's `useEffect` had no guard for this:

```ts
useEffect(() => {
  if (!isAuthenticated) {
    router.push('/login');       // fires on the pre-hydration render too
  } else if (forbidden) {
    router.replace('/dashboard');
  }
}, [isAuthenticated, forbidden, router]);
```

So on every fresh mount it fires `router.push('/login')` first, unconditionally,
before hydration has had a chance to prove the user actually is or isn't
authenticated. `middleware.ts` then sees the real `accessToken` cookie
(cookies are unaffected by this client-side race) and 307-redirects that
`/login` request straight to `/dashboard` — stranding the user off their
requested route a moment before the client-side state even catches up.

Reproduced directly, with no language switch involved at all — instrumenting
the effect and tracing requests against a plain `page.goto('/sales')` right
after login:

```
[BROWSER] [DIAG layout effect] {pathname: /sales, isAuthenticated: false, hasUser: false, forbidden: false}
[BROWSER] [DIAG layout] pushing /login because isAuthenticated=false
[BROWSER] [DIAG layout effect] {pathname: /sales, isAuthenticated: true, hasUser: true, forbidden: false}
=== MARK: href after goto+wait = http://localhost:3001/dashboard
```

A prior fix (PR #39) had already added a guard — but only for the sibling
*forbidden-role* branch, with a comment explaining exactly this class of race
("Only apply the role check once `user` is actually hydrated"). It did
nothing useful: `isAuthenticated` and `user` hydrate atomically in the same
`set()` call, so gating on `!!user` never protected against anything the
`isAuthenticated` check didn't already imply — and the actually-vulnerable
`!isAuthenticated` branch next to it had no guard at all.

## 3. Fix

- `stores/authStore.ts`: added a real `hasHydrated` boolean (default
  `false`), set via the persist middleware's `onRehydrateStorage` callback —
  the one signal that's actually true only once localStorage has been read,
  regardless of what it contained.
- `app/(panel)/layout.tsx`: both redirect branches, and the `return null`
  guard, now wait on `hasHydrated` before acting on `isAuthenticated` at all.
  Removed the old `roleChecked = isAuthenticated && !!user` indirection — it
  was dead weight once hydration is gated correctly upstream.

## 4. Verification

- Repro test (above) re-run post-fix: `href` after `goto('/sales')` stays
  `http://localhost:3001/sales`.
- `tests/e2e/sidebar-reachability.spec.ts`, chromium, `locale: 'es-ES'`
  pinned (see `playwright.config.ts` change in this PR — separate concern,
  bundled here because it's what makes this suite deterministic enough to
  use as regression evidence): **5/5 pass, repeated 4 consecutive times, 0
  flakes.**
- Logged-out regression check: a fresh browser context (no cookies, no
  localStorage) hitting `/sales` directly still lands cleanly on `/login`
  with the login form rendered — confirms `onRehydrateStorage` fires even
  against empty storage, so this fix doesn't trade a wrong-page bug for a
  blank-page hang.
- `npx tsc --noEmit`: clean.
- Production Docker build (`next build`, which runs lint + typecheck):
  succeeds.

## 5. Scope

- `new-implementation/frontend/app/(panel)/layout.tsx`
- `new-implementation/frontend/stores/authStore.ts`
- `new-implementation/frontend/playwright.config.ts` (locale pin — test
  determinism, not itself a behavior fix, bundled for the reason in §4)

## 6. Out of scope

- `components/language/LanguageSwitcher.tsx` — correct, not touched.
- The rest of `SPEC-FRONT-001`'s reachability/i18n work — this fix is a
  dependency surfaced *while* verifying that spec, not part of its scope.
  `SPEC-FRONT-001` can be promoted to DONE once this PR merges and its own
  e2e suite is re-run clean against `main`.
- `tests/e2e/sidebar-reachability.spec.ts`'s hardcoded bootstrap-admin
  credentials in `beforeEach` — a pre-existing, unrelated test-infra gap
  (`AuthHelper`'s default password is 11 chars, invalid against the backend's
  12-char bootstrap minimum). Not modified here; belongs to whichever PR
  promotes `SPEC-FRONT-001`.

## 7. References

- `SPEC-FRONT-001` — where this was found during e2e verification.
- PR #39 — introduced the `roleChecked` guard this fix supersedes.

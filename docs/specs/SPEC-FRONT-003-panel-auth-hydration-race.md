# M3 — Panel layout auth-hydration race: hard reloads bounce to /dashboard

**Status**: APPROVED — 2026-08-10 (PR #44). Fix built in
`app/(panel)/layout.tsx` + `stores/authStore.ts`. Verified locally:
reproduced with request/redirect tracing (see §2), fix confirmed via the same
repro plus 4 consecutive clean runs of
`tests/e2e/sidebar-reachability.spec.ts` (5/5, chromium, locale pinned) and a
logged-out direct-access regression check — **the e2e runs are not
reproducible from a clean checkout**, see the caveat in §4. Not yet merged —
PR #44 open; review findings on the hydration-failure paths and the M3 module
glob folded in on 2026-08-10. Do not treat as DONE until the PR merges with
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

A gate is only as good as its failure paths. Against zustand 4.5.7, three
more cases had to be closed before this one was safe to ship:

- **Rehydration throws** (corrupt/truncated `auth-store` value fails
  `JSON.parse`): persist calls `postRehydrationCallback(undefined, e)`, so the
  original `state?.setHasHydrated(true)` no-opped on precisely the path that
  needed it. Two layers were required, because fixing only the obvious half
  still leaves the flag `false`:
  1. The callback now ignores its own argument and closes over the
     pre-hydration state handed to `onRehydrateStorage`'s outer function,
     which is always defined (`middleware.js:521` — `get() ?? configResult`).
  2. That alone is *silently discarded*. With nothing restored, persist
     returns `configResult` (`middleware.js:590` —
     `return stateFromStorage || configResult`) and `createStore` installs it
     as the state, overwriting any `set` the callback made during
     `create()`. So the flag write is deferred to a microtask, and — the real
     repair — `storage.getItem` now swallows a parse failure and returns
     `null`, which keeps hydration on the success path: unreadable persisted
     state is treated as *absent*, and the user is simply logged out.

  The flag write stays **synchronous on the success path** — persist re-reads
  `get()` immediately after the callback, so that write survives and the very
  first render already sees `hasHydrated: true`. Only the error path defers.
  A corrupt blob also self-heals: the write triggers persist's `setItem`,
  replacing the bad value with clean logged-out state.
- **Storage unreachable** (localStorage blocked by browser policy, private
  mode, kiosk profile): `createJSONStorage` swallows the throw and returns
  `undefined`, and persist returns before `hydrate()` — the callback is never
  created, let alone called. The storage object is now built eagerly and
  `hasHydrated` initialises to `true` when it came back `undefined`: nothing
  can be restored, so there is nothing to wait for.
- **Cookie outliving the store:** with those two closed, a hydrated-but-
  logged-out panel reaches `router.push('/login')` while a live `accessToken`
  cookie is still set — and `middleware.ts` 307s that straight back into the
  panel, flapping the URL indefinitely. That branch now calls
  `clearAuthCookie()` first. The cookie is stale by definition at that point,
  and this also covers `refreshTokenMethod`'s catch, which resets
  `isAuthenticated` without touching the cookie.

## 4. Verification

- Repro test (above) re-run post-fix: `href` after `goto('/sales')` stays
  `http://localhost:3001/sales`.
- `tests/e2e/sidebar-reachability.spec.ts`, chromium, `locale: 'es-ES'`
  pinned (see `playwright.config.ts` change in this PR — separate concern,
  bundled here because it's what makes this suite deterministic enough to
  use as regression evidence): **5/5 pass, repeated 4 consecutive times, 0
  flakes.**

  **Caveat — this run is not reproducible from the committed tree.** The
  suite calls `new AuthHelper(page).login()` with no arguments, and the
  helper's committed defaults (`admin@test.com` / `password123`) cannot
  authenticate: the password is 11 chars, below the backend's 12-char
  bootstrap minimum (§6). The runs above used locally-edited credentials
  matching this machine's `BOOTSTRAP_ADMIN_*`. Anyone re-running this suite
  must do the same until the test-infra gap in §6 is closed; a plain
  `npm run test:e2e` against a clean checkout fails in `beforeEach`, not in
  the code under test.
- Logged-out regression check: a fresh browser context (no cookies, no
  localStorage) hitting `/sales` directly still lands cleanly on `/login`
  with the login form rendered — confirms `onRehydrateStorage` fires even
  against empty storage.

  Empty storage is only the *benign* non-restoring case, and the first cut of
  this fix handled no other. Two further paths never complete hydration, and
  each would have hung the panel on `return null` forever (worse than the
  wrong-page bug being fixed); both are now handled in `stores/authStore.ts`
  — see §3.
- **New tests** — `tests/e2e/panel-hydration-failure.spec.ts`, both
  deliberately credential-free (cookie and `auth-store` are seeded directly,
  no login, no backend, no bootstrap admin), so unlike the suite above they
  **are** reproducible from a clean checkout. Run against `next dev` on 2026-08-10:
  1. *corrupt `auth-store` lands on /login* — seeds a stale `accessToken`
     cookie plus an unparseable store value, asserts the panel reaches
     `/login` **and** that the cookie was cleared. Verified in both
     directions: green with the fix, red on `waitForURL('**/login')` against
     pre-fix sources — it observes the blank-panel hang itself.
  2. *hard load into a deep panel route stays there* — seeds a valid session
     and cold-loads `/sales`, asserting no redirect and that panel chrome
     actually paints. Honest limitation: this one passes against pre-fix
     sources too, because a cold seeded load hydrates before the first
     render, so it does **not** reproduce the §2 race. It is a guard on the
     healthy path (the flag never arriving, the panel never painting), not
     evidence for the original bug.
- **Hydration-path matrix**, exercised directly against the installed zustand
  4.5.7 with the store's exact persist config (blocked storage / corrupt JSON
  / empty storage / healthy control). PR #44's callback form leaves
  `hasHydrated` false on the first two; the shipped form reaches `true` on
  all four, and the healthy control still restores `isAuthenticated: true`.
- `npx tsc --noEmit`: clean.
- Production Docker build (`next build`, which runs lint + typecheck):
  succeeds.

## 5. Scope

- `new-implementation/frontend/app/(panel)/layout.tsx`
- `new-implementation/frontend/stores/authStore.ts`
- `new-implementation/frontend/playwright.config.ts` (locale pin — test
  determinism, not itself a behavior fix, bundled for the reason in §4)
- `new-implementation/frontend/tests/e2e/panel-hydration-failure.spec.ts`
  (new — regression cover for the hydration failure paths in §3)
- `docs/specs/_modules.yml` — added `SPEC-FRONT-*.md` to M3. The existing
  FRONT globs are all lowercase (`SPEC-*-front-*.md`) and minimatch is
  case-sensitive, so this file matched nothing and fell through to the
  `default: M2`; without it Kairos would have filed and closed a Next.js fix
  under the backend module. `SPEC-FRONT-001/002` only matched because their
  slugs happen to contain the literal word "frontend".

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

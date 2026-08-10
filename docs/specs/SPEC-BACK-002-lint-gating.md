# M2 — Lint Gating: give both apps an ESLint config and a CI gate

**Status**: DRAFT — not started. Measured 2026-08-09: frontend is already clean under `next/core-web-vitals` (0 errors, 7 warnings); backend produces 156 errors under `@typescript-eslint/recommended`, of which 117 are `no-explicit-any` and 39 are `no-unused-vars`.

One Plane issue (`POS-BACK-002`) tracking the lint gate deferred by `SPEC-CUT-001` §4 S-01.

Full design: [`docs/superpowers/specs/2026-08-09-lint-gating-design.md`](../superpowers/specs/2026-08-09-lint-gating-design.md)
(that doc back-refs this issue via its `**Issue:** POS-BACK-002` line).

## 1. Goal

**Nothing in this repository is linted.** Neither app has an ESLint config, so
`npm run lint` fails in the frontend (`next lint` drops into interactive setup)
and would fail in the backend for want of a config. `SPEC-CUT-001` §4 S-01
recorded this as deferred pending "add configs first" and no spec has owned it
since — the only §4 item that is neither done, deliberately deferred with a
rationale, nor assigned elsewhere.

## 2. Findings (measured 2026-08-09, by trial-running each config)

- **The frontend is already clean.** Under `next/core-web-vitals`: **0 errors**,
  7 warnings across 6 files — six `@next/next/no-img-element` and one
  `jsx-a11y/alt-text`. The alt-text one is a real accessibility defect. The
  frontend has gone unlinted for no reason at all.
- **The backend is not.** Under `@typescript-eslint/recommended` +
  `eslint-config-prettier`: **156 errors across 44 of 148 files**, and they are
  two rules — **117 `@typescript-eslint/no-explicit-any`** and **39
  `@typescript-eslint/no-unused-vars`**. Nothing else fires.
- **Prettier would rewrite 85 files** using the repo's own single-quote style,
  and **142** using its defaults — the tooling is installed
  (`eslint-plugin-prettier`, `prettier`) but there is **no `.prettierrc`**, so a
  bare `prettier --write` flips the codebase from single to double quotes.
- **`npm run lint` in the backend runs `eslint … --fix`.** A CI job invoking it
  would silently rewrite files during the build.

## 3. Scope

1. **Frontend config** — `.eslintrc.json` extending `next/core-web-vitals`, plus
   fixing the 7 warnings so the app starts at zero of both.
2. **Backend config** — `.eslintrc.json` with `@typescript-eslint/recommended`
   and `eslint-config-prettier`. Fix the 39 `no-unused-vars`. Set
   `no-explicit-any` to **warn** so it never blocks a build.
3. **The `any` ratchet** — `scripts/any-budget.cjs` counts `no-explicit-any`
   warnings and fails when the total exceeds a recorded cap, seeded at **117**.
   The cap may only be lowered. Same shape as the i18n allowlist in
   `SPEC-FRONT-002`.
4. **`.prettierrc` with `singleQuote: true`** so a future `prettier --write`
   matches the repo instead of reformatting it. Nothing is reformatted by this
   spec.
5. **A non-mutating `lint:ci` script** in both apps, and a blocking CI job that
   calls it — never the `--fix` variant.

## 4. Acceptance

> Per the status convention in `CLAUDE.md`, the `**Status**:` line is the ledger.
> These are working notes.

- [ ] `npm run lint:ci` passes in both apps and mutates no files (`git diff`
      empty afterwards).
- [ ] The frontend reports 0 errors **and** 0 warnings.
- [ ] The backend reports 0 errors; `no-explicit-any` warnings number 117 or
      fewer.
- [ ] `node scripts/any-budget.cjs` passes at the recorded cap and fails when
      the cap is lowered by hand — proving it is wired to reality.
- [ ] CI runs lint for both apps as a **blocking** job.
- [ ] `npm run build` and the backend test suite still pass (246 tests at the
      time of writing).
- [ ] No file is reformatted: the diff contains no whitespace-only changes.

## 5. Out of scope

- **Typing away the 117 `any`s.** That is the debt the ratchet exists to shrink;
  doing it here would turn a tooling change into an API-contract change.
- **Reformatting.** 85 files would move under the repo's own style. A lint PR
  that also reformats is a lint PR nobody can review.
- **Migrating to ESLint's flat config.** Both apps are on ESLint 8.57 with the
  `.eslintrc` format their tooling expects; flat config is a separate migration.
- Frontend Playwright specs and backend e2e — unchanged by this.

## 6. References

- `SPEC-CUT-001` §4 S-01 — the deferral this closes, and the CI job it added.
- `SPEC-FRONT-002` — the i18n ratchet this borrows its shape from.
- `.github/workflows/ci.yml` — where the gate lands.

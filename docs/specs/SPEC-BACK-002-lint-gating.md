# M2 — Lint Gating: give both apps an ESLint config and a CI gate

**Status**: DRAFT — not started. Re-measured 2026-08-10 against `main` at 25317b35 (the first measurement, 2026-08-09, predated the i18n sweep in PR #42 and scanned only part of the frontend): under `next/core-web-vitals` the frontend has **2 errors and 8 warnings** across 128 files; under `@typescript-eslint/recommended` the backend has **156 problems across 44 of 146 files** — 117 `no-explicit-any` and 39 `no-unused-vars`.

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

## 2. Findings (re-measured 2026-08-10 against `main` @ 25317b35, by trial-running each config)

> The 2026-08-09 figures in the first draft of this spec were wrong in both
> directions: they were taken before PR #42 (the i18n sweep) merged, and the
> frontend run scanned only `app components lib stores types` — omitting
> `hooks/`, the root-level `.ts` files and `tests/`. Scanning what the app
> actually contains is what turns "0 errors" into 2. That miss is the reason
> the gate's file list is now written out explicitly below.

- **The frontend is nearly clean, not clean.** Under `next/core-web-vitals`
  over 128 files: **2 errors and 8 warnings**.
  - Both errors are `react-hooks/rules-of-hooks` in `hooks/useSettings.ts:23`
    and `:24` — a helper `makeMutation` calls `useQueryClient`/`useMutation`
    from a plain function. It has **no call sites**; it is dead code.
  - The warnings are six `@next/next/no-img-element`, one `jsx-a11y/alt-text`
    (a real accessibility defect, `components/ui/avatar.tsx:19`) and one
    `react-hooks/exhaustive-deps` (`components/sales/PaymentModal.tsx:66` — the
    `handleConfirm` callback omits `t`).
- **The backend is not clean.** Under `@typescript-eslint/recommended` +
  `eslint-config-prettier`: **156 problems across 44 of 146 files**, and they
  are two rules — **117 `@typescript-eslint/no-explicit-any`** and **39
  `@typescript-eslint/no-unused-vars`**. Nothing else fires.
- **Prettier would rewrite 85 files** using the repo's own single-quote style,
  and **142** using its defaults — the tooling is installed
  (`eslint-plugin-prettier`, `prettier`) but there is **no `.prettierrc`**, so a
  bare `prettier --write` flips the codebase from single to double quotes.
- **`npm run lint` in the backend runs `eslint … --fix`.** A CI job invoking it
  would silently rewrite files during the build.

## 3. Scope

1. **Frontend config** — `.eslintrc.json` extending `next/core-web-vitals`, plus
   fixing the 2 errors and 8 warnings so the app starts at zero of both. The
   gate's file list is `app components hooks lib stores types tests
   middleware.ts i18n-request.ts` — written out because the directories left
   out of the first measurement are exactly where the errors were hiding.
   `next.config.js` also gains `eslint: { ignoreDuringBuilds: true }`: adding an
   ESLint config is what makes `next build` start linting, and lint belongs in
   the lint job, not inside the production image build.
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
5. **A non-mutating `lint:ci` script** in both apps, and a CI job that calls it
   on every PR — never the `--fix` variant. The job runs; making it *block* a
   merge additionally requires branch protection on `main`, which this repo
   does not have (`gh api …/branches/main/protection` → 404, rulesets `[]`).
   That is a repo setting, not a code change; see §4.

## 4. Acceptance

> Per the status convention in `CLAUDE.md`, the `**Status**:` line is the ledger.
> These are working notes.

- [ ] `npm run lint:ci` passes in both apps and mutates no files (`git diff`
      empty afterwards).
- [ ] The frontend reports 0 errors **and** 0 warnings over the full file list
      (`app components hooks lib stores types tests middleware.ts
      i18n-request.ts`), not a subset of it.
- [ ] The backend reports 0 errors; `no-explicit-any` warnings number 117 or
      fewer.
- [ ] `node scripts/any-budget.cjs` passes at the recorded cap and fails when
      the cap is lowered by hand — proving it is wired to reality.
- [ ] CI runs lint for both apps on every PR, as a check named
      `Lint — backend + frontend`, and the job is observed green on a real
      runner (cite the run URL — a workflow that parses is not a workflow that
      ran; see `SPEC-CUT-001` §4 S-01 for why this repo insists).
- [ ] **Open, and not closable from this repo's code:** `main` has no branch
      protection, so a red lint check does not stop a merge. Adding
      `Lint — backend + frontend` to the required-checks list is an admin repo
      setting. Until it exists, the gate is advisory — say so in the status
      line rather than claiming a gate.
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
- **Changing** the frontend Playwright specs or backend e2e. `tests/` *is*
  inside the frontend lint file list (it contributes 0 problems today, and
  leaving it out would reopen a smaller version of the blind spot this spec was
  written to close), but no spec is edited.

## 6. References

- `SPEC-CUT-001` §4 S-01 — the deferral this closes, and the CI job it added.
- `SPEC-FRONT-002` — the i18n ratchet this borrows its shape from.
- `.github/workflows/ci.yml` — where the gate lands.

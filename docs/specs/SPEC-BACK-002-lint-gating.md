# M2 — Lint Gating: give both apps an ESLint config and a CI gate

**Status**: APPROVED — 2026-08-10 (PR #51). Both apps ship an ESLint config and a non-mutating `lint:ci`; the frontend is at 0 errors / 0 warnings over its full file list, the backend at 0 errors with `no-explicit-any` capped at 117 of 146 files by `scripts/any-budget.cjs`. All three of that script's silent-zero paths were proven to exit 1 by breaking them (cap exceeded on a /tmp copy, ESLint crash, rule set to "off"). The `Lint — backend + frontend` job is observed green on a real runner: https://github.com/golavi5/pos-modernization/actions/runs/31436451797/job/93611536553 (53s). Nothing was reformatted — no whitespace-only hunks — and `git status` stayed clean after running exactly what CI runs, proving no `--fix` reached the CI path. Backend 246/246, both builds green. **Open, and not closable from code:** the check is ADVISORY. `main` has branch protection but its `required_status_checks.contexts` does not list this job — it could not until the job had reported green once, which it now has. Adding `Lint — backend + frontend` to that list is an admin repo setting and is the only step left; until then a red lint does not stop a merge. Typing away the 117 `any`s is deliberately out of scope — the cap exists to shrink it under pressure.

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
   on every PR — never the `--fix` variant. Branch protection now exists on
   `main` (added 2026-08-10; `gh api …/branches/main/protection` →
   `required_status_checks.contexts` = "Backend — test + build", "Frontend —
   build", "Frontend — i18n checks"; `enforce_admins` off, no required
   reviews), so this job blocks once its check name is **added to that
   required list** — a repo setting, not a code change. Do not add the name
   before the job exists and is green: a required check that never reports
   wedges every PR. See §4.

## 4. Acceptance

> Per the status convention in `CLAUDE.md`, the `**Status**:` line is the ledger.
> These are working notes.

- [x] `npm run lint:ci` passes in both apps and mutates no files (`git diff`
      empty afterwards).
- [x] The frontend reports 0 errors **and** 0 warnings over the full file list
      (`app components hooks lib stores types tests middleware.ts
      i18n-request.ts`), not a subset of it.
- [x] The backend reports 0 errors; `no-explicit-any` warnings number 117 or
      fewer.
- [x] `node scripts/any-budget.cjs` passes at the recorded cap and fails when
      the cap is lowered by hand — proving it is wired to reality.
- [x] CI runs lint for both apps on every PR, as a check named
      `Lint — backend + frontend`, and the job is observed green on a real
      runner (cite the run URL — a workflow that parses is not a workflow that
      ran; see `SPEC-CUT-001` §4 S-01 for why this repo insists).
- [ ] **Requires a repo setting after this ships:** `main` has branch
      protection as of 2026-08-10, but this job's check name is not in the
      required list — it cannot be, until the job exists and has reported green
      once. Add `Lint — backend + frontend` to the required checks *after*
      merging, then say so in the status line. Until that is done the lint job
      reports without blocking; claim advisory, not a gate.
- [x] `npm run build` and the backend test suite still pass (246 tests at the
      time of writing).
- [x] No file is reformatted: the diff contains no whitespace-only changes.

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

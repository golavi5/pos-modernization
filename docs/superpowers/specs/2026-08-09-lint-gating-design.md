# Lint Gating — Design

**Issue:** POS-BACK-002
**Date:** 2026-08-09
**Status:** Draft
**Scope:** ESLint configs for both apps, a warning ratchet, a blocking CI job

---

## 1. Problem

Neither app has an ESLint config, so nothing in this repository is linted. The
cutover spec recorded this as deferred with the note "add configs first", which
reads as though the configs were the obstacle. They are not. Trial-running each
config shows the obstacle is one rule in one app:

| App | Config | Result |
|-----|--------|--------|
| frontend | `next/core-web-vitals` | 0 errors, 7 warnings, 6 files |
| backend | `@typescript-eslint/recommended` + `eslint-config-prettier` | 156 errors, 44 of 148 files |

The backend's 156 are **117 `no-explicit-any`** and **39 `no-unused-vars`**, and
nothing else. So the frontend has been unlinted for no reason, and the backend
for one specific reason that deserves to be named rather than left as "add
configs first".

## 2. Goals / non-goals

**Goals.** Lint both apps in CI, blocking, starting now. Make the `any` debt
visible and monotonically decreasing.

**Non-goals.** Typing the 117 `any`s. Reformatting. Flat-config migration.

## 3. Decisions

1. **Gate on errors; make `no-explicit-any` a warning.** The alternative — fix
   117 `any`s first — blocks every other lint benefit behind a large typing job
   that touches DTOs, services and the API contract. Warning-plus-ratchet gets
   the gate live today and still applies pressure.
2. **Ratchet the warning count, not just the errors.** A warning nobody counts
   is a warning nobody fixes. `scripts/any-budget.cjs` fails when the count
   exceeds its recorded cap, so the number can fall and never rise. This is the
   same mechanism as the i18n allowlist, deliberately — one idea, two uses.
3. **`eslint-config-prettier`, never `eslint-plugin-prettier`.** The former only
   *disables* rules that would fight the formatter; the latter reports
   formatting as lint errors. With 85 files already off-style under the repo's
   own quote convention, the plugin would produce a lint gate that fails on
   day one for reasons unrelated to code quality.
4. **Add `.prettierrc` but do not run Prettier.** Without it, `prettier --write`
   uses defaults and flips 142 files from single to double quotes — a trap for
   the next person who runs the existing `format` script. Recording the repo's
   actual style costs one file and defuses it. Reformatting is a separate
   decision with a separate diff.
5. **A separate non-mutating script for CI.** The backend's `lint` runs
   `eslint --fix`. In CI that rewrites files inside the build, which can turn a
   real failure into a silent pass and leaves the workspace dirty. `lint:ci`
   runs the same globs without `--fix`.

## 4. Components

| Unit | Responsibility |
|------|----------------|
| `frontend/.eslintrc.json` | extend `next/core-web-vitals` |
| `backend/.eslintrc.json` | `@typescript-eslint/recommended` + `eslint-config-prettier`; `no-explicit-any: warn` |
| `backend/.prettierrc` | `singleQuote: true` — records style, changes nothing |
| `backend/scripts/any-budget.cjs` | count `no-explicit-any` warnings, fail above the cap |
| `package.json` × 2 | add `lint:ci` |
| `.github/workflows/ci.yml` | blocking lint job for both apps |

## 5. The budget script

It runs ESLint programmatically with `--format json`, counts messages whose
`ruleId` is `@typescript-eslint/no-explicit-any`, and compares against a `CAP`
constant in the file itself — not a generated lockfile. Keeping the number in
source means lowering it is a reviewable one-line diff with the PR that earned
it, and raising it is equally visible.

It prints the per-file distribution when it fails, so the output tells you where
the debt lives rather than only that it grew.

## 6. Error handling

If ESLint itself fails to run (bad config, missing plugin), the script must exit
non-zero with ESLint's own stderr rather than reporting a count of zero. A
budget check that passes because the linter crashed is worse than no check —
that failure mode is the whole reason the frontend's `next lint` situation went
unnoticed for so long.

## 7. Testing

There is no unit runner in either app for this kind of script, so the proof is
behavioural and runs in the plan:

- Lower `CAP` by one → the budget script fails. This is what shows the check is
  wired to reality rather than always passing.
- Introduce a deliberate unused variable → backend lint fails with an error.
- Run `lint:ci` and confirm `git diff` is empty, proving it does not mutate.
- Backend suite still 246 green; frontend `npm run build` still compiles.

## 8. Risks

1. **`no-unused-vars` fixes can hide intent.** An unused parameter is sometimes
   a deliberate interface placeholder. Prefer renaming to `_arg` (which the
   recommended config ignores by convention) over deleting a parameter that
   satisfies a signature.
2. **The frontend's 6 `<img>` warnings may not all be mechanical.** Swapping to
   `next/image` needs width/height or a fill container; if a swap is not
   obviously safe, leave the `<img>` and disable the rule inline with a reason
   rather than forcing a layout change inside a lint PR.
3. **The cap is a ceiling, not a target.** Nothing forces it down. Its value is
   that an increase becomes a visible, arguable diff instead of silent drift.

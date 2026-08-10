# Lint Gating — Design

**Issue:** POS-BACK-002
**Date:** 2026-08-09
**Status:** Draft
**Scope:** ESLint configs for both apps, a warning ratchet, a CI lint job on every PR

---

## 1. Problem

Neither app has an ESLint config, so nothing in this repository is linted. The
cutover spec recorded this as deferred with the note "add configs first", which
reads as though the configs were the obstacle. They are not. Trial-running each
config shows the obstacle is one rule in one app:

| App | Config | Result (re-measured 2026-08-10 @ `main` 25317b35) |
|-----|--------|--------|
| frontend | `next/core-web-vitals` | 2 errors, 8 warnings, 128 files |
| backend | `@typescript-eslint/recommended` + `eslint-config-prettier` | 156 problems, 44 of 146 files |

The backend's 156 are **117 `no-explicit-any`** and **39 `no-unused-vars`**, and
nothing else. The frontend's 2 errors are both `react-hooks/rules-of-hooks` in
one dead helper (`hooks/useSettings.ts` `makeMutation`, no call sites).

The frontend row is the one to read twice. An earlier draft of this table said
"0 errors, 7 warnings, 6 files", because it scanned `app components lib stores
types` — a hand-written directory list that omits `hooks/`, the root-level
`.ts` files and `tests/`. Both real errors live in `hooks/`. A gate is only as
honest as the file list it walks, so the list is now written out in full, in
the spec, and is itself the thing to review.

## 2. Goals / non-goals

**Goals.** Lint both apps in CI on every PR, starting now, over every source
directory each app has. Make the `any` debt visible and monotonically
decreasing.

**Not a goal because it is not ours to do.** *Blocking* a merge needs branch
protection on `main` with the lint check required; this repo has none today.
The workflow is the deliverable, the required-check setting is a follow-up for
whoever holds admin on the repo, and the two must not be conflated in a status
line.

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
| `frontend/next.config.js` | `eslint.ignoreDuringBuilds: true` — keep lint in the lint job, out of `next build` |
| `backend/.eslintrc.json` | `@typescript-eslint/recommended` + `eslint-config-prettier`; `no-explicit-any: warn` |
| `backend/.prettierrc` | `singleQuote: true` — records style, changes nothing |
| `backend/scripts/any-budget.cjs` | count `no-explicit-any` warnings, fail above the cap |
| `package.json` × 2 | add `lint:ci` |
| `.github/workflows/ci.yml` | lint job for both apps, on every PR |

## 5. The budget script

It runs ESLint programmatically with `--format json`, counts messages whose
`ruleId` is `@typescript-eslint/no-explicit-any`, and compares against a `CAP`
constant in the file itself — not a generated lockfile. Keeping the number in
source means lowering it is a reviewable one-line diff with the PR that earned
it, and raising it is equally visible.

It prints the per-file distribution when it fails, so the output tells you where
the debt lives rather than only that it grew.

## 6. Error handling

A budget check that passes because the linter never counted anything is worse
than no check. There are three ways to reach a count of zero, and the script
must reject all three — the first is a crash, the other two are *successful*
ESLint runs and are the ones a crash-only guard misses:

1. **ESLint fails to run** (bad config, missing plugin) → exit non-zero with
   ESLint's own stderr, never a count of zero.
2. **The glob matched nothing.** A successful run over zero files is valid JSON
   and an empty array. Fail if no file was linted.
3. **The rule was turned off.** Set `no-explicit-any` to `"off"` and ESLint
   exits 0 with well-formed JSON containing no matching messages: `total` is 0,
   `0 > CAP` is false, PASS. Assert the rule is live (`eslint --print-config` on
   a known source file) before trusting the count.

For the same reason the PASS branch must not print "lower CAP to 0". A silent
zero already reads as success; an instruction to *ratify* it turns a temporary
hole into a permanent one, since a CAP of 0 can never fail again.

That failure mode is the whole reason the frontend's `next lint` situation went
unnoticed for so long.

## 7. Testing

There is no unit runner in either app for this kind of script, so the proof is
behavioural and runs in the plan:

- Run a copy of the script with `CAP` one lower → it fails. This is what shows
  the check is wired to reality rather than always passing. **Run the copy, not
  the tracked file**: a proof that edits `scripts/any-budget.cjs` in place and
  restores it afterwards leaves the wrong cap committed on any run that stops
  at the intentional failure — and the whole point of the step is that the
  middle command exits non-zero.
- Turn `no-explicit-any` off in a copy of the config → the script fails on the
  rule-disabled guard rather than printing PASS at zero.
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
4. **The inventory goes stale between measurement and execution.** These counts
   were taken at a named commit; a merge to `main` in between moves them, as
   already happened once here (PR #42 added the eighth warning). Task 1 re-runs
   the lint and works from *its* output — the file:line lists in the plan are a
   sanity check on that output, not a substitute for it.
5. **Adding an ESLint config changes `next build`.** Next 14 skips lint during
   a build only while no config exists. Creating `.eslintrc.json` silently
   switches linting on inside `next build`, which the CI `frontend` job and
   `Dockerfile:19` both run — so a lint error would break the production image,
   and every build would pay a second full ESLint pass. Hence
   `ignoreDuringBuilds: true` lands in the same task as the config.

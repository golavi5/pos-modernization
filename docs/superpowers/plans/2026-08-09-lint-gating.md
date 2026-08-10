# Lint Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give both apps an ESLint config and a CI lint job that runs on every PR, without reformatting anything or blocking on the backend's typing debt.

**Architecture:** Errors gate; `@typescript-eslint/no-explicit-any` is a warning under a budget script capped at its current 117, which may only fall. Both apps start with real errors to clear — 2 in the frontend, 39 in the backend. Prettier is deliberately kept out of the lint path — `eslint-config-prettier` disables conflicting rules and nothing runs the formatter.

**Counts are as of `main` @ 25317b35, re-measured 2026-08-10.** They will drift as `main` moves. Every task re-runs the lint and works from *its* output; the file:line lists below are a sanity check on that output, never a substitute for it. If your numbers differ from the plan's, the plan is stale — say so in the PR and carry on from what you measured.

**Tech Stack:** ESLint 8.57 (`.eslintrc` format, not flat config), `eslint-config-next`, `@typescript-eslint` 6, GitHub Actions.

## Global Constraints

- **Reformat nothing.** 85 backend files are off-style under the repo's own single-quote convention; a lint PR that also reformats is unreviewable. The diff must contain no whitespace-only changes.
- **Never `eslint-plugin-prettier`.** Use `eslint-config-prettier`, which only *disables* rules that fight the formatter. The plugin reports formatting as lint errors and would fail on day one.
- **CI must never run a `--fix` lint.** The backend's existing `lint` script does; that is why `lint:ci` exists.
- ESLint 8.57 in both apps — use `.eslintrc.json`, not `eslint.config.js`. Flat-config migration is out of scope.
- Backend commands run from `new-implementation/backend`, frontend from `new-implementation/frontend`.
- The backend suite (246 tests) and `npm run build` must still pass at every commit.

---

### Task 1: Frontend config, its 2 errors and its 8 warnings

**Files:**
- Create: `new-implementation/frontend/.eslintrc.json`
- Modify: `new-implementation/frontend/next.config.js` (opt `next build` out of linting)
- Modify: `new-implementation/frontend/package.json` (add `lint:ci`)
- Modify (errors): `hooks/useSettings.ts:23-24`
- Modify (warnings): `components/ui/avatar.tsx:19`, `components/products/ProductCard.tsx:20`, `components/products/ProductFormFields.tsx:173`, `components/products/ProductsTable.tsx:88`, `components/sales/ProductSearch.tsx:97`, `app/(panel)/products/[id]/page.tsx:31`, `components/sales/PaymentModal.tsx:66`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run lint:ci` in the frontend — exits 0 when clean, non-zero otherwise, and mutates no files. Task 4 wires it into CI.

- [ ] **Step 1: Add the config**

Create `new-implementation/frontend/.eslintrc.json`:

```json
{
  "root": true,
  "extends": ["next/core-web-vitals"]
}
```

- [ ] **Step 2: Keep lint out of `next build`**

Creating that file has a side effect the rest of this plan would otherwise not
mention. Next 14 skips ESLint during `next build` **only while no config
exists**; from Step 1 onward, `next build` lints too. Two places already run
`npm run build`: the CI `frontend` job and `new-implementation/frontend/Dockerfile:19`
(devDeps are present — line 6 is a plain `npm ci`). Left alone, a lint error
would break the production image, and every build would pay a second full
ESLint pass on top of `lint:ci`.

Lint belongs in the lint job. In `new-implementation/frontend/next.config.js`,
inside `nextConfig`:

```js
  // Lint runs in its own CI job (`npm run lint:ci`), not inside the build.
  // Without this, creating .eslintrc.json would make `next build` — and so the
  // Docker production image — fail on any lint error.
  eslint: { ignoreDuringBuilds: true },
```

- [ ] **Step 3: Depend on ESLint explicitly**

`eslint` is **not** in the frontend's `devDependencies` — the binary exists only
because it is hoisted out of `eslint-config-next`'s tree. It resolves today, but
a CI script that calls a transitive binary breaks silently on any dependency
bump. Pin the intent:

```bash
npm install --save-dev --save-exact eslint@8.57.1
```

Use 8.57.x specifically: ESLint 9 defaults to flat config, which
`eslint-config-next@14` does not support and which this spec puts out of scope.

- [ ] **Step 4: Add a non-mutating script**

In `new-implementation/frontend/package.json`, alongside the existing `"lint": "next lint"`:

```json
    "lint:ci": "eslint --ext .ts,.tsx app components hooks lib stores types tests middleware.ts i18n-request.ts --max-warnings 0",
```

**This file list is the review-critical part of the task.** An earlier draft
scanned `app components lib stores types` and reported the frontend as clean;
both of the app's real ESLint errors live in `hooks/`, which that list omits,
along with `middleware.ts` (the auth guard), `i18n-request.ts` and `tests/`.
A gate is only as honest as the paths it walks.

Two things not to "tidy":
- **Do not collapse this to `eslint --ext .ts,.tsx .`.** Untracked directories
  (`dist/`, `src.backup/`) exist in working trees but not on a fresh CI
  checkout, so `.` would lint different files locally than in CI — the same
  class of bug as the one above. If you want `.`, it needs a committed
  `.eslintignore` and a fresh measurement first.
- **Do not drop `tests/`** because it is currently clean. Clean is why it costs
  nothing to keep, and keeping it is what stops the blind spot from growing
  back.

`next lint` is left alone — it now works, because a config exists.

- [ ] **Step 5: Run it to see the failures**

```bash
npm run lint:ci; echo "exit=$?"
```
Expected: `exit=1`, **2 errors and 8 warnings** over 128 files —
- 2 × `react-hooks/rules-of-hooks` at `hooks/useSettings.ts:23` and `:24`;
- 6 × `@next/next/no-img-element` and 1 × `jsx-a11y/alt-text` at the files listed above;
- 1 × `react-hooks/exhaustive-deps` at `components/sales/PaymentModal.tsx:66`.

`--max-warnings 0` is what turns the warnings into a failure; the two errors
fail on their own.

- [ ] **Step 6: Delete the dead `makeMutation` helper**

Both errors are one function. `hooks/useSettings.ts:22` declares:

```ts
function makeMutation<T>(fn: (dto: T) => Promise<any>) {
  const qc = useQueryClient();
  return useMutation({ … });
}
```

It calls hooks from a plain function, which is the rules-of-hooks violation —
and `grep -n makeMutation hooks/useSettings.ts` shows the declaration and
nothing else. **It has no call sites. Delete it.**

Do not "fix" it by renaming to `useMakeMutation`: that silences the rule by
creating a custom hook nobody calls. The six real `useUpdate*` hooks below it
already inline the same three lines each; consolidating them is a refactor with
its own diff, not a lint fix.

- [ ] **Step 7: Fix the real accessibility defect**

`components/ui/avatar.tsx:19` renders an `<img>` with no `alt`. It is an avatar fallback, so the image is decorative and an empty alt is correct:

```tsx
      <img alt="" {...props} />
```

Keep whatever props the element already spreads; only add `alt=""`.

- [ ] **Step 8: Fix the missing `useCallback` dependency**

`components/sales/PaymentModal.tsx:66` — `handleConfirm`'s dependency array is
`[canConfirm, isLoading, method, onConfirm]` but the callback also reads `t`,
the translator from `useTranslations('sales')`, in its catch block. (This
warning arrived with the i18n sweep in PR #42; the first inventory for this
plan predates it.)

Add `t` to the array. `next-intl`'s `t` is stable per locale, so this does not
change how often the callback is recreated in practice — it makes the
dependency honest, and keeps the callback from closing over a stale translator
after a locale change.

Do **not** silence this one with `// eslint-disable-next-line`: an
exhaustive-deps disable on a payment confirmation handler is exactly the kind
of thing this gate exists to stop.

- [ ] **Step 9: Decide each `<img>` individually**

Six `<img>` elements are flagged. **Do not blanket-swap them to `next/image`** — that component requires `width`/`height` or a `fill` parent, so a careless swap changes layout, and this is a lint PR.

For each of the six, pick one:
- if the element has known dimensions and a simple parent, swap to `next/image` with explicit `width`/`height`;
- otherwise keep `<img>` and disable the rule on that line **with a reason**:

```tsx
{/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded product image of unknown dimensions; next/image needs a sized or fill parent */}
<img src={product.image_url} alt={product.name} />
```

A bare disable with no reason is not acceptable — the next reader must know whether it was considered or dodged.

- [ ] **Step 10: Verify clean and non-mutating**

```bash
npm run lint:ci; echo "exit=$?"     # expect exit=0, no output
npm run build                        # expect ✓ Compiled successfully
git diff --stat                      # expect only the files you edited
```

`npm run build` here proves the app still compiles — it no longer proves
anything about lint, because Step 2 took ESLint out of the build on purpose.
`lint:ci` is the only lint signal, in this task and in CI.

- [ ] **Step 11: Commit**

```bash
git add .eslintrc.json next.config.js package.json package-lock.json components hooks app
git commit -m "lint(front): add ESLint config and clear its 2 errors and 8 warnings"
```

---

### Task 2: Backend config and its 39 unused variables

**Files:**
- Create: `new-implementation/backend/.eslintrc.json`
- Create: `new-implementation/backend/.prettierrc`
- Modify: `new-implementation/backend/package.json` (add `lint:ci`)
- Modify: 25 files under `src/` carrying `no-unused-vars` — the linter names them; the largest are `src/modules/customers/customers.service.ts` (5) and `src/modules/auth/auth.controller.ts` (3)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `npm run lint:ci` in the backend, and a config in which `@typescript-eslint/no-explicit-any` is `warn`. Task 3's budget script depends on that rule being **warn, not off** — turning it off would make the budget silently read zero.

- [ ] **Step 1: Add the config**

Create `new-implementation/backend/.eslintrc.json`:

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": { "sourceType": "module", "ecmaVersion": 2022 },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "env": { "node": true, "jest": true },
  "ignorePatterns": ["dist", "node_modules", "migrations"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
    ]
  }
}
```

`"prettier"` here is **`eslint-config-prettier`** — it disables rules that fight the formatter. It is not `eslint-plugin-prettier` and must not become it.

- [ ] **Step 2: Record the repo's actual formatting style**

Create `new-implementation/backend/.prettierrc`:

```json
{
  "singleQuote": true,
  "trailingComma": "all"
}
```

This changes nothing today. It exists because the package already has a `format` script running `prettier --write`, and without this file Prettier's defaults would flip 142 files from single to double quotes the first time anyone runs it.

**Do not run `npm run format` in this task.**

- [ ] **Step 3: Add a non-mutating script**

In `new-implementation/backend/package.json`, next to the existing `"lint"` (which keeps its `--fix` for local use):

```json
    "lint:ci": "eslint \"{src,apps,libs,test}/**/*.ts\"",
```

- [ ] **Step 4: Run it to see the failures**

```bash
npm run lint:ci; echo "exit=$?"
```
Expected: `exit=1`, 39 `no-unused-vars` errors across 25 files, plus 117 `no-explicit-any` **warnings** that do not affect the exit code.

- [ ] **Step 5: Fix the 39, preferring rename over delete**

Work file by file from the linter's output. For each:

- an unused **import** or local → delete it;
- an unused **function parameter** that exists to satisfy a signature (a NestJS
  guard's `context`, a strategy's `done`) → rename to `_context` / `_done`. The
  config's `argsIgnorePattern: "^_"` accepts that, and it preserves the
  signature. **Deleting a parameter that a framework passes positionally will
  break behaviour**, which no test may catch.

- [ ] **Step 6: Verify errors gone, warnings intact, nothing mutated**

```bash
npm run lint:ci; echo "exit=$?"   # expect exit=0 — warnings print but do not fail
npm test                           # expect 246 passed
npm run build                      # expect success
git diff --stat                    # expect only files you edited; no whitespace-only changes
```

If the test count is not 246, stop — a rename removed something load-bearing.

- [ ] **Step 7: Commit**

```bash
git add .eslintrc.json .prettierrc package.json src
git commit -m "lint(back): add ESLint config and clear 39 unused-variable errors"
```

---

### Task 3: The `any` budget

39 errors are gone; 117 warnings remain. This makes that number visible and one-directional.

**Files:**
- Create: `new-implementation/backend/scripts/any-budget.cjs`
- Modify: `new-implementation/backend/package.json` (add `lint:budget`)

**Interfaces:**
- Consumes: the backend `.eslintrc.json` from Task 2, specifically `no-explicit-any` being `warn`.
- Produces: `npm run lint:budget` — exit 0 at or under the cap, exit 1 above it. Task 4 runs it in CI.

- [ ] **Step 1: Write the budget script**

Create `new-implementation/backend/scripts/any-budget.cjs`:

```javascript
// Counts @typescript-eslint/no-explicit-any warnings and fails when they exceed
// CAP. The number may only fall: lowering CAP is a reviewable one-line diff in
// the PR that earned it, and raising it is equally visible.
//
// This exists because no-explicit-any is a warning, and a warning nobody counts
// is a warning nobody fixes.
const { execFileSync } = require('child_process');
const path = require('path');

const CAP = 117;
const RULE = '@typescript-eslint/no-explicit-any';
const GLOB = '{src,apps,libs,test}/**/*.ts';

// Paths resolve from the working directory, which `npm run lint:budget` sets to
// the backend package root. Deliberately not __dirname: Task 3 Step 4 proves the
// failure path by running a modified copy of this file from outside the repo.
const ESLINT = path.join('node_modules', '.bin', 'eslint');

const run = (args) =>
  execFileSync(ESLINT, args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });

// Guard 1 — the rule must actually be enabled. If it is "off", ESLint exits 0
// with well-formed JSON and no matching messages, and a naive count reads zero
// as success. Ask the config directly before trusting any count.
try {
  const cfg = JSON.parse(run(['--print-config', 'src/main.ts']));
  const sev = cfg.rules && cfg.rules[RULE];
  const level = Array.isArray(sev) ? sev[0] : sev;
  if (level === undefined || level === 'off' || level === 0) {
    console.error(
      `${RULE} is not enabled in the ESLint config (got ${JSON.stringify(sev)}).\n` +
        'The budget cannot count a rule that does not run. Set it to "warn".',
    );
    process.exit(1);
  }
} catch (err) {
  console.error('could not read the eslint config:\n' + (err.stderr || err.message));
  process.exit(1);
}

let raw;
try {
  raw = run([GLOB, '--format', 'json']);
} catch (err) {
  // ESLint exits non-zero when it reports errors — that is normal here and its
  // stdout is still valid JSON. A genuine crash produces no stdout, and must
  // fail loudly rather than be read as a count of zero.
  if (!err.stdout) {
    console.error('eslint failed to run:\n' + (err.stderr || err.message));
    process.exit(1);
  }
  raw = err.stdout;
}

const results = JSON.parse(raw);

// Guard 2 — a run that linted nothing is not a run of zero violations. A
// narrowed glob or a widened ignorePatterns would otherwise pass silently.
if (results.length === 0) {
  console.error(`eslint linted 0 files for ${GLOB} — the glob or ignorePatterns changed.`);
  process.exit(1);
}

const perFile = [];
let total = 0;
for (const file of results) {
  const n = file.messages.filter((m) => m.ruleId === RULE).length;
  if (n) {
    perFile.push([path.relative(process.cwd(), file.filePath), n]);
    total += n;
  }
}

if (total > CAP) {
  console.log(`FAIL  ${RULE}: ${total} (cap ${CAP}, +${total - CAP})`);
  for (const [f, n] of perFile.sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${String(n).padStart(4)}  ${f}`);
  }
  console.log('\nThe cap may only fall. Type some away, or justify the increase.');
  process.exit(1);
}

console.log(
  total < CAP
    ? `PASS  ${RULE}: ${total} of ${results.length} files (cap ${CAP}, ${CAP - total} of headroom to give back)`
    : `PASS  ${RULE}: ${total} of ${results.length} files (at cap ${CAP})`,
);
```

Two notes on that output, both deliberate:

- It prints the **file count**, so a run that quietly narrowed its scope reads
  as suspicious rather than as an improvement.
- It says "headroom to give back", not "lower CAP to N". Telling a reader to
  ratify whatever number came out is how a temporary zero becomes a permanent
  one — a `CAP` of 0 can never fail again. Lowering the cap should follow work
  that actually removed `any`s, in that work's own PR.

- [ ] **Step 2: Add the script entry**

```json
    "lint:budget": "node scripts/any-budget.cjs",
```

- [ ] **Step 3: Run it — expect PASS at the cap**

```bash
npm run lint:budget; echo "exit=$?"
```
Expected: `PASS  @typescript-eslint/no-explicit-any: 117 of 146 files (at cap 117)` and `exit=0`.

Check **both** numbers. If the count is not 117, do not adjust the cap to match
blindly — first check whether Task 2 changed an `any` by accident. If the file
count is not ~146, the glob or `ignorePatterns` is excluding source, and the
count is measuring less than you think.

- [ ] **Step 4: Prove it actually fails — on a copy, never in place**

```bash
sed 's/const CAP = 117;/const CAP = 116;/' scripts/any-budget.cjs > /tmp/budget-116.cjs
node /tmp/budget-116.cjs; echo "exit=$?"
rm /tmp/budget-116.cjs
```
Expected: `FAIL … 117 (cap 116, +1)`, a per-file table, and `exit=1`.

A budget that only ever prints PASS proves nothing. This step is the test.

**Do not do this with `sed -i` and a restore.** The middle command is *supposed*
to exit non-zero, so under `set -e`, an `&&` chain, or any worker that stops on
a failing command to report it, the restore never runs — and Step 6 then commits
`const CAP = 116;`. A ratchet one below its own count is a red required check on
`main` that blocks every later PR until someone reads the script. (Step 7 then
commits it — the tamper is two steps upstream of a `git add`.)

The copy lives in `/tmp` but resolves its paths from the working directory, so
run it from `new-implementation/backend` like every other command in this task.

- [ ] **Step 5: Prove the crash path fails loudly**

```bash
mv .eslintrc.json .eslintrc.json.bak
npm run lint:budget; echo "exit=$?"
mv .eslintrc.json.bak .eslintrc.json
```
Expected: a config error and `exit=1` — **not** a count of zero. Confirm `npm run lint:budget` passes again afterwards.

- [ ] **Step 6: Prove a disabled rule fails too**

The crash path is the *easy* silent-zero. The dangerous one is a successful
ESLint run over a rule that is switched off: valid JSON, no matching messages,
`total = 0`, `0 > 117` is false, PASS.

```bash
cp .eslintrc.json .eslintrc.json.bak
node -e "const f='.eslintrc.json',j=require('./'+f);j.rules['@typescript-eslint/no-explicit-any']='off';require('fs').writeFileSync(f,JSON.stringify(j,null,2))"
npm run lint:budget; echo "exit=$?"
mv .eslintrc.json.bak .eslintrc.json
```
Expected: `@typescript-eslint/no-explicit-any is not enabled in the ESLint config` and `exit=1`. Confirm `npm run lint:budget` passes again afterwards, and that `git status --porcelain` is empty.

- [ ] **Step 7: Commit**

```bash
git add scripts/any-budget.cjs package.json
git commit -m "lint(back): cap the no-explicit-any count at 117"
```

---

### Task 4: Gate it in CI

**Files:**
- Modify: `.github/workflows/ci.yml` (repo root)

**Interfaces:**
- Consumes: `lint:ci` from Tasks 1 and 2, `lint:budget` from Task 3.
- Produces: a `lint` job that runs on every PR. It does **not** produce a merge
  block — see Step 4.

- [ ] **Step 1: Add the job**

In `.github/workflows/ci.yml`, alongside `backend`, `frontend` and `i18n` (that
third job arrived with PR #42):

```yaml
  lint:
    name: Lint — backend + frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: |
            new-implementation/backend/package-lock.json
            new-implementation/frontend/package-lock.json
      - name: Backend
        working-directory: ./new-implementation/backend
        run: |
          npm ci
          npm run lint:ci
          npm run lint:budget
      - name: Frontend
        working-directory: ./new-implementation/frontend
        run: |
          npm ci
          npm run lint:ci
```

Both apps run in one job so the workflow gains one check rather than two.

`cache-dependency-path` lists **both** lockfiles. With only the backend's, the
cache key ignores frontend dependency changes — so the frontend `npm ci` in this
job restores a cache keyed to a tree it does not match, and stops invalidating
when frontend deps move.

- [ ] **Step 2: Correct the file's header comment**

`.github/workflows/ci.yml` opens with:

```
# … Lint is not gated yet — neither app ships an ESLint config
# (`next lint`/`eslint` have nothing to run); adding configs is tracked
# separately (SPEC-CUT-001 S-01).
```

Every clause of that is false once Step 1 lands. Replace it with what is then
true: both apps ship an ESLint config, the `lint` job runs `lint:ci` for each
plus the backend `any` budget, and it stays advisory — `main`'s branch
protection (added 2026-08-10; see `SPEC-BACK-002` §3 item 5) does not include
this check's name yet, and cannot until the job exists and has reported green
at least once. A stale comment sitting next to the thing it denies is the ledger
rot this repo's conventions exist to prevent.

- [ ] **Step 3: Verify the workflow parses**

```bash
python3 -c "import yaml,sys; d=yaml.safe_load(open('.github/workflows/ci.yml')); print(sorted(d['jobs'].keys()))"
```
Expected: the job list now includes `lint`.

This proves the YAML parses. It does not prove the job runs, and it certainly
does not prove the job blocks anything — see Steps 4 and 5.

- [ ] **Step 4: Record what "gating" actually requires — do not claim it**

`main` now **has** branch protection (added 2026-08-10; `gh api
repos/:owner/:repo/branches/main/protection` → `required_status_checks.contexts`
= "Backend — test + build", "Frontend — build", "Frontend — i18n checks" — see
`SPEC-BACK-002` §3 item 5). That does not mean this plan's lint job blocks
anything: a job in `ci.yml` runs on every PR, but it blocks a merge only once
its check name is added to the required-status-checks list, and that name
cannot be added before the job exists and has reported green at least once.
Nothing in this plan can add it — it is an admin repo setting, and a worker
executing this plan most likely lacks the rights.

So: **do not add a `gh api -X PUT …/protection` step you cannot verify, and do
not describe the result as a gate.** Instead, note in the PR body that
`Lint — backend + frontend` is ready to be added as a required check once it
ships and is observed green, and leave the acceptance item in `SPEC-BACK-002`
§4 open with that as its reason. FRONT-002's equivalent item is already
closed — its check ("Frontend — i18n checks") is in the required list; this
plan closes the same gap for BACK-002's job.

- [ ] **Step 5: Verify nothing mutates**

From the repo root, run what CI runs and confirm a clean tree:

```bash
( cd new-implementation/backend  && npm run lint:ci && npm run lint:budget )
( cd new-implementation/frontend && npm run lint:ci )
git status --porcelain          # expect empty
```

An empty `git status` here is the proof that no `--fix` snuck into the CI path.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run lint and the any budget for both apps on every PR"
```

---

### Task 5: Close out the spec

**Files:**
- Modify: `docs/specs/SPEC-BACK-002-lint-gating.md`
- Modify: `docs/specs/SPEC-CUT-001-cutover-deploy-readiness.md`

**Interfaces:** none.

- [ ] **Step 1: Tick the acceptance list**

Mark each `- [ ]` in §4 the work satisfies. The last item — "no file is reformatted" — is checked by reading the PR diff for whitespace-only hunks, not by a command. The branch-protection item stays **unticked**: nothing in this plan can satisfy it.

- [ ] **Step 2: Update the status line**

Per the convention in `CLAUDE.md`, the status line is the ledger and carries its evidence. Fill the bracketed values from what you actually observed — do not copy the template's numbers:

```markdown
**Status**: APPROVED — <date> (PR #NN). Both apps linted; `lint` runs on every PR (<link to the first green run>); frontend at 0 errors / 0 warnings over its full file list; backend at 0 errors with no-explicit-any capped at <N>. Nothing reformatted. Open: `main` has branch protection but this check's name is not yet in the required list — add `Lint — backend + frontend` to required checks once the job is observed green to make it gate.
```

`APPROVED`, not `DONE`, and here is the rule that decides it: this repo defines
`DONE` as shipped **and** verified, with a verification record for anything
exercised against real infrastructure. A CI job is real infrastructure. Until
you can cite a green run URL *and* the required-check setting exists, the gate
is not verified — and `SPEC-CUT-001` §4 S-01 is this repo's own record of a
workflow that parsed perfectly and never ran. Promote to `DONE` in a later
commit once both are true. Never `IMPLEMENTED` — Kairos maps it to Done.

Note the `<date>` placeholder: stamp the day you actually do this, not the day
this plan was written.

- [ ] **Step 3: Retire the deferral in `SPEC-CUT-001`**

`SPEC-BACK-002` §6 names `SPEC-CUT-001` §4 S-01 as "the deferral this closes",
so leaving CUT-001 unchanged leaves the repo's ledger asserting both. Two edits
there:

- the `**Status**:` line, which reads "S-01 (lint gate) and S-02 (Sentry)
  deferred by decision" — the lint half is no longer deferred, it is owned by
  `POS-BACK-002`;
- the §4 S-01 row, whose tail reads "**Deferred:** lint gate — neither app
  ships an ESLint config (`next lint`/`eslint` have nothing to run); add
  configs first." That sentence becomes false the moment Task 1 lands. Replace
  it with a pointer to `POS-BACK-002` and its actual state.

Leave §6's checkboxes alone — per `CLAUDE.md`, the status line is the ledger and
the boxes are working notes.

- [ ] **Step 4: Commit**

```bash
git add docs/specs/SPEC-BACK-002-lint-gating.md docs/specs/SPEC-CUT-001-cutover-deploy-readiness.md
git commit -m "docs(specs): record BACK-002 outcome and retire the CUT-001 S-01 deferral"
```

---

## Notes for the PR

Put `Closes POS-BACK-002` in the body if the work completes the spec — a bare mention of the id does nothing.

Reviewers should check four things specifically — each is a way this PR can go wrong *while still being green*:

1. **The frontend file list in `lint:ci`.** Directories missing from it are not linted, and nothing in a green CI run says so. This plan's own first draft lost both frontend errors that way.
2. **Every `eslint-disable` added in Task 1 carries a reason.**
3. **No whitespace-only hunks** anywhere in the diff.
4. **`CAP` is 117**, not 116 — Task 3's failure proof runs against a copy precisely so a stopped run cannot commit the tampered value.

Say plainly in the body that the lint check is advisory until its name is added to `main`'s required-status-checks list — branch protection itself already exists (added 2026-08-10). A PR that reads as "lint is now gated" when it is not is worse than one that admits the gap.

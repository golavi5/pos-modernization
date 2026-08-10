# Lint Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give both apps an ESLint config and a blocking CI gate, without reformatting anything or blocking on the backend's typing debt.

**Architecture:** Errors gate; `@typescript-eslint/no-explicit-any` is a warning under a budget script capped at its current 117, which may only fall. The frontend is already at zero errors so its gate is green immediately. Prettier is deliberately kept out of the lint path — `eslint-config-prettier` disables conflicting rules and nothing runs the formatter.

**Tech Stack:** ESLint 8.57 (`.eslintrc` format, not flat config), `eslint-config-next`, `@typescript-eslint` 6, GitHub Actions.

## Global Constraints

- **Reformat nothing.** 85 backend files are off-style under the repo's own single-quote convention; a lint PR that also reformats is unreviewable. The diff must contain no whitespace-only changes.
- **Never `eslint-plugin-prettier`.** Use `eslint-config-prettier`, which only *disables* rules that fight the formatter. The plugin reports formatting as lint errors and would fail on day one.
- **CI must never run a `--fix` lint.** The backend's existing `lint` script does; that is why `lint:ci` exists.
- ESLint 8.57 in both apps — use `.eslintrc.json`, not `eslint.config.js`. Flat-config migration is out of scope.
- Backend commands run from `new-implementation/backend`, frontend from `new-implementation/frontend`.
- The backend suite (246 tests) and `npm run build` must still pass at every commit.

---

### Task 1: Frontend config and its 7 warnings

The frontend is already at 0 errors, so this task is about getting it to 0 warnings too and locking that in.

**Files:**
- Create: `new-implementation/frontend/.eslintrc.json`
- Modify: `new-implementation/frontend/package.json` (add `lint:ci`)
- Modify: `components/ui/avatar.tsx:19`, `components/products/ProductCard.tsx:17`, `components/products/ProductFormFields.tsx:169`, `components/products/ProductsTable.tsx:81`, `components/sales/ProductSearch.tsx:94`, `app/(panel)/products/[id]/page.tsx:31`

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

- [ ] **Step 2: Depend on ESLint explicitly**

`eslint` is **not** in the frontend's `devDependencies` — the binary exists only
because it is hoisted out of `eslint-config-next`'s tree. It resolves today, but
a CI script that calls a transitive binary breaks silently on any dependency
bump. Pin the intent:

```bash
npm install --save-dev --save-exact eslint@8.57.1
```

Use 8.57.x specifically: ESLint 9 defaults to flat config, which
`eslint-config-next@14` does not support and which this spec puts out of scope.

- [ ] **Step 3: Add a non-mutating script**

In `new-implementation/frontend/package.json`, alongside the existing `"lint": "next lint"`:

```json
    "lint:ci": "eslint --ext .ts,.tsx app components lib stores types --max-warnings 0",
```

`next lint` is left alone — it now works, because a config exists.

- [ ] **Step 4: Run it to see the failures**

```bash
npm run lint:ci; echo "exit=$?"
```
Expected: `exit=1` with exactly 7 warnings — six `@next/next/no-img-element` and one `jsx-a11y/alt-text`, at the six files listed above. `--max-warnings 0` is what turns them into a failure.

- [ ] **Step 5: Fix the real accessibility defect**

`components/ui/avatar.tsx:19` renders an `<img>` with no `alt`. It is an avatar fallback, so the image is decorative and an empty alt is correct:

```tsx
      <img alt="" {...props} />
```

Keep whatever props the element already spreads; only add `alt=""`.

- [ ] **Step 6: Decide each `<img>` individually**

Six `<img>` elements are flagged. **Do not blanket-swap them to `next/image`** — that component requires `width`/`height` or a `fill` parent, so a careless swap changes layout, and this is a lint PR.

For each of the six, pick one:
- if the element has known dimensions and a simple parent, swap to `next/image` with explicit `width`/`height`;
- otherwise keep `<img>` and disable the rule on that line **with a reason**:

```tsx
{/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded product image of unknown dimensions; next/image needs a sized or fill parent */}
<img src={product.image_url} alt={product.name} />
```

A bare disable with no reason is not acceptable — the next reader must know whether it was considered or dodged.

- [ ] **Step 7: Verify clean and non-mutating**

```bash
npm run lint:ci; echo "exit=$?"     # expect exit=0, no output
npm run build                        # expect ✓ Compiled successfully
git diff --stat                      # expect only the files you edited
```

- [ ] **Step 8: Commit**

```bash
git add .eslintrc.json package.json package-lock.json components app
git commit -m "lint(front): add ESLint config and clear its 7 warnings"
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

let raw;
try {
  raw = execFileSync(
    path.join('node_modules', '.bin', 'eslint'),
    ['{src,apps,libs,test}/**/*.ts', '--format', 'json'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
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
    ? `PASS  ${RULE}: ${total} (cap ${CAP}) — lower CAP to ${total} in scripts/any-budget.cjs`
    : `PASS  ${RULE}: ${total} (at cap ${CAP})`,
);
```

- [ ] **Step 2: Add the script entry**

```json
    "lint:budget": "node scripts/any-budget.cjs",
```

- [ ] **Step 3: Run it — expect PASS at the cap**

```bash
npm run lint:budget; echo "exit=$?"
```
Expected: `PASS  @typescript-eslint/no-explicit-any: 117 (at cap 117)` and `exit=0`.

If the count is not 117, do not adjust the cap to match blindly — first check whether Task 2 changed an `any` by accident.

- [ ] **Step 4: Prove it actually fails**

```bash
sed -i 's/const CAP = 117;/const CAP = 116;/' scripts/any-budget.cjs
npm run lint:budget; echo "exit=$?"
sed -i 's/const CAP = 116;/const CAP = 117;/' scripts/any-budget.cjs
```
Expected: `FAIL … 117 (cap 116, +1)`, a per-file table, and `exit=1`.

A budget that only ever prints PASS proves nothing. This step is the test.

- [ ] **Step 5: Prove the crash path fails loudly**

```bash
mv .eslintrc.json .eslintrc.json.bak
npm run lint:budget; echo "exit=$?"
mv .eslintrc.json.bak .eslintrc.json
```
Expected: `eslint failed to run:` with ESLint's own message, and `exit=1` — **not** a count of zero. Confirm `npm run lint:budget` passes again afterwards.

- [ ] **Step 6: Commit**

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
- Produces: a blocking `lint` job.

- [ ] **Step 1: Add the job**

In `.github/workflows/ci.yml`, alongside `backend` and `frontend`:

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
          cache-dependency-path: new-implementation/backend/package-lock.json
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

Both apps run in one job so the workflow gains a single required check rather than two.

- [ ] **Step 2: Verify the workflow parses**

```bash
python3 -c "import yaml,sys; d=yaml.safe_load(open('.github/workflows/ci.yml')); print(sorted(d['jobs'].keys()))"
```
Expected: the job list now includes `lint`.

- [ ] **Step 3: Verify nothing mutates**

From the repo root, run what CI runs and confirm a clean tree:

```bash
( cd new-implementation/backend  && npm run lint:ci && npm run lint:budget )
( cd new-implementation/frontend && npm run lint:ci )
git status --porcelain          # expect empty
```

An empty `git status` here is the proof that no `--fix` snuck into the CI path.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: gate both apps on lint and the any budget"
```

---

### Task 5: Close out the spec

**Files:**
- Modify: `docs/specs/SPEC-BACK-002-lint-gating.md`

**Interfaces:** none.

- [ ] **Step 1: Tick the acceptance list**

Mark each `- [ ]` in §4 the work satisfies. The last item — "no file is reformatted" — is checked by reading the PR diff for whitespace-only hunks, not by a command.

- [ ] **Step 2: Update the status line**

Per the convention in `CLAUDE.md`, the status line is the ledger and carries its evidence:

```markdown
**Status**: DONE — 2026-08-09 (PR #NN). Both apps linted and gating in CI; frontend at 0 errors / 0 warnings; backend at 0 errors with no-explicit-any capped at 117 and falling. Nothing reformatted.
```

If the `any` count ended below 117, say the real number. Never `IMPLEMENTED` — Kairos maps it to Done.

- [ ] **Step 3: Commit**

```bash
git add docs/specs/SPEC-BACK-002-lint-gating.md
git commit -m "docs(specs): record BACK-002 outcome in the status line"
```

---

## Notes for the PR

Put `Closes POS-BACK-002` in the body if the work completes the spec — a bare mention of the id does nothing.

Reviewers should check two things specifically: that every `eslint-disable` added in Task 1 carries a reason, and that the diff contains no whitespace-only hunks. Those are the two ways this particular PR can go wrong while still being green.

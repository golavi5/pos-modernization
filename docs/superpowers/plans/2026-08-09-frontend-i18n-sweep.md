# Frontend i18n Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the 40 remaining frontend files and make the problem non-recurring with a ratcheting CI check.

**Architecture:** Task 1 lands a node check that fails on any `.tsx` carrying hardcoded strings without `useTranslations`, with an allowlist seeded with today's 40 offenders, gated in CI immediately. Every later task is one domain batch, and each begins by **deleting its files from the allowlist** — which turns the check red — then translates until it is green again. The ratchet is the failing test.

**Tech Stack:** Next.js 14, next-intl, plain node scripts (no test runner in this app), GitHub Actions.

## Global Constraints

- Every key exists in **both** `messages/es.json` and `messages/en.json`. `scripts/smoke/i18n-parity.cjs` (shipped in #39) enforces it.
- Reuse existing namespaces — `reports`, `customers`, `inventory`, `products`, `sales`, `users`, `notifications`, `settings`, `dashboard`, `common`. Do not invent a parallel namespace for a domain that already has one.
- **Where a literal already exists as a catalog value, reuse that key.** 78 of the 223 visible literals already do. Adding a synonym leaves two keys to drift apart.
- Keys are camelCase, grouped by the component that uses them.
- `placeholder`, `aria-label` and `title` strings count as literals.
- **No behaviour changes.** This is a translation sweep. If a batch uncovers a bug, note it in the PR and file it separately.
- `npm run lint` cannot run (no ESLint config — `SPEC-CUT-001` S-01). `npm run build` is the typecheck gate.
- Playwright cannot run without a live stack. The two node checks are the executable gate and run anywhere.
- All commands run from `new-implementation/frontend`.

---

### Task 1: The ratchet

Lands the check, the allowlist, and the CI job. Nothing is translated yet — the allowlist makes today's debt pass while any *new* offender fails from this commit on.

**Files:**
- Create: `scripts/smoke/i18n-lint.cjs`
- Modify: `.github/workflows/ci.yml` (repo root)

**Interfaces:**
- Consumes: nothing.
- Produces: `node scripts/smoke/i18n-lint.cjs` — exit 0 clean, exit 1 with one `FAIL` line per offending file. Every later task depends on this exact command and on the `ALLOWLIST` constant being an editable array of repo-relative paths.

- [ ] **Step 1: Write the check**

Create `scripts/smoke/i18n-lint.cjs`:

```javascript
// Fails on any .tsx that carries user-facing strings without calling
// useTranslations. ALLOWLIST holds the files that already do, so the gate can
// be blocking while the sweep is still in progress.
//
// THE ALLOWLIST MAY ONLY SHRINK. Each domain batch of SPEC-FRONT-002 deletes its
// own files. An addition means something went backwards.
//
// Known limitation: a file that calls useTranslations is exempt entirely, so a
// partially-translated file passes. Catching those needs per-string analysis;
// this check is deliberately the cheap version that cannot produce false alarms
// on translated files.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DIRS = ['app', 'components'];

const ALLOWLIST = new Set([
  'app/(panel)/customers/page.tsx',
  'app/(panel)/dashboard/page.tsx',
  'app/(panel)/inventory/page.tsx',
  'app/(panel)/notifications/page.tsx',
  'app/(panel)/reports/page.tsx',
  'app/(panel)/settings/page.tsx',
  'app/(panel)/users/page.tsx',
  'components/customers/CustomerFilters.tsx',
  'components/customers/CustomerForm.tsx',
  'components/customers/CustomersTable.tsx',
  'components/customers/LoyaltyPointsModal.tsx',
  'components/dashboard/QuickActions.tsx',
  'components/inventory/AdjustStockModal.tsx',
  'components/inventory/InventoryFilters.tsx',
  'components/inventory/StockMovements.tsx',
  'components/inventory/StockTable.tsx',
  'components/layout/AuthLayout.tsx',
  'components/notifications/NotificationBell.tsx',
  'components/products/ProductCard.tsx',
  'components/products/ProductFormFields.tsx',
  'components/products/ProductList.tsx',
  'components/products/ProductsTable.tsx',
  'components/products/StockBadge.tsx',
  'components/reports/CustomerReportTab.tsx',
  'components/reports/InventoryReportTab.tsx',
  'components/reports/ProductReportTab.tsx',
  'components/reports/ReportFilters.tsx',
  'components/reports/SalesReportTab.tsx',
  'components/sales/CashPaymentSection.tsx',
  'components/sales/CustomerSelect.tsx',
  'components/sales/PaymentModal.tsx',
  'components/sales/PaymentSuccessScreen.tsx',
  'components/sales/ProductSearch.tsx',
  'components/sales/SalesCart.tsx',
  'components/theme/ThemeToggle.tsx',
  'components/ui/slide-over.tsx',
  'components/users/AssignRolesModal.tsx',
  'components/users/ResetPasswordModal.tsx',
  'components/users/UserForm.tsx',
  'components/users/UsersTable.tsx',
]);

const HAS_LETTERS = /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function literals(src) {
  const found = [];
  for (const m of src.matchAll(/>([^<>{}\n]{3,60})</g)) {
    if (HAS_LETTERS.test(m[1])) found.push(m[1].trim());
  }
  for (const m of src.matchAll(/(?:placeholder|aria-label|title)="([^"]{2,60})"/g)) {
    if (HAS_LETTERS.test(m[1])) found.push(m[1].trim());
  }
  return [...new Set(found)];
}

let violations = 0;
let stale = 0;

for (const dir of DIRS) {
  for (const abs of walk(path.join(ROOT, dir))) {
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    const src = fs.readFileSync(abs, 'utf8');
    const found = src.includes('useTranslations') ? [] : literals(src);
    const listed = ALLOWLIST.has(rel);

    if (found.length && !listed) {
      violations++;
      console.log(`FAIL  ${rel}: ${found.length} hardcoded string(s), no useTranslations`);
      for (const l of found.slice(0, 5)) console.log(`        ${JSON.stringify(l)}`);
    } else if (!found.length && listed) {
      stale++;
      console.log(`STALE ${rel}: allowlisted but clean — delete it from ALLOWLIST`);
    }
  }
}

if (violations || stale) {
  console.log(`FAIL  ${violations} offending file(s), ${stale} stale allowlist entr(ies)`);
  process.exit(1);
}
console.log(`PASS  no hardcoded strings outside the allowlist (${ALLOWLIST.size} remaining)`);
```

- [ ] **Step 2: Prove it passes today and fails on a new offender**

```bash
node scripts/smoke/i18n-lint.cjs
```
Expected: `PASS  no hardcoded strings outside the allowlist (40 remaining)`.

Now prove it actually catches something:

```bash
printf 'export function Probe() {\n  return <div>Hardcoded probe text</div>;\n}\n' > components/Probe.tsx
node scripts/smoke/i18n-lint.cjs; echo "exit=$?"
rm components/Probe.tsx
```
Expected: `FAIL  components/Probe.tsx: 1 hardcoded string(s)…` and `exit=1`.

A check that only ever prints PASS is worthless — this step is what proves it is wired to reality.

- [ ] **Step 3: Prove the stale-entry branch works**

```bash
sed -i "s|'components/theme/ThemeToggle.tsx',|'components/theme/ThemeToggle.tsx',\n  'components/providers/QueryProvider.tsx',|" scripts/smoke/i18n-lint.cjs
node scripts/smoke/i18n-lint.cjs; echo "exit=$?"
git checkout scripts/smoke/i18n-lint.cjs 2>/dev/null || sed -i "/QueryProvider.tsx',/d" scripts/smoke/i18n-lint.cjs
```
Expected: `STALE components/providers/QueryProvider.tsx: allowlisted but clean…` and `exit=1`. Then confirm `node scripts/smoke/i18n-lint.cjs` is back to PASS.

- [ ] **Step 4: Add the key-suggestion helper**

Every batch needs to know which of its literals already exist in the catalog.
Create `scripts/smoke/i18n-suggest.cjs` so no task has to repeat the lookup:

```javascript
// Usage: node scripts/smoke/i18n-suggest.cjs <file.tsx> [...]
// Prints one line per literal: REUSE <existing.key> when the exact string is
// already a value in es.json, otherwise NEW. Reusing beats authoring a synonym
// that later drifts from its twin.
const fs = require('fs');

const es = JSON.parse(fs.readFileSync('messages/es.json', 'utf8'));
const byValue = {};
(function walk(obj, prefix) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') walk(v, `${prefix}${k}.`);
    else if (typeof v === 'string' && !(v.trim() in byValue)) byValue[v.trim()] = `${prefix}${k}`;
  }
})(es, '');

const HAS_LETTERS = /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/;

for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  const found = new Set();
  for (const m of src.matchAll(/>([^<>{}\n]{3,60})</g)) if (HAS_LETTERS.test(m[1])) found.add(m[1].trim());
  for (const m of src.matchAll(/(?:placeholder|aria-label|title)="([^"]{2,60})"/g)) if (HAS_LETTERS.test(m[1])) found.add(m[1].trim());
  for (const lit of found) {
    const key = byValue[lit];
    console.log(`${(key ? `REUSE ${key}` : 'NEW').padEnd(30)} ${file}  ${JSON.stringify(lit)}`);
  }
}
```

Verify it works before relying on it:

```bash
node scripts/smoke/i18n-suggest.cjs "app/(panel)/settings/page.tsx" | head -5
```
Expected: `REUSE settings.<something>` lines — that page's visible literals are all already in the catalog, so a run of `NEW` here means the script is broken, not that the keys are missing.

- [ ] **Step 5: Add the CI job**

In `.github/workflows/ci.yml`, add a job alongside `backend` and `frontend`. It needs no `npm ci` — both checks are dependency-free node scripts, so the job runs in seconds:

```yaml
  i18n:
    name: Frontend — i18n checks
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./new-implementation/frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: node scripts/smoke/i18n-parity.cjs
      - run: node scripts/smoke/i18n-lint.cjs
```

- [ ] **Step 6: Verify both checks and the build**

```bash
node scripts/smoke/i18n-parity.cjs   # expect PASS, keys in sync
node scripts/smoke/i18n-lint.cjs     # expect PASS, 40 remaining
npm run build                        # expect ✓ Compiled successfully
```

- [ ] **Step 7: Commit**

```bash
git add scripts/smoke/i18n-lint.cjs scripts/smoke/i18n-suggest.cjs ../../.github/workflows/ci.yml
git commit -m "ci(front): ratchet against new hardcoded strings"
```

---

### Task 2: reports (6 files, heaviest)

65 visible literals, only 11 already keyed — 54 new. The `reports` namespace holds 6 keys today. Sequenced first while attention is freshest.

**Files:**
- Modify: `components/reports/SalesReportTab.tsx`, `components/reports/InventoryReportTab.tsx`, `components/reports/CustomerReportTab.tsx`, `components/reports/ProductReportTab.tsx`, `components/reports/ReportFilters.tsx`, `app/(panel)/reports/page.tsx`
- Modify: `messages/es.json`, `messages/en.json`
- Modify: `scripts/smoke/i18n-lint.cjs` (delete these 6 from `ALLOWLIST`)

**Interfaces:**
- Consumes: `node scripts/smoke/i18n-lint.cjs` from Task 1.
- Produces: a populated `reports` namespace in both catalogs. No later task depends on its key names.

- [ ] **Step 1: Delete this batch from the allowlist — this is the failing test**

Remove these six lines from `ALLOWLIST` in `scripts/smoke/i18n-lint.cjs`:

```
  'app/(panel)/reports/page.tsx',
  'components/reports/CustomerReportTab.tsx',
  'components/reports/InventoryReportTab.tsx',
  'components/reports/ProductReportTab.tsx',
  'components/reports/ReportFilters.tsx',
  'components/reports/SalesReportTab.tsx',
```

- [ ] **Step 2: Run it to see the work**

```bash
node scripts/smoke/i18n-lint.cjs; echo "exit=$?"
```
Expected: `exit=1`, six `FAIL` lines, each listing the first five literals in that file. That list is the task.

- [ ] **Step 3: Find which literals already have keys**

```bash
node scripts/smoke/i18n-suggest.cjs components/reports/*.tsx "app/(panel)/reports/page.tsx"
```

Every `REUSE` line is a key that already exists — use it rather than authoring a synonym.

- [ ] **Step 4: Add the new keys to both catalogs**

Extend the `reports` namespace in `messages/es.json` and `messages/en.json` with a key for every `NEW` literal from Step 3. Group by component, camelCase, e.g.:

```json
"reports": {
  "salesTab": { "title": "Ventas por período", "noData": "Sin datos para el rango" },
  "filters": { "from": "Desde", "to": "Hasta", "apply": "Aplicar" }
}
```

```json
"reports": {
  "salesTab": { "title": "Sales by period", "noData": "No data for this range" },
  "filters": { "from": "From", "to": "To", "apply": "Apply" }
}
```

- [ ] **Step 5: Wire the six files**

Add `const t = useTranslations('reports');` to each and swap every literal for `t('key')`. Follow `components/products/ProductFilters.tsx` — it is the house pattern. Cover `placeholder`, `aria-label` and `title` attributes, not only text between tags.

- [ ] **Step 6: Verify**

```bash
node scripts/smoke/i18n-lint.cjs     # expect PASS, 34 remaining
node scripts/smoke/i18n-parity.cjs   # expect PASS, keys in sync
npm run build                        # expect ✓ Compiled successfully
```

- [ ] **Step 7: Commit**

```bash
git add components/reports "app/(panel)/reports" messages scripts/smoke/i18n-lint.cjs
git commit -m "i18n(front): translate the reports module"
```

---

### Task 3: customers (5 files)

33 visible literals, 18 already keyed — 15 new. The `customers` namespace holds 39 keys, so expect a high reuse rate.

**Files:**
- Modify: `components/customers/CustomerFilters.tsx`, `components/customers/CustomerForm.tsx`, `components/customers/CustomersTable.tsx`, `components/customers/LoyaltyPointsModal.tsx`, `app/(panel)/customers/page.tsx`
- Modify: `messages/es.json`, `messages/en.json`, `scripts/smoke/i18n-lint.cjs`

**Interfaces:**
- Consumes: `node scripts/smoke/i18n-lint.cjs` from Task 1.
- Produces: a completed `customers` namespace. No later task depends on it.

- [ ] **Step 1: Delete this batch from the allowlist**

Remove these five lines from `ALLOWLIST`:

```
  'app/(panel)/customers/page.tsx',
  'components/customers/CustomerFilters.tsx',
  'components/customers/CustomerForm.tsx',
  'components/customers/CustomersTable.tsx',
  'components/customers/LoyaltyPointsModal.tsx',
```

- [ ] **Step 2: Run it to see the work**

```bash
node scripts/smoke/i18n-lint.cjs; echo "exit=$?"
```
Expected: `exit=1`, five `FAIL` lines.

- [ ] **Step 3: Find which literals already have keys**

```bash
node scripts/smoke/i18n-suggest.cjs components/customers/*.tsx "app/(panel)/customers/page.tsx"
```

- [ ] **Step 4: Add the new keys to both catalogs**

Extend `customers` in both files with a key per `NEW` literal, camelCase, grouped by component.

- [ ] **Step 5: Wire the five files**

`const t = useTranslations('customers');` in each; swap literals including attributes.

- [ ] **Step 6: Verify**

```bash
node scripts/smoke/i18n-lint.cjs     # expect PASS, 29 remaining
node scripts/smoke/i18n-parity.cjs   # expect PASS
npm run build                        # expect ✓ Compiled successfully
```

- [ ] **Step 7: Commit**

```bash
git add components/customers "app/(panel)/customers" messages scripts/smoke/i18n-lint.cjs
git commit -m "i18n(front): translate the customers module"
```

---

### Task 4: inventory (5 files)

30 visible literals, 7 already keyed — 23 new against a 16-key namespace.

**Files:**
- Modify: `components/inventory/AdjustStockModal.tsx`, `components/inventory/InventoryFilters.tsx`, `components/inventory/StockMovements.tsx`, `components/inventory/StockTable.tsx`, `app/(panel)/inventory/page.tsx`
- Modify: `messages/es.json`, `messages/en.json`, `scripts/smoke/i18n-lint.cjs`

**Interfaces:**
- Consumes: `node scripts/smoke/i18n-lint.cjs` from Task 1.
- Produces: a completed `inventory` namespace.

- [ ] **Step 1: Delete this batch from the allowlist**

```
  'app/(panel)/inventory/page.tsx',
  'components/inventory/AdjustStockModal.tsx',
  'components/inventory/InventoryFilters.tsx',
  'components/inventory/StockMovements.tsx',
  'components/inventory/StockTable.tsx',
```

- [ ] **Step 2: Run it to see the work**

```bash
node scripts/smoke/i18n-lint.cjs; echo "exit=$?"
```
Expected: `exit=1`, five `FAIL` lines.

- [ ] **Step 3: Find which literals already have keys**

```bash
node scripts/smoke/i18n-suggest.cjs components/inventory/*.tsx "app/(panel)/inventory/page.tsx"
```

- [ ] **Step 4: Add the new keys to both catalogs**

Extend `inventory` in both files. Stock-movement reason codes are data, not copy — if a value comes from the API, leave it alone and note it in the PR.

- [ ] **Step 5: Wire the five files**

`const t = useTranslations('inventory');` in each; swap literals including attributes.

- [ ] **Step 6: Verify**

```bash
node scripts/smoke/i18n-lint.cjs     # expect PASS, 24 remaining
node scripts/smoke/i18n-parity.cjs   # expect PASS
npm run build                        # expect ✓ Compiled successfully
```

- [ ] **Step 7: Commit**

```bash
git add components/inventory "app/(panel)/inventory" messages scripts/smoke/i18n-lint.cjs
git commit -m "i18n(front): translate the inventory module"
```

---

### Task 5: products (5 files)

27 visible literals, 7 already keyed — 20 new. Note `products` already holds 66 keys from the FRONT-001 work, so check for reuse carefully before adding.

**Files:**
- Modify: `components/products/ProductCard.tsx`, `components/products/ProductFormFields.tsx`, `components/products/ProductList.tsx`, `components/products/ProductsTable.tsx`, `components/products/StockBadge.tsx`
- Modify: `messages/es.json`, `messages/en.json`, `scripts/smoke/i18n-lint.cjs`

**Interfaces:**
- Consumes: `node scripts/smoke/i18n-lint.cjs` from Task 1.
- Produces: a completed `products` namespace.

- [ ] **Step 1: Delete this batch from the allowlist**

```
  'components/products/ProductCard.tsx',
  'components/products/ProductFormFields.tsx',
  'components/products/ProductList.tsx',
  'components/products/ProductsTable.tsx',
  'components/products/StockBadge.tsx',
```

- [ ] **Step 2: Run it to see the work**

```bash
node scripts/smoke/i18n-lint.cjs; echo "exit=$?"
```
Expected: `exit=1`. `ProductCard.tsx` and `StockBadge.tsx` have no visible literals — they appear because of attribute strings, so read the FAIL lines rather than assuming.

- [ ] **Step 3: Find which literals already have keys**

```bash
node scripts/smoke/i18n-suggest.cjs components/products/*.tsx
```

- [ ] **Step 4: Add the new keys to both catalogs**

Extend `products` in both files.

- [ ] **Step 5: Wire the five files**

`const t = useTranslations('products');` in each; swap literals including attributes.

- [ ] **Step 6: Verify**

```bash
node scripts/smoke/i18n-lint.cjs     # expect PASS, 19 remaining
node scripts/smoke/i18n-parity.cjs   # expect PASS
npm run build                        # expect ✓ Compiled successfully
```

- [ ] **Step 7: Commit**

```bash
git add components/products messages scripts/smoke/i18n-lint.cjs
git commit -m "i18n(front): translate the products components"
```

---

### Task 6: sales (6 files)

21 visible literals, only 4 already keyed — 17 new. This is the cashier's screen; wording matters more here than anywhere else, so prefer the exact existing Spanish over a tidier rewrite.

**Files:**
- Modify: `components/sales/CashPaymentSection.tsx`, `components/sales/CustomerSelect.tsx`, `components/sales/PaymentModal.tsx`, `components/sales/PaymentSuccessScreen.tsx`, `components/sales/ProductSearch.tsx`, `components/sales/SalesCart.tsx`
- Modify: `messages/es.json`, `messages/en.json`, `scripts/smoke/i18n-lint.cjs`

**Interfaces:**
- Consumes: `node scripts/smoke/i18n-lint.cjs` from Task 1.
- Produces: a completed `sales` namespace.

- [ ] **Step 1: Delete this batch from the allowlist**

```
  'components/sales/CashPaymentSection.tsx',
  'components/sales/CustomerSelect.tsx',
  'components/sales/PaymentModal.tsx',
  'components/sales/PaymentSuccessScreen.tsx',
  'components/sales/ProductSearch.tsx',
  'components/sales/SalesCart.tsx',
```

- [ ] **Step 2: Run it to see the work**

```bash
node scripts/smoke/i18n-lint.cjs; echo "exit=$?"
```
Expected: `exit=1`, six `FAIL` lines.

- [ ] **Step 3: Find which literals already have keys**

```bash
node scripts/smoke/i18n-suggest.cjs components/sales/*.tsx
```

- [ ] **Step 4: Add the new keys to both catalogs**

Extend `sales` in both files. Currency symbols and amounts are formatted values, not copy — leave them.

- [ ] **Step 5: Wire the six files**

`const t = useTranslations('sales');` in each; swap literals including attributes.

- [ ] **Step 6: Verify**

```bash
node scripts/smoke/i18n-lint.cjs     # expect PASS, 13 remaining
node scripts/smoke/i18n-parity.cjs   # expect PASS
npm run build                        # expect ✓ Compiled successfully
```

- [ ] **Step 7: Commit**

```bash
git add components/sales messages scripts/smoke/i18n-lint.cjs
git commit -m "i18n(front): translate the sales module"
```

---

### Task 7: users (5 files)

17 visible literals, 5 already keyed — 12 new.

**Files:**
- Modify: `components/users/AssignRolesModal.tsx`, `components/users/ResetPasswordModal.tsx`, `components/users/UserForm.tsx`, `components/users/UsersTable.tsx`, `app/(panel)/users/page.tsx`
- Modify: `messages/es.json`, `messages/en.json`, `scripts/smoke/i18n-lint.cjs`

**Interfaces:**
- Consumes: `node scripts/smoke/i18n-lint.cjs` from Task 1.
- Produces: a completed `users` namespace.

- [ ] **Step 1: Delete this batch from the allowlist**

```
  'app/(panel)/users/page.tsx',
  'components/users/AssignRolesModal.tsx',
  'components/users/ResetPasswordModal.tsx',
  'components/users/UserForm.tsx',
  'components/users/UsersTable.tsx',
```

- [ ] **Step 2: Run it to see the work**

```bash
node scripts/smoke/i18n-lint.cjs; echo "exit=$?"
```
Expected: `exit=1`, five `FAIL` lines.

- [ ] **Step 3: Find which literals already have keys**

```bash
node scripts/smoke/i18n-suggest.cjs components/users/*.tsx "app/(panel)/users/page.tsx"
```

- [ ] **Step 4: Add the new keys to both catalogs**

Extend `users` in both files. **Role names are data** — they come from the API and are asserted against by the backend drift guard. Translate the *labels around* them, never the role strings themselves.

- [ ] **Step 5: Wire the five files**

`const t = useTranslations('users');` in each; swap literals including attributes.

- [ ] **Step 6: Verify**

```bash
node scripts/smoke/i18n-lint.cjs     # expect PASS, 8 remaining
node scripts/smoke/i18n-parity.cjs   # expect PASS
npm run build                        # expect ✓ Compiled successfully
```

- [ ] **Step 7: Commit**

```bash
git add components/users "app/(panel)/users" messages scripts/smoke/i18n-lint.cjs
git commit -m "i18n(front): translate the users module"
```

---

### Task 8: settings, dashboard and notifications (5 files)

The cheap batch: `settings/page.tsx` has 13 visible literals and **all 13 already exist as catalog values**, and both notifications literals are keyed too. Mostly wiring.

**Files:**
- Modify: `app/(panel)/settings/page.tsx`, `app/(panel)/dashboard/page.tsx`, `components/dashboard/QuickActions.tsx`, `app/(panel)/notifications/page.tsx`, `components/notifications/NotificationBell.tsx`
- Modify: `messages/es.json`, `messages/en.json`, `scripts/smoke/i18n-lint.cjs`

**Interfaces:**
- Consumes: `node scripts/smoke/i18n-lint.cjs` from Task 1.
- Produces: completed `settings`, `dashboard` and `notifications` namespaces.

- [ ] **Step 1: Delete this batch from the allowlist**

```
  'app/(panel)/dashboard/page.tsx',
  'app/(panel)/notifications/page.tsx',
  'app/(panel)/settings/page.tsx',
  'components/dashboard/QuickActions.tsx',
  'components/notifications/NotificationBell.tsx',
```

- [ ] **Step 2: Run it to see the work**

```bash
node scripts/smoke/i18n-lint.cjs; echo "exit=$?"
```
Expected: `exit=1`, five `FAIL` lines.

- [ ] **Step 3: Find which literals already have keys**

```bash
node scripts/smoke/i18n-suggest.cjs "app/(panel)/settings/page.tsx" "app/(panel)/dashboard/page.tsx" "app/(panel)/notifications/page.tsx" components/dashboard/QuickActions.tsx components/notifications/NotificationBell.tsx
```

Expect almost every settings line to come back `REUSE`. If one does not, check for a trailing-space or punctuation difference before authoring a new key.

- [ ] **Step 4: Add the few new keys to both catalogs**

Only for literals that came back `NEW`. Each page uses its own namespace: `settings`, `dashboard`, `notifications`.

- [ ] **Step 5: Wire the five files**

Add the matching `useTranslations(...)` call per file and swap literals including attributes.

- [ ] **Step 6: Verify**

```bash
node scripts/smoke/i18n-lint.cjs     # expect PASS, 3 remaining
node scripts/smoke/i18n-parity.cjs   # expect PASS
npm run build                        # expect ✓ Compiled successfully
```

- [ ] **Step 7: Commit**

```bash
git add "app/(panel)/settings" "app/(panel)/dashboard" "app/(panel)/notifications" components/dashboard components/notifications messages scripts/smoke/i18n-lint.cjs
git commit -m "i18n(front): translate settings, dashboard and notifications"
```

---

### Task 9: shared components — empties the allowlist (3 files)

`AuthLayout`, `ThemeToggle` and `slide-over` are shared shell pieces. This batch takes the allowlist to zero, which is the spec's headline acceptance item.

**Files:**
- Modify: `components/layout/AuthLayout.tsx`, `components/theme/ThemeToggle.tsx`, `components/ui/slide-over.tsx`
- Modify: `messages/es.json`, `messages/en.json`, `scripts/smoke/i18n-lint.cjs`

**Interfaces:**
- Consumes: `node scripts/smoke/i18n-lint.cjs` from Task 1.
- Produces: an empty `ALLOWLIST`.

- [ ] **Step 1: Delete the last three entries, leaving `ALLOWLIST` empty**

```javascript
const ALLOWLIST = new Set([]);
```

- [ ] **Step 2: Run it to see the work**

```bash
node scripts/smoke/i18n-lint.cjs; echo "exit=$?"
```
Expected: `exit=1`, three `FAIL` lines.

- [ ] **Step 3: Find which literals already have keys**

```bash
node scripts/smoke/i18n-suggest.cjs components/layout/AuthLayout.tsx components/theme/ThemeToggle.tsx components/ui/slide-over.tsx
```

- [ ] **Step 4: Add keys to both catalogs**

`ThemeToggle` belongs in the existing `theme` namespace (4 keys) and `slide-over` in `common` (29 keys) — it is a generic UI primitive, not a feature. `AuthLayout` belongs in `auth`.

- [ ] **Step 5: Wire the three files**

Add the matching `useTranslations(...)` call per file and swap literals including attributes.

- [ ] **Step 6: Verify the allowlist is empty and everything is green**

```bash
node scripts/smoke/i18n-lint.cjs     # expect PASS, 0 remaining
node scripts/smoke/i18n-parity.cjs   # expect PASS
npm run build                        # expect ✓ Compiled successfully
grep -c "'.*\.tsx'," scripts/smoke/i18n-lint.cjs   # expect 0
```

- [ ] **Step 7: Commit**

```bash
git add components/layout components/theme components/ui messages scripts/smoke/i18n-lint.cjs
git commit -m "i18n(front): translate the shared components, empty the allowlist"
```

---

### Task 10: Close out the spec

**Files:**
- Modify: `docs/specs/SPEC-FRONT-002-frontend-i18n-sweep.md`

**Interfaces:** none.

- [ ] **Step 1: Walk every domain in both locales**

The spec's acceptance asks for this per domain, not once — a sweep that missed a
file shows up here and nowhere else, because the ratchet only proves a file calls
`useTranslations`, not that every string in it was actually swapped.

```bash
cd ../..                       # new-implementation
docker compose up -d           # backend + db + frontend
```

Log in, then for each of the eight batches — reports, customers, inventory,
products, sales, users, settings/dashboard/notifications, shared shell — open its
screen, switch locale with the header switcher, and confirm the text changes.
Note any screen where part of the page switches and part does not: that is a
partially-translated file, which the ratchet cannot catch by design.

If no stack can be brought up, **say so explicitly in Step 2's status line**
rather than ticking the acceptance item. An unrun check is not a passed one.

- [ ] **Step 2: Tick the acceptance list**

Mark each `- [ ]` in §5 the work satisfies. Leave unticked anything unverified — in particular the manual locale switch if you could not run the app.

- [ ] **Step 3: Update the status line**

Per the convention in `CLAUDE.md`, the status line is the ledger and carries its evidence:

```markdown
**Status**: DONE — 2026-08-09 (PR #NN). 40 files translated across 8 domain batches; i18n-lint allowlist empty and both checks gating in CI. <Say here whether the locale switch was exercised in a browser or only reasoned about.>
```

Use `APPROVED` with the gap named if any batch is unfinished. Never `IMPLEMENTED` — Kairos maps it to Done.

- [ ] **Step 4: Commit**

```bash
git add docs/specs/SPEC-FRONT-002-frontend-i18n-sweep.md
git commit -m "docs(specs): record FRONT-002 outcome in the status line"
```

---

## Notes for the PR

Put `Closes POS-FRONT-002` in the body if the work completes the spec. A bare mention of the id does nothing — the merge handler promotes an issue to Done only on an explicit closing keyword.

If the sweep is split across several PRs, only the last one should carry the closing keyword.

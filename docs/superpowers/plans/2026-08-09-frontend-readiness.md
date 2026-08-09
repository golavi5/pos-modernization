# Frontend Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app shell usable without a pointer, and remove the last hardcoded route labels.

**Architecture:** The sidebar rail keeps its CSS hover-expand and gains two more ways to open — `focus-within` (keyboard) and a persisted pin (touch, and mouse users who want labels to stay). Pin state lives in a new Zustand store mirroring `authStore`'s `persist` setup. Separately, the header breadcrumb stops hand-copying Spanish labels and reads the shared `NAV_ITEMS` table that #35's review pass introduced.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind, Zustand + `zustand/middleware` persist, next-intl, Playwright.

## Global Constraints

- **No component over 200 lines** (`CLAUDE.md`). `Sidebar.tsx` is 130 lines today; keep the pin button small or extract it.
- **Schema first:** define types before implementation.
- **Both message catalogs stay in sync.** Every new key exists in `messages/es.json` *and* `messages/en.json`. Spanish is the default locale.
- **Theme tokens only** — `bg-card`, `border-border`, `text-muted-foreground`, etc. No raw hex.
- **Tailwind is 3.4.19** (verified in `node_modules`), so the `group-data-[attr=value]:` variant used in Task 2 is supported — it needs ≥3.2.
- **Frontend only.** No backend change in this plan.
- **`npm run lint` cannot run** — `next lint` drops into interactive ESLint setup because no config exists (SPEC-CUT-001 S-01). **`npm run build` is the gate**; it typechecks.
- **There is no unit-test runner.** Pure logic is verified by the compiled smoke pattern in Task 3; UI behaviour by Playwright specs that **cannot execute without a running stack** (backend + DB + seeded admin). Write them; run them when a stack exists.
- **Playwright against the compose stack needs `BASE_URL=http://localhost:3001`.** The compose backend owns port 3000, and `playwright.config.ts` sets `webServer.url: http://localhost:3000` with `reuseExistingServer` — without the override, Playwright sees the NestJS backend answering on 3000, "reuses" it, and runs every spec against the wrong server. Prefix every Playwright command in this plan with `BASE_URL=http://localhost:3001` when the stack is the compose one.
- **Smoke scripts are `.cjs`, not `.mjs`.** They use `require`/`__dirname`, and Node parses `.mjs` as ESM where neither exists.
- All commands below run from `new-implementation/frontend`.

---

### Task 1: Keyboard reachability (CSS only)

Smallest shippable slice: a keyboard user can read nav labels. No state, no new files.

**Files:**
- Modify: `components/layout/DashboardLayout.tsx:13`
- Modify: `components/layout/Sidebar.tsx:42,110` (both `opacity-0` label spans — nav item and user name)
- Test: `tests/e2e/sidebar-reachability.spec.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing importable. Later tasks rely only on the CSS classes staying present.

- [ ] **Step 1: Write the failing test**

Create `tests/e2e/sidebar-reachability.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

test.describe('Sidebar reachability', () => {
  test.beforeEach(async ({ page }) => {
    await new AuthHelper(page).login();
  });

  test('reveals nav labels on keyboard focus, with no pointer', async ({ page }) => {
    const salesLabel = page.getByRole('link', { name: 'Ventas' }).locator('span');
    await expect(salesLabel).toHaveCSS('opacity', '0');

    await page.getByRole('link', { name: 'Ventas' }).focus();

    await expect(salesLabel).toHaveCSS('opacity', '1');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/sidebar-reachability.spec.ts --reporter=line`
Expected: FAIL — the label stays at `opacity: 0` because only `group-hover` reveals it.

If no stack is running, the run errors at `login()` instead. That is not a pass — bring a stack up (`docker compose up -d` from `new-implementation`, then run Playwright with `BASE_URL=http://localhost:3001` per Global Constraints) or record the step as blocked and verify by the Step 4 fallback.

- [ ] **Step 3: Add the focus-within variants**

`DashboardLayout.tsx:13` — add one class to the existing `aside`:

```tsx
<aside className="group relative flex-shrink-0 w-[52px] hover:w-[220px] focus-within:w-[220px] transition-[width] duration-200 ease-in-out border-r border-border bg-card overflow-hidden z-30">
```

`Sidebar.tsx:42` — add the matching label variant:

```tsx
      <span className="text-sm font-medium opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
        {label}
      </span>
```

`Sidebar.tsx:110` — the user-name span in the avatar button has the same `opacity-0 group-hover:opacity-100` pattern and needs the same variant, or the rail expands under keyboard focus with the user's name still invisible:

```tsx
              <span className="text-sm font-medium opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 truncate">
                {user?.name || 'Usuario'}
              </span>
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

Then re-run the Playwright spec if a stack is up. Fallback when it is not — assert the classes landed:

```bash
grep -c "focus-within:w-\[220px\]" components/layout/DashboardLayout.tsx   # expect 1
grep -c "group-focus-within:opacity-100" components/layout/Sidebar.tsx     # expect 2 (nav label + user name)
```

- [ ] **Step 5: Commit**

```bash
git add components/layout/DashboardLayout.tsx components/layout/Sidebar.tsx tests/e2e/sidebar-reachability.spec.ts
git commit -m "fix(front): reveal sidebar labels on keyboard focus"
```

---

### Task 2: Pin toggle, persisted

Touch terminals have no hover and no focus until something is tapped. The pin is the only path that works there.

**Files:**
- Create: `stores/uiStore.ts`
- Modify: `components/layout/DashboardLayout.tsx`
- Modify: `components/layout/Sidebar.tsx`
- Test: `tests/e2e/sidebar-reachability.spec.ts` (append)

**Interfaces:**
- Consumes: nothing from Task 1 beyond the classes staying in place.
- Produces: `useUIStore` from `@/stores/uiStore`, shape
  `{ sidebarPinned: boolean; toggleSidebarPinned: () => void }`. Task 3 does not use it.

- [ ] **Step 1: Write the failing tests**

Append to `tests/e2e/sidebar-reachability.spec.ts`, inside the existing `describe`:

```typescript
  test('pin keeps labels visible after the pointer leaves', async ({ page }) => {
    await page.getByTestId('sidebar-pin').click();
    await page.mouse.move(600, 400);

    await expect(page.getByRole('link', { name: 'Ventas' }).locator('span'))
      .toHaveCSS('opacity', '1');
  });

  test('pin survives a reload', async ({ page }) => {
    await page.getByTestId('sidebar-pin').click();
    await page.reload();
    await page.mouse.move(600, 400);

    await expect(page.getByTestId('sidebar-pin')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('link', { name: 'Ventas' }).locator('span'))
      .toHaveCSS('opacity', '1');
  });

  test('unpinning hides the labels again', async ({ page }) => {
    await page.getByTestId('sidebar-pin').click();
    await page.getByTestId('sidebar-pin').click();
    // The click leaves the pin button focused, and Task 1's focus-within
    // variants alone would keep the labels visible — blur before asserting,
    // or this test fails against a correct implementation.
    await page.getByTestId('sidebar-pin').blur();
    await page.mouse.move(600, 400);

    await expect(page.getByRole('link', { name: 'Ventas' }).locator('span'))
      .toHaveCSS('opacity', '0');
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx playwright test tests/e2e/sidebar-reachability.spec.ts --reporter=line`
Expected: FAIL — `sidebar-pin` does not exist, so the clicks time out.

- [ ] **Step 3: Create the store**

Create `stores/uiStore.ts`:

```typescript
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  /** Sidebar rail held open regardless of hover/focus. */
  sidebarPinned: boolean;
  toggleSidebarPinned: () => void;
}

/**
 * UI preferences. Deliberately separate from `authStore`: a display preference
 * must survive logout and must not be cleared by an auth reset.
 *
 * When `localStorage` is unavailable (private browsing), `persist` rehydration
 * fails silently and the default below stands — the sidebar then behaves
 * exactly as it did before the pin existed.
 */
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarPinned: false,
      toggleSidebarPinned: () => set((s) => ({ sidebarPinned: !s.sidebarPinned })),
    }),
    { name: 'ui-store' },
  ),
);
```

- [ ] **Step 4: Apply the pinned width**

In `DashboardLayout.tsx`, import the store and `cn`, then compose the class list:

```tsx
'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const sidebarPinned = useUIStore((s) => s.sidebarPinned);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside
        className={cn(
          'group relative flex-shrink-0 transition-[width] duration-200 ease-in-out border-r border-border bg-card overflow-hidden z-30',
          sidebarPinned ? 'w-[220px]' : 'w-[52px] hover:w-[220px] focus-within:w-[220px]',
        )}
        data-pinned={sidebarPinned}
      >
        <Sidebar />
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add the pin button and the third reveal condition**

In `Sidebar.tsx`, import `PanelLeftClose`, `PanelLeftOpen` from `lucide-react` and `useUIStore`.

Both label spans — the nav-item label and the user-name span from Task 1 — must now reveal when pinned too. Tailwind cannot see JS state, so drive it from the `data-pinned` attribute set in Step 4 — add this variant alongside the existing two, in both places:

```tsx
      <span className="text-sm font-medium opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-data-[pinned=true]:opacity-100 transition-opacity duration-150">
        {label}
      </span>
```

```tsx
              <span className="text-sm font-medium opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-data-[pinned=true]:opacity-100 transition-opacity duration-150 truncate">
                {user?.name || 'Usuario'}
              </span>
```

Add the pin control inside the logo row (`Sidebar.tsx:72-76`), so it sits in the 52px header strip:

```tsx
      <div className="flex items-center gap-2 h-[52px] px-2.5 border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          P
        </div>
        <button
          type="button"
          onClick={toggleSidebarPinned}
          aria-pressed={sidebarPinned}
          aria-label={sidebarPinned ? t('collapseSidebar') : t('expandSidebar')}
          data-testid="sidebar-pin"
          className="ml-auto rounded-md p-1 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-data-[pinned=true]:opacity-100 transition-opacity hover:bg-accent hover:text-foreground"
        >
          {sidebarPinned ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
      </div>
```

Read the state at the top of `Sidebar()`:

```tsx
  const sidebarPinned = useUIStore((s) => s.sidebarPinned);
  const toggleSidebarPinned = useUIStore((s) => s.toggleSidebarPinned);
```

`t` is the existing `useTranslations('sidebar')` — `expandSidebar` and `collapseSidebar` already exist in both catalogs, so no catalog change is needed.

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

Run: `wc -l components/layout/Sidebar.tsx`
Expected: under 200. If it is over, extract the pin button into `components/layout/SidebarPinButton.tsx`.

Re-run the Playwright spec if a stack is up. Fallback:

```bash
grep -c "aria-pressed" components/layout/Sidebar.tsx                       # expect 1
grep -c "group-data-\[pinned=true\]:opacity-100" components/layout/Sidebar.tsx  # expect 3 (nav label + user name + pin button)
```

- [ ] **Step 7: Commit**

```bash
git add stores/uiStore.ts components/layout/DashboardLayout.tsx components/layout/Sidebar.tsx tests/e2e/sidebar-reachability.spec.ts
git commit -m "feat(front): add a persisted sidebar pin for touch and mouse users"
```

---

### Task 3: Header breadcrumb reads the shared route table

`Header.ROUTE_LABELS` is the last hardcoded Spanish route table. #35's review pass moved the sidebar and the palette onto `NAV_ITEMS`; this finishes the job.

**Files:**
- Modify: `lib/navigation/nav-items.ts`
- Modify: `components/layout/Header.tsx:12-29` (delete `ROUTE_LABELS` and `getLabel`)
- Modify: `components/language/LanguageSwitcher.tsx` (add `data-testid="language-switcher"` to the trigger — it has none today)
- Modify: `.gitignore` (add `.smoke-out/`)
- Test: compiled smoke run (below) — this is pure logic, so it gets a real executable test
- Test: `tests/e2e/sidebar-reachability.spec.ts` (append the locale-switch spec in Step 6)

**Interfaces:**
- Consumes: `NAV_ITEMS`, `SETTINGS_NAV_ITEM` from `@/lib/navigation/nav-items`.
- Produces: `findNavLabelKey(pathname: string): string | undefined` from the same module.

- [ ] **Step 1: Write the failing test**

Create `scripts/smoke/nav-label-key.cjs` at the repo root of the frontend app:

```javascript
// Compiled-smoke harness: the frontend has no unit runner, so pure logic is
// compiled with tsc and exercised here. See Step 2 for the compile command.
// `.cjs` on purpose: this file uses require(), which does not exist in the
// ESM context Node gives `.mjs` files.
const Module = require('module');
const OUT = process.env.SMOKE_OUT;
const orig = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) {
  if (req.startsWith('@/')) req = OUT + '/' + req.slice(2);
  return orig.call(this, req, ...rest);
};

const { findNavLabelKey } = require(OUT + '/lib/navigation/nav-items.js');

let fail = 0;
const check = (name, got, want) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  got ${got}, want ${want}`}`);
};

check('exact route', findNavLabelKey('/sales'), 'sales');
check('nested route', findNavLabelKey('/products/123/edit'), 'products');
check('settings is matched too', findNavLabelKey('/settings'), 'settings');
check('unknown route', findNavLabelKey('/nope'), undefined);
check('root', findNavLabelKey('/'), undefined);
check('prefix is not a false match', findNavLabelKey('/salesperson'), undefined);

process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

```bash
mkdir -p /tmp/navsmoke
cat > /tmp/navsmoke/tsconfig.json <<'EOF'
{
  "extends": "<ABS_PATH_TO>/new-implementation/frontend/tsconfig.json",
  "compilerOptions": {
    "noEmit": false, "module": "commonjs", "target": "es2019", "jsx": "react",
    "moduleResolution": "node",
    "outDir": "<ABS_PATH_TO>/new-implementation/frontend/.smoke-out",
    "baseUrl": "<ABS_PATH_TO>/new-implementation/frontend",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["<ABS_PATH_TO>/new-implementation/frontend/lib/navigation/nav-items.ts"]
}
EOF
grep -qx '.smoke-out/' .gitignore || echo '.smoke-out/' >> .gitignore
npx tsc -p /tmp/navsmoke/tsconfig.json
SMOKE_OUT="$PWD/.smoke-out" node scripts/smoke/nav-label-key.cjs
```

Expected: FAIL — `findNavLabelKey is not a function`.

Two deliberate choices here:
- `moduleResolution: "node"` is set explicitly because the app's tsconfig uses `"bundler"`, which `tsc` rejects alongside `module: commonjs`.
- `outDir` lives **inside the frontend tree** (gitignored), not `/tmp`: `NAV_ITEMS` imports icon *values* from `lucide-react`, so the compiled module `require`s it at runtime, and Node resolves `node_modules` upward from the module's own path — output under `/tmp` dies with `MODULE_NOT_FOUND`. `SMOKE_OUT` must stay absolute (`$PWD/...`) because the harness passes it to `require()`, which resolves relative paths against the script's directory, not the cwd.

- [ ] **Step 3: Implement the lookup**

Append to `lib/navigation/nav-items.ts`:

```typescript
/**
 * Longest-prefix match from a pathname to its `sidebar` i18n key, so the header
 * breadcrumb names a route exactly as the sidebar and palette do.
 *
 * Matches the route itself or a path below it (`/products/123/edit` →
 * `products`) but never a sibling that merely shares a prefix
 * (`/salesperson` ↛ `/sales`). Returns `undefined` for unknown routes; the
 * breadcrumb then renders `POS` alone, as it does today.
 */
export function findNavLabelKey(pathname: string): string | undefined {
  const all = [...NAV_ITEMS, SETTINGS_NAV_ITEM];
  const match = all
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.labelKey;
}
```

- [ ] **Step 4: Run the smoke test to verify it passes**

```bash
npx tsc -p /tmp/navsmoke/tsconfig.json
SMOKE_OUT="$PWD/.smoke-out" node scripts/smoke/nav-label-key.cjs
```

Expected: 6 PASS, exit 0.

- [ ] **Step 5: Rewrite the header breadcrumb**

In `Header.tsx`, delete the `ROUTE_LABELS` constant and the `getLabel` function entirely (lines 12-29 of the current file), and replace the label derivation:

```tsx
import { findNavLabelKey } from '@/lib/navigation/nav-items';

export function Header() {
  const pathname = usePathname();
  const tNav = useTranslations('sidebar');
  const t = useTranslations('commandPalette');
  const labelKey = findNavLabelKey(pathname);
  const label = labelKey ? tNav(labelKey) : '';
  // ...rest unchanged
```

The JSX that renders `{label}` is unchanged.

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

```bash
grep -c "ROUTE_LABELS" components/layout/Header.tsx   # expect 0
grep -rn "'Ventas'\|'Productos'\|'Clientes'" components/layout/  # expect no matches
```

Then confirm the locale switch drives the breadcrumb — the acceptance item that
covers both this task and the sidebar. Append to
`tests/e2e/sidebar-reachability.spec.ts`:

```typescript
  test('locale switch changes the breadcrumb and the nav labels together', async ({ page }) => {
    await page.goto('/sales');
    await expect(page.getByRole('banner')).toContainText('Ventas');

    await page.getByTestId('language-switcher').click();
    await page.getByRole('menuitem', { name: /english/i }).click();

    await expect(page.getByRole('banner')).toContainText('Sales');
    await expect(page.getByRole('link', { name: 'Sales' })).toBeVisible();
  });
```

`LanguageSwitcher` exposes no `data-testid` today (verified) — add
`data-testid="language-switcher"` to its trigger `Button` rather than selecting
by visible text; the label itself is translated, so a text selector would break
in exactly the case this test exists to check. Its menu items render
`Español` / `English`, so `{ name: /english/i }` matches as written.

- [ ] **Step 7: Commit**

```bash
git add lib/navigation/nav-items.ts components/layout/Header.tsx \
  components/language/LanguageSwitcher.tsx scripts/smoke/nav-label-key.cjs \
  tests/e2e/sidebar-reachability.spec.ts .gitignore
git commit -m "refactor(front): breadcrumb reads the shared nav table, drops hardcoded labels"
```

---

### Task 4: Translate the two product pages

**Files:**
- Modify: `app/(panel)/products/page.tsx`
- Modify: `app/(panel)/products/new/page.tsx`
- Modify: `messages/es.json`, `messages/en.json`
- Create: `scripts/smoke/i18n-parity.cjs`

`app/(panel)/products/categories/page.tsx` is out of scope: it is an 8-line
wrapper around `<CategoryManager />`, and `components/products/CategoryManager.tsx`
— its only content — already uses `useTranslations('products')` for every
string it renders (translated in `c99fd6aa`, predating this plan). Nothing to
change here.

**Interfaces:**
- Consumes: `findNavLabelKey` is not used here. The `products` namespace already exists in both catalogs.
- Produces: nothing importable.

- [ ] **Step 1: Write the failing parity test**

Create `scripts/smoke/i18n-parity.cjs`:

```javascript
// Every key in one catalog must exist in the other. SPEC-FRONT-002 will add
// ~20 more translated files; this keeps them from drifting.
// `.cjs` on purpose: uses require()/__dirname, which don't exist in `.mjs`.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', '..', 'messages');
const es = JSON.parse(fs.readFileSync(path.join(dir, 'es.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

const esKeys = new Set(flatten(es));
const enKeys = new Set(flatten(en));
const missingInEn = [...esKeys].filter((k) => !enKeys.has(k));
const missingInEs = [...enKeys].filter((k) => !esKeys.has(k));

if (missingInEn.length) console.log('missing in en.json:', missingInEn);
if (missingInEs.length) console.log('missing in es.json:', missingInEs);
console.log(missingInEn.length || missingInEs.length ? 'FAIL' : `PASS  ${esKeys.size} keys in sync`);
process.exit(missingInEn.length || missingInEs.length ? 1 : 0);
```

- [ ] **Step 2: Run it — it should PASS before you start**

Run: `node scripts/smoke/i18n-parity.cjs`
Expected: `PASS  <n> keys in sync`. This is the baseline; it must still pass at Step 5.

- [ ] **Step 3: Add the keys**

These two pages are **mixed English and Spanish**, not merely untranslated —
`Create Product` and `Product Information` sit beside `Buscar productos...` in
the same views. Both languages become keys; the English literals are not
"already fine".

Confirmed literals to start from (re-read each page for the full set — this is
a starting list, not an exhaustive one):

| Page | Literal | Language |
|------|---------|----------|
| `products/new/page.tsx` | `Add a new product to your catalog` | EN |
| `products/new/page.tsx` | `Create Product` | EN |
| `products/new/page.tsx` | `Product Information` | EN |
| `products/page.tsx` | `Buscar productos...` (placeholder) | ES |

Extend the existing `products` namespace in **both** catalogs. Do not invent keys for text that is not there.

Example shape (`es.json` / `en.json` respectively):

```json
"products": {
  "newProduct": "Nuevo Producto",
  "createProduct": "Crear producto"
}
```

```json
"products": {
  "newProduct": "New Product",
  "createProduct": "Create product"
}
```

- [ ] **Step 4: Replace the literals**

In each of the two pages, add `const t = useTranslations('products');` and swap every hardcoded Spanish string for `t('key')`. Follow `components/products/ProductFilters.tsx` — it already does this and is the house pattern.

Watch for strings inside `placeholder`, `aria-label`, `title` and toast calls, not only visible text.

- [ ] **Step 5: Verify**

```bash
node scripts/smoke/i18n-parity.cjs      # expect PASS, key count higher than Step 2
npm run build                            # expect ✓ Compiled successfully

# Accented Spanish between JSX tags.
grep -nE ">[^<>{]*(á|é|í|ó|ú|ñ|¿|¡)" "app/(panel)/products/page.tsx" "app/(panel)/products/new/page.tsx"

# Hardcoded strings in placeholder/aria-label/title attributes (Step 4's own warning) —
# a literal string here means it was not swapped for t('key').
grep -nE '(placeholder|aria-label|title)="[^"{]+"' "app/(panel)/products/page.tsx" "app/(panel)/products/new/page.tsx"

# Unaccented Spanish words from Step 3's literal table (e.g. "Nuevo", "Crear", "Buscar
# productos") anywhere in the file, not only between tags — the accented-only check above
# would miss these entirely.
grep -niE '\b(nuevo|nueva|crear|buscar|guardar|cancelar|eliminar|producto|productos)\b' "app/(panel)/products/page.tsx" "app/(panel)/products/new/page.tsx"
```

All three greps should return no matches. Accented or listed Spanish text remaining in a `className` or a comment is fine; text between JSX tags or inside an attribute value is not. These greps are a starting filter, not a substitute for re-reading the two pages per Step 3's own caveat ("a starting list, not an exhaustive one").

- [ ] **Step 6: Commit**

```bash
git add "app/(panel)/products" messages scripts/smoke/i18n-parity.cjs
git commit -m "i18n(front): translate the product list and new pages"
```

---

### Task 5: Close out the spec

**Files:**
- Modify: `docs/specs/SPEC-FRONT-001-frontend-readiness.md`

**Interfaces:** none.

- [ ] **Step 1: Tick the acceptance list**

Mark each `- [ ]` in §4 that the work actually satisfies. Leave unticked anything you could not verify — in particular, the Playwright specs if no stack was available.

- [ ] **Step 2: Update the status line**

Per the convention in `CLAUDE.md`, the status line is the ledger and must carry its evidence:

```markdown
**Status**: DONE — 2026-08-09 (PR #NN). Sidebar reveals labels on focus and via a persisted pin; header breadcrumb reads NAV_ITEMS; two product pages translated. <Note here whether the Playwright specs were executed or only written.>
```

If any part is unfinished, use `APPROVED` with the gap spelled out instead. Never `IMPLEMENTED` — Kairos maps it to Done.

Setting `DONE` moves the board item to Done on the next sync, and the monotonic guard means it cannot be walked back by a later sync.

- [ ] **Step 3: Commit**

```bash
git add docs/specs/SPEC-FRONT-001-frontend-readiness.md
git commit -m "docs(specs): record FRONT-001 outcome in the status line"
```

---

## Notes for the PR

The merge handler promotes an issue to Done **only** on an explicit closing keyword. If this PR completes the spec, put `Closes POS-FRONT-001` in the body. Naming the ID without the keyword does nothing — which is deliberate, so a PR can safely mention specs it did not finish.

# M3 — Frontend Readiness: shell reachability and i18n

**Status**: APPROVED — 2026-08-09 (PR #39). All five plan tasks landed: sidebar labels reveal on keyboard focus and via a persisted pin (`stores/uiStore.ts`); header breadcrumb reads `NAV_ITEMS` through `findNavLabelKey` (compiled smoke 6/6 PASS, executed); `Header.ROUTE_LABELS` deleted; product list + new pages translated (parity smoke 392 keys in sync, executed). Gap: the 5 Playwright specs in `tests/e2e/sidebar-reachability.spec.ts` are written but NOT executed — no live stack was available; run them (`docker compose up -d`, `BASE_URL=http://localhost:3001`) to verify the sidebar/pin/locale acceptance items and promote to DONE. (Header was DRAFT through implementation.)

One Plane issue (`POS-FRONT-001`) tracking the frontend module's known open work.

Full design: [`docs/superpowers/specs/2026-08-09-frontend-readiness-design.md`](../superpowers/specs/2026-08-09-frontend-readiness-design.md)
(that doc back-refs this issue via its `**Issue:** POS-FRONT-001` line).

## 1. Goal

M3 is declared `priority: critical`, `status: in_progress` in the master doc and
was, until this file, **the only module with no spec at all**. Its work lived in
a design doc that declared a board issue, which regenerated every time the issue
was deleted; that doc was untracked in #33 and the board item removed.

This spec gives M3 a tracked home and closes the two remaining gaps in the
app shell. It is deliberately not a charter for the whole frontend.

## 2. Findings this spec responds to

- **The sidebar expands on `hover:` only.** `DashboardLayout.tsx` sets
  `w-[52px] hover:w-[220px]` and `Sidebar.tsx` reveals labels with
  `opacity-0 group-hover:opacity-100`. There is no `focus-within:` anywhere in
  `components/layout/`. A keyboard user tabs through 52px of icons with
  invisible labels; a touch user (a tablet POS terminal) can never reveal them
  at all. The label text is in the DOM, so screen readers are unaffected — this
  is a sighted-keyboard and touch gap.
- **`expandSidebar` / `collapseSidebar` exist in both message catalogs and are
  referenced nowhere in code.** A toggle was planned and never built.
- **The route→label mapping was duplicated three times; one copy remains.**
  The review pass on #35 (`c11e6512`) extracted `lib/navigation/nav-items.ts` as
  the single source of truth and moved both the sidebar and the palette onto it,
  with labels resolved through `useTranslations('sidebar')`. **`Header.ROUTE_LABELS`
  is the last hardcoded Spanish copy** and is what remains to fold in.
- **S-09 is wrong about both the size and the files.** SPEC-CUT-001 §4 describes
  it as the product detail/edit and category pages. In fact
  `products/[id]/page.tsx`, `products/[id]/edit/page.tsx` and
  `products/categories/page.tsx` **already use** `useTranslations` (the last of
  those via its sole content, `CategoryManager.tsx`, translated in `c99fd6aa`),
  while the untranslated product pages are the list (`products/page.tsx`) and
  `products/new/page.tsx`. The real size is **12 of 77** component/page files
  using `useTranslations`, with ~24 carrying hardcoded Spanish. This spec takes
  the app shell plus those two product pages; the rest is SPEC-FRONT-002.
- **S-10 is already fixed.** SPEC-CUT-001 §4 says `types/auth.ts` still declares
  snake_case token fields on `AuthResponse`. It does not: line 28 reads
  `export type AuthResponse = User`, and the backend's `register` returns
  `UserResponseDto` with no tokens, so the frontend type is correct. Verified
  against both sides; dropped from this spec's scope.
- **Three of SPEC-CUT-001 §4's frontend claims were stale** (S-09's size, S-09's
  file list, S-10 entirely). Re-auditing the rest of §4 against code is worth its
  own pass — see §5.

## 3. Scope

1. **Sidebar reachability** — `focus-within` expansion plus a pin toggle
   persisted to `localStorage`. Labels reveal on hover ∪ focus-within ∪ pinned.
   Hover behaviour is unchanged; the pin uses the two catalog keys that already
   exist.
2. **App-shell i18n** — move the header breadcrumb onto the shared
   `NAV_ITEMS` table and delete `Header.ROUTE_LABELS`, the last hardcoded copy
   (the sidebar and palette were consolidated by #35's review pass). Plus the
   two untranslated product pages named in §2: `products/page.tsx`,
   `products/new/page.tsx`.
S-10 was in this spec's original scope and is **removed**: the work is already
done (see §2).

## 4. Acceptance

> Per the status convention in `CLAUDE.md`, the `**Status**:` line above is the
> ledger. These are working notes, not the record of completion.

- [ ] Tabbing into the sidebar reveals nav labels with no pointer involved.
      *(implemented + grep-verified; Playwright spec written but not executed — no stack)*
- [ ] The pin toggle expands and collapses, survives a reload, and degrades to
      unpinned when `localStorage` is unavailable rather than throwing.
      *(implemented; Playwright specs written but not executed — no stack)*
- [x] The pin control is a real button with `aria-pressed`, labelled from the
      existing `expandSidebar` / `collapseSidebar` keys.
- [x] Exactly one route→label table remains in the codebase; Header, Sidebar and
      the palette all read from `lib/navigation/nav-items.ts`, and no route label
      is a hardcoded string. *(compiled smoke: 6/6 PASS)*
- [ ] Switching locale changes the sidebar nav labels and the header breadcrumb.
      *(implemented; Playwright spec written but not executed — no stack)*
- [x] The two product pages named in §3, item 2 render no hardcoded Spanish; any new keys
      exist in both `es.json` and `en.json`. *(parity smoke: 392 keys in sync)*
- [x] `npm run build` is green (it typechecks; `next lint` remains unrunnable
      until SPEC-CUT-001 S-01 ships an ESLint config).

## 5. Out of scope

- The remaining ~20 feature files carrying hardcoded Spanish → **SPEC-FRONT-002**.
- Re-auditing SPEC-CUT-001 §4's remaining S-items against code. Three of its
  frontend claims proved stale while writing this spec; the backend-facing ones
  have not been checked and may be equally out of date.
- Global search over products/customers/sales. The ⌘K palette shipped in #35 is
  navigation-only by design.
- Any backend change. This spec is frontend-only.
- Restyling. The 2026-05-15 redesign's three pillars — split-pane sales view,
  collapsed icon sidebar, ⌘K search — are **all shipped** as of #35. The sidebar
  was mis-audited as missing because the width lives on the parent `<aside>` in
  `DashboardLayout.tsx`, not in `Sidebar.tsx`.

## 6. References

- `docs/superpowers/specs/2026-05-15-frontend-redesign-design.md` — the original
  redesign; §"App Shell & Navigation" specifies the 52px→220px behaviour.
- `SPEC-CUT-001` §4 — S-09 (i18n) and S-10 (dead token fields).
- PR #35 — the command palette; its review pass added `lib/navigation/nav-items.ts`.
- PR #33 — untracked the redesign design doc, removing the regenerating issue.

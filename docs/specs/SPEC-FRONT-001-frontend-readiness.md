# M3 — Frontend Readiness: shell reachability, i18n, dead types

**Status**: DRAFT — not started. Depends on #35 (command palette) merging first, which introduces the shared route table this spec consolidates onto.

One Plane issue (`POS-FRONT-001`) tracking the frontend module's known open work.

Full design: [`docs/superpowers/specs/2026-08-09-frontend-readiness-design.md`](../superpowers/specs/2026-08-09-frontend-readiness-design.md)
(that doc back-refs this issue via its `**Issue:** POS-FRONT-001` line).

## 1. Goal

M3 is declared `priority: critical`, `status: in_progress` in the master doc and
was, until this file, **the only module with no spec at all**. Its work lived in
a design doc that declared a board issue, which regenerated every time the issue
was deleted; that doc was untracked in #33 and the board item removed.

This spec gives M3 a tracked home and closes the three known gaps in the app
shell. It is deliberately not a charter for the whole frontend.

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
- **The route→label mapping is duplicated.** `Header.ROUTE_LABELS` and
  `Sidebar.NAV_ITEMS` are two hardcoded Spanish copies of the same table, and
  #35 adds a third in `lib/navigation/command-items.ts` — that one already keyed
  to the `sidebar` i18n namespace.
- **S-09 is wrong about both the size and the files.** SPEC-CUT-001 §4 describes
  it as the product detail/edit and category pages. In fact
  `products/[id]/page.tsx` and `products/[id]/edit/page.tsx` **already use**
  `useTranslations`, while the untranslated product pages are the list
  (`products/page.tsx`), `products/categories/page.tsx` and
  `products/new/page.tsx`. The real size is **9 of 76** component/page files
  using `useTranslations`, with ~24 carrying hardcoded Spanish. This spec takes
  the app shell plus those three product pages; the rest is SPEC-FRONT-002.
- **`types/auth.ts` still declares snake_case token fields on `AuthResponse`**
  that the backend register endpoint never returns (SPEC-CUT-001 §4 S-10).

## 3. Scope

1. **Sidebar reachability** — `focus-within` expansion plus a pin toggle
   persisted to `localStorage`. Labels reveal on hover ∪ focus-within ∪ pinned.
   Hover behaviour is unchanged; the pin uses the two catalog keys that already
   exist.
2. **App-shell i18n** — one shared route table feeding Header, Sidebar and the
   palette, with labels resolved through `useTranslations('sidebar')`. Removes
   both hardcoded copies. Plus the three untranslated product pages named in §2:
   `products/page.tsx`, `products/categories/page.tsx`, `products/new/page.tsx`.
3. **S-10** — delete the dead token fields from `types/auth.ts`.

## 4. Acceptance

> Per the status convention in `CLAUDE.md`, the `**Status**:` line above is the
> ledger. These are working notes, not the record of completion.

- [ ] Tabbing into the sidebar reveals nav labels with no pointer involved.
- [ ] The pin toggle expands and collapses, survives a reload, and degrades to
      unpinned when `localStorage` is unavailable rather than throwing.
- [ ] The pin control is a real button with `aria-pressed`, labelled from the
      existing `expandSidebar` / `collapseSidebar` keys.
- [ ] Exactly one route→label table remains in the codebase; Header, Sidebar and
      the palette all read from it, and no route label is a hardcoded string.
- [ ] Switching locale changes the sidebar nav labels and the header breadcrumb.
- [ ] The three product pages in §3.2 render no hardcoded Spanish; any new keys
      exist in both `es.json` and `en.json`.
- [ ] `AuthResponse` declares no field the backend does not return.
- [ ] `npm run build` is green (it typechecks; `next lint` remains unrunnable
      until SPEC-CUT-001 S-01 ships an ESLint config).

## 5. Out of scope

- The remaining ~20 feature files carrying hardcoded Spanish → **SPEC-FRONT-002**.
- Global search over products/customers/sales. The ⌘K palette shipped in #35 is
  navigation-only by design.
- Any backend change. This spec is frontend-only.
- Restyling. The 2026-05-15 redesign's three pillars — split-pane sales view,
  collapsed icon sidebar, ⌘K search — are **all shipped** once #35 merges. The
  sidebar was mis-audited as missing because the width lives on the parent
  `<aside>` in `DashboardLayout.tsx`, not in `Sidebar.tsx`.

## 6. References

- `docs/superpowers/specs/2026-05-15-frontend-redesign-design.md` — the original
  redesign; §"App Shell & Navigation" specifies the 52px→220px behaviour.
- `SPEC-CUT-001` §4 — S-09 (i18n) and S-10 (dead token fields).
- PR #35 — the command palette and `lib/navigation/command-items.ts`.
- PR #33 — untracked the redesign design doc, removing the regenerating issue.

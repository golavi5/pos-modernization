# Frontend Readiness — Design

**Issue:** POS-FRONT-001
**Date:** 2026-08-09
**Status:** Draft
**Scope:** App-shell reachability, shell i18n, ~~dead auth types~~ (S-10 was
already fixed — see SPEC-FRONT-001 §2 — and dropped from scope)

---

## 1. Problem

Three unrelated-looking gaps in the frontend share one root: the app shell was
built from a design doc that nothing tracked, so nobody re-read it after the
first pass.

The sidebar implements the design doc's 52px→220px hover-expand faithfully —
and only that. `DashboardLayout.tsx:13` carries
`w-[52px] hover:w-[220px] transition-[width]`; `Sidebar.tsx` reveals labels with
`opacity-0 group-hover:opacity-100`. Neither has a `focus-within:` variant. On a
keyboard the nav is 52px of unlabelled icons; on a touch terminal — the POS's
primary form factor — the labels are unreachable, because there is no hover
event to give.

The design doc's own line, "expands to 220px on hover (CSS transition, no JS
needed)", is why: it specified the pointer case and stopped. Two message-catalog
keys, `expandSidebar` and `collapseSidebar`, exist in both `es.json` and
`en.json` and are referenced nowhere — a toggle was anticipated and never built.

Separately, the route→label mapping was duplicated three times. #35's review
pass consolidated two of them into `lib/navigation/nav-items.ts`, which the
sidebar and the palette now share, translating through the `sidebar` namespace.
`Header.ROUTE_LABELS` is the last hardcoded Spanish copy.

## 2. Goals / non-goals

**Goals.** Make the shell usable without a pointer; collapse the three route
tables into one. ~~Delete `AuthResponse` fields the backend never returns.~~
Resolved: `types/auth.ts:28` already reads `export type AuthResponse = User`
and the backend's `register` returns `UserResponseDto` with no tokens — S-10
was fixed before this design was written, verified against both sides.

**Non-goals.** The ~20 feature files still carrying hardcoded Spanish
(SPEC-FRONT-002). Global search. Any backend change. Restyling — every pillar of
the 2026-05-15 redesign is shipped.

## 3. Decisions

1. **Keep hover, add focus-within, add a pin.** Hover is a shipped, specified
   behaviour and mouse users like it; the fix is additive. `focus-within` covers
   keyboard. The pin covers touch, and covers the mouse user who wants labels to
   stay put. Three ways in, one width rule.
2. **Persist the pin in a new `stores/uiStore.ts`,** Zustand + `persist`,
   mirroring `authStore`. Not in `authStore`: a UI preference must survive
   logout, and must not be cleared by an auth reset.
3. **`NAV_ITEMS` is the single route table.** #35's review pass (`c11e6512`)
   extracted `lib/navigation/nav-items.ts` and moved the sidebar and the palette
   onto it. Only the header breadcrumb still hand-copies labels; it adopts the
   same table and `Header.ROUTE_LABELS` is deleted.
4. **Labels resolve at render through `useTranslations('sidebar')`,** not at
   table-definition time, so a locale switch re-renders without a reload.

## 4. Components

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `stores/uiStore.ts` (new) | `sidebarPinned: boolean` + toggle, persisted | zustand/persist |
| `DashboardLayout.tsx` | width rule: 52px, expanded on hover ∪ focus-within ∪ pinned | uiStore |
| `Sidebar.tsx` | pin button; labels via i18n; reveal on the same three conditions | uiStore, NAV_ITEMS |
| `Header.tsx` | breadcrumb label from the shared table; `ROUTE_LABELS` deleted | NAV_ITEMS |
| ~~`types/auth.ts`~~ | ~~drop the unreturned snake_case token fields~~ — already fixed, out of scope (see §2) | — |

The width rule cannot be expressed by Tailwind variants alone once `pinned` is
JS state, so `DashboardLayout` composes the class list: the hover and
focus-within variants stay as classes, and `pinned` adds the expanded width
unconditionally.

## 5. Data flow

```
uiStore.sidebarPinned ──┬─→ DashboardLayout  → aside width
                        ├─→ Sidebar          → label opacity + aria-pressed
                        └─→ (localStorage via persist)

COMMAND_ROUTES ─→ useTranslations('sidebar') ─┬─→ Sidebar nav labels
                                              ├─→ Header breadcrumb
                                              └─→ CommandPalette items
```

## 6. Error handling

`localStorage` unavailable (private browsing, storage disabled) → `persist`
rehydration fails silently and the store keeps its default, `sidebarPinned:
false`. The sidebar then behaves exactly as it does today. No try/catch of our
own; this is the same path `authStore` already relies on.

An unknown route in the breadcrumb lookup yields an empty label, as it does
today — the breadcrumb renders `POS` alone rather than throwing.

## 7. Testing

Playwright, following the repo's existing conventions:

- Tab from the header into the sidebar → nav labels are visible, no pointer used.
- Click the pin → labels stay after the pointer leaves; reload → still pinned.
- Unpin → labels hide again once the pointer leaves.
- Switch locale → nav labels and breadcrumb change together.

Honest limits, unchanged from #35: the frontend has no unit runner, so pure
logic gets a compiled smoke run instead, and Playwright specs cannot execute
without a live stack. `npm run lint` cannot run at all until SPEC-CUT-001 S-01
ships an ESLint config; `npm run build` typechecks and is the gate.

## 8. Risks

1. ~~Depends on #35.~~ Resolved: #35 merged 2026-08-09 and its review pass
   already landed the shared table, shrinking this design's i18n work to the
   header breadcrumb plus two product pages.
2. **A pinned sidebar costs 168px of width** on the sales workspace, which the
   redesign optimised for screen real estate. Mitigated by defaulting to
   unpinned — the user opts in, and the setting is theirs.
3. **`focus-within` on a wide container** can expand the rail when focus lands
   on the user avatar at the bottom. That is the intended behaviour (the label
   for that control should be readable too), but it means the rail expands on
   any focus inside it, not only nav links.

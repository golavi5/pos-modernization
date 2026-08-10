# M3 — Frontend i18n Sweep: finish the translation surface and ratchet it shut

**Status**: APPROVED — 2026-08-10 (PR #42, open). Header was DONE while the PR was unmerged and cited 628 keys against a measured 629; both corrected here. Kairos' monotonic guard cannot walk the board back, so POS-FRONT-002 already shows Done in Plane — this line, not the board, is the ledger. All files translated across 8 domain batches; `i18n-lint.cjs` allowlist empty. Catalogs 392 → 624 keys after the review pass consolidated 28 borrowed/duplicated labels into `common`. The locale switch was exercised in a real browser: automated Chromium walk against a live stack (fresh MySQL + backend + `next dev`), all nine panel pages in both locales, per-page catalog strings asserted visible including `placeholder`/`title` attributes — 63/63 checks pass. High-effort review of PR #42 (2026-08-10) found the ratchet unsound in both directions and it was rebuilt: the detector now anchors on JSX tags (was matching `=> Promise<void>` as the literal `" Promise"`, and blind to text on its own line — `SalesChart.tsx` shipped a raw Spanish heading through a green gate), the `useTranslations` file-level exemption is gone (it had hidden a hardcoded `Cerrar sesión` in `Sidebar.tsx`, on every panel page), `i18n-parity.cjs` now compares ICU placeholders and rich-text tags, and `global.ts` types every `t()` against the default catalog so an unresolvable key is a build error. Failure branches re-proven after each change. **Open:** `main` has no branch protection (`gh api …/branches/main/protection` → 404), so "Frontend — i18n checks" reports but does not gate — a required-status-check rule is still needed; the browser walk predates the consolidation and has not been re-run.

One Plane issue (`POS-FRONT-002`) tracking the remaining i18n work for the frontend module.

Full design: [`docs/superpowers/specs/2026-08-09-frontend-i18n-sweep-design.md`](../superpowers/specs/2026-08-09-frontend-i18n-sweep-design.md)
(that doc back-refs this issue via its `**Issue:** POS-FRONT-002` line).

## 1. Goal

`SPEC-FRONT-001` took the app shell and the three product pages. This takes the
rest of the surface and then makes the problem non-recurring: a CI check that
fails on any new file carrying hardcoded strings.

The recurrence matters more than the sweep. This gap has been mis-stated twice
in `SPEC-CUT-001` §4 S-09 — once about its size, once about which files it
covered — because nothing measured it and nothing prevented it growing.

## 2. Baseline (measured, 2026-08-09)

35 files carry at least one visible literal and never call `useTranslations`.
223 visible literals in total; **78 (35%) already exist as a value in
`messages/es.json`** — those files simply never wired up keys that were written
for them. `app/(panel)` pages are the extreme case: 24 of 24 already exist.

| Domain | Files | Literals | Already keyed | New keys needed |
|--------|------:|---------:|--------------:|----------------:|
| reports | 5 | 65 | 11 | **54** |
| customers | 4 | 33 | 18 | 15 |
| inventory | 4 | 30 | 7 | 23 |
| products | 4 | 27 | 7 | 20 |
| app pages | 5 | 24 | 24 | **0** |
| sales | 6 | 21 | 4 | 17 |
| users | 4 | 17 | 5 | 12 |
| layout | 1 | 3 | 0 | 3 |
| notifications | 1 | 2 | 2 | 0 |
| dashboard | 1 | 1 | 0 | 1 |
| **total** | **35** | **223** | **78** | **145** |

Counts cover text between JSX tags only. Strings in `placeholder`, `aria-label`
and `title` are **also in scope** and are not in these numbers: including them
adds five more files that have no visible literals at all —
`components/theme/ThemeToggle.tsx`, `components/ui/slide-over.tsx`,
`components/products/ProductCard.tsx`, `components/products/StockBadge.tsx`,
`components/sales/CashPaymentSection.tsx` — for **40 files in total**, which is
what the ratchet allowlist is seeded with. Per-file literal totals are likewise
a floor.

## 3. Scope

1. **Translate all 40 files**, batched by the domains in §2. Each batch is one
   reviewable unit ending in a green build.
2. **Ratchet: `scripts/smoke/i18n-lint.cjs`** — fails when a `.tsx` carries
   visible literals and does not call `useTranslations`, unless the file is on an
   allowlist. The allowlist is seeded with today's 40 files; **each batch deletes
   its own files from it**. The list only ever shrinks.
3. **Gate it in CI** — add a job to `.github/workflows/ci.yml` running the new
   check alongside the existing `scripts/smoke/i18n-parity.cjs`. Blocking from
   the first commit, because the allowlist makes today's debt pass while any new
   offender fails.

## 4. Conventions

- One namespace per domain, reusing those that exist (`reports`, `customers`,
  `inventory`, `products`, `sales`, `users`, `notifications`, `settings`).
- Keys are camelCase and grouped by the component that uses them.
- Every key exists in **both** catalogs. `i18n-parity.cjs` enforces this.
- Where a literal already exists as a catalog value, **reuse that key** rather
  than adding a synonym — a reverse value→key lookup gives the candidate.

## 5. Acceptance

> Per the status convention in `CLAUDE.md`, the `**Status**:` line is the ledger.
> These are working notes.

- [x] The `i18n-lint.cjs` allowlist is empty. (Only meaningful now that the
      check is per-string; an empty allowlist under the old file-level
      exemption proved nothing.)
- [x] `i18n-lint.cjs` and `i18n-parity.cjs` both pass, and both run in CI.
- [ ] The i18n job actually gates: `main` is unprotected, so the job reports
      without blocking. Needs "Frontend — i18n checks" added as a required
      status check — a repo setting, not a change in this PR.
- [x] A key used in code that does not resolve is a build error (`global.ts`
      types `t()` against the default catalog).
- [x] `npm run build` green.
- [x] Switching locale changes visible text on every page listed in §2 — checked
      per domain, not only on the first one (automated browser walk, PR #42).
- [x] No key added to one catalog without the other (parity check proves it).
- [x] Strings in `placeholder`, `aria-label` and `title` are translated too, not
      only text between tags.

## 6. Out of scope

- Backend strings, API error messages, and anything outside `.tsx`.
- Adding locales beyond `es` and `en`.
- Restyling or behaviour changes. This is a translation sweep; if a batch
  uncovers a bug, file it separately rather than fixing it inline.
- The app shell and the three product pages — `SPEC-FRONT-001`, shipped in #39.

## 7. References

- `SPEC-CUT-001` §4 S-09 — the original item, twice mis-stated, now re-homed here.
- `SPEC-FRONT-001` — the shell half of the same problem.
- `scripts/smoke/i18n-parity.cjs` — the key-parity check this builds on (#39).

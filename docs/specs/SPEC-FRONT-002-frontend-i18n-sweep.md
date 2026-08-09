# M3 — Frontend i18n Sweep: finish the translation surface and ratchet it shut

**Status**: DRAFT — not started. Baseline measured 2026-08-09 after PR #39: 40 files need work (35 by visible text, 5 more once `placeholder`/`aria-label`/`title` are counted), carrying 223 visible literals of which 78 (35%) already exist as catalog values. Depends on nothing further; the parity check it builds on shipped in #39.

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

- [ ] The `i18n-lint.cjs` allowlist is empty.
- [ ] `i18n-lint.cjs` and `i18n-parity.cjs` both pass, and both run in CI as a
      blocking job.
- [ ] `npm run build` green.
- [ ] Switching locale changes visible text on every page listed in §2 — checked
      per domain, not only on the first one.
- [ ] No key added to one catalog without the other (parity check proves it).
- [ ] Strings in `placeholder`, `aria-label` and `title` are translated too, not
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

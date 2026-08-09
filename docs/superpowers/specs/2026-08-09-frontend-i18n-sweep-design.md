# Frontend i18n Sweep — Design

**Issue:** POS-FRONT-002
**Date:** 2026-08-09
**Status:** Draft
**Scope:** Translate the remaining 35 frontend files; add a ratcheting CI check

---

## 1. Problem

Two thirds of the UI ships hardcoded text, and the record of that fact has been
wrong twice. `SPEC-CUT-001` §4 S-09 first described the gap as "product
detail/edit + category pages" — those pages were already translated — and never
carried a number. Nothing measured the surface, and nothing prevented it growing
between readings.

Measured on 2026-08-09, after the shell work in #39: **35 files, 223 visible
literals**. The interesting split is not by domain but by kind of work:

- **78 literals (35%) already exist as values in `messages/es.json`.** The keys
  were authored and the file never called `useTranslations`. `app/(panel)` pages
  are 24 for 24 — a pure wiring job with no translation judgement in it.
- **145 need new keys** in both catalogs. `reports` alone accounts for 54 of
  them against a namespace that currently holds 6 keys.

Those halves want different review: the first is mechanically checkable, the
second needs someone who reads both languages.

## 2. Goals / non-goals

**Goals.** Translate the 35 files. Make regression impossible rather than
unlikely.

**Non-goals.** Backend strings. New locales. Behaviour changes. The shell and
product pages (`SPEC-FRONT-001`, shipped).

## 3. Decisions

1. **Batch by domain, not by kind of work.** Splitting wiring from authoring
   would touch most files twice and produce two large diffs instead of eight
   small ones. A domain batch is reviewable by someone who knows that screen.
2. **Ratchet with an allowlist, gated in CI from the first commit.** The
   alternative — land the check after the sweep — leaves the window open for the
   whole duration of the sweep, which is exactly when the most frontend code is
   being touched. Seeding the allowlist with today's 35 files lets the gate be
   blocking immediately while the debt is still there.
3. **The allowlist may only shrink.** Each batch deletes its files. A reviewer
   seeing an addition knows something went backwards, without needing to read
   the diff.
4. **Reuse an existing key when the literal already matches a catalog value.**
   A reverse value→key lookup produces the candidate mapping; adding a synonym
   instead would leave two keys that drift apart.

## 4. Components

| Unit | Responsibility |
|------|----------------|
| `scripts/smoke/i18n-lint.cjs` (new) | fail on `.tsx` with visible literals and no `useTranslations`, unless allowlisted |
| `scripts/smoke/i18n-parity.cjs` (exists, #39) | every key present in both catalogs |
| `.github/workflows/ci.yml` | new blocking job running both checks |
| `messages/{es,en}.json` | new keys, per domain namespace |
| 35 `.tsx` files | call `useTranslations`, swap literals for keys |

The check is deliberately a plain node script rather than an ESLint rule: this
repo has **no ESLint config at all** (`next lint` drops into interactive setup),
so an ESLint-based guard would have to solve that problem first. `SPEC-CUT-001`
S-01 owns that decision and has deferred it.

## 5. Detection heuristic

The check flags text between JSX tags containing three or more letter
characters, plus the string values of `placeholder`, `aria-label` and `title`.

Known false positives, and why they are acceptable: a component rendering a
literal that is genuinely not user-facing copy (a currency code, a units suffix)
will trip the check. The escape hatch is the allowlist, which is visible in
review — preferable to a cleverer heuristic that silently misses real strings.
The check errs toward flagging.

## 6. Error handling

The check exits non-zero with one line per offending file listing the literals
it found, so CI output is actionable without opening the file. An allowlisted
file that no longer has literals is **also** reported — a stale allowlist entry
is drift in the other direction, and the list is only trustworthy if it is exact.

## 7. Testing

Each batch: `npm run build` (typechecks), both smoke checks, and a manual locale
switch on the batch's screens. Playwright specs cannot run without a live stack,
which is unchanged from #35 and #39 — the smoke checks are the executable gate
here, and they run anywhere.

## 8. Risks

1. **A large mechanical diff is where careless passes hide.** Mitigated by
   per-domain review and by the ratchet: a batch cannot be "done" while its files
   remain allowlisted.
2. **`reports` is a fifth of the work on its own** (65 literals, 54 new) against
   a 6-key namespace. It should be sequenced first while attention is freshest,
   or split further if a single review gets unwieldy.
3. **Attribute strings are not in the §2 counts.** The real per-file totals are
   higher than the table suggests; the estimate is a floor, not a forecast.

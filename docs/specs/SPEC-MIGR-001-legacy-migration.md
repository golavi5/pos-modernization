# M4 — Legacy Migration: Parity-Validation CLI

**Status**: APPROVED — 2026-08-10. Real-dump parity re-run end-to-end against `info/bd_ex.sql` on the committed rules: `import` exit 0 / **0 row errors**, `verify` exit 0 / **0 mismatches / 0 missing / 0 errors** across 7 rules and 1,471,753 rows (companies 2, customers 267, products 30,276, users 15, orders 255,955, order_items 1,185,238, payments 0). Reports written to `migration/reports/2026-08-10T22-44-16-050Z` (import) and `…T22-45-49-967Z` (verify) — gitignored by design (real customer data), so these numbers, not an in-repo artifact, are the record. Measured: import 11m43s, verify 1m33s. **Why re-run:** the previous green (2026-06-30 17:39/17:40Z) predated commit `64622a1d` (17:57:07Z), which changed `order-items.rule.ts` and `products.rule.ts` — the committed rules had never been exercised on real data. That int32 lower-bound fix affects **0 rows** in this dump (`SELECT COUNT(*) … WHERE Cant = -2147483648` → 0). **Open, by design:** (1) `encabezados_pagodet` is empty in this dump, so the payments rule and `mapPaymentMethod` remain unexercised on real data — parity for payments is 0-of-0, not proven; (2) `verify` diffs only mapped fields, so dropped legacy columns are invisible to it by construction. **Found by this run:** the `clampNum` warnings added by `64622a1d` fired 8 times, all in `products` — 6 are EAN-13 barcodes mis-keyed into `CantFisica`/`CostoPromedio` (clamping to 0 is correct), but 2 are legitimate tax rates lost: `inventarios` 12935 (`Iva=2140`) and 28471 (`Iva=1900`) migrate as **0% tax** when the column is a plain percentage elsewhere (24,087 rows at `19`, no other value above 19). `verify` cannot see this — it re-applies the same clamp and compares `0==0`. **This is why the token is `APPROVED`, not `DONE`:** closing it may change `products.rule.ts`, and any change under `src/rules/` invalidates this run exactly as `64622a1d` invalidated the June one. Promote to `DONE` (citing the PR) once the operator decides and, if a rule changed, the cycle is re-run. Product-name encoding was checked and is clean: `HEX(NomInventario)` for `inventarios` 12935 equals `HEX(name)` on the target and is valid UTF-8 (`…4E49C39141` = `NIÑA`), so the mojibake seen in a `docker exec` client was the client charset, not stored bytes.
<!-- Advanced DRAFT -> APPROVED intentionally as part of the status-line
     audit (see PR that introduced the status-convention in CLAUDE.md): the
     CLI is machine-complete (see summary below), so DRAFT understated it.
     This moves the Plane column from Backlog to Ready on next sync — that
     is the intended effect, not a stale reversion of the earlier
     manually-parked-in-Backlog state. -->

One Plane issue (`POS-MIGR-001`) tracking the M4 parity-validation work.

Full design: [`docs/superpowers/specs/2026-05-21-m4-legacy-migration-design.md`](../superpowers/specs/2026-05-21-m4-legacy-migration-design.md)
(that doc back-refs this issue via its `**Issue:** POS-MIGR-001` line).

Summary: standalone TypeScript CLI under `new-implementation/migration/`
(import + verify phases, declarative per-table rules, deterministic UUIDv5,
`legacy_id` join column, JSON/HTML parity report, Testcontainers e2e).
Success gate: zero unexplained mismatches against the frozen legacy .NET
dump; the same code is then the real cutover tool.

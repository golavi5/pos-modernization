# MIGR-001 — real-dump parity re-run after the Iva rule change (2026-11-10)

Closes the open item of PR #91 (legacy `Iva` above 100 → standard 19%): changing `src/rules/` invalidated the 2026-08-10 parity run, so the full cycle was repeated on the real legacy dump.

**Setup.** Throwaway MySQL 8 container (not the dev database); the dump `info/bd_ex.sql.gz` (232 MB uncompressed, gitignored, never committed) loaded as root with the `NO_AUTO_CREATE_USER` token stripped, load exit status checked (0, 49 tables). Backend rebuilt from `main` so `reset` provisions the current schema. No customer rows were read or printed; only counts, the CLI's own report and its warnings.

**Legacy row counts** (match the spec): empresas 2 · clientes 267 · inventarios 30,276 · usuarios 15 · encabezados 255,955 · encabezados_mov 1,185,238 · encabezados_pagodet 0. Rows with `Iva > 100`: **2**.

| Step | Exit | Time | Result |
|---|---|---|---|
| `reset` | 0 | 16 s | target provisioned from the TypeORM migrations |
| `import` | 0 | 193 s | **0 row errors** |
| `verify` | 0 | 27 s | **7 rules, 0 mismatches, 0 missing, 0 errors** (companies, customers, products, users, orders, order_items, payments) |
| `report` | 0 | <1 s | `reports/2026-11-10T02-43-02-932Z` (gitignored: real data) |

**The change under test.** The import log shows 8 products warnings, as predicted in the spec: 6 `clampNum` out-of-range values (EAN-13 barcodes keyed into `CantFisica`/`CostoPromedio`, correctly clamped to 0) and **2 `tax_rate=… is not a percentage, replaced with 19`** (2140 and 1900). In the target, legacy ids 12935 and 28471 now have `tax_rate = 19.00` (they were 0). Products at 19%: 24,087 → 24,089; no product has a rate above 19.

**Still true, by design (unchanged from the August run).** The payments rule is exercised on 0 rows because `encabezados_pagodet` is empty in this dump, so payment parity is 0 of 0, not proven. `verify` only compares mapped fields, so dropped legacy columns are invisible to it. The substitution of 19 for the two junk rates is the owner's decision (2026-11-09), not something the data proves.

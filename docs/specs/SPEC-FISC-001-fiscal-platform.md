# Fiscal Platform & Conversational Accounting Agent

**Status**: DRAFT

One Plane issue (`POS-FISC-001`) tracking the fiscal-platform design through
its review gate and into the TASKS breakdown.

Full design: [`docs/superpowers/specs/2026-06-10-fiscal-platform-design.md`](../superpowers/specs/2026-06-10-fiscal-platform-design.md)
(DESIGN-001, Level 1 — cross-domain: pos-modernization, radian, wira,
ApiFacturame).

Summary: `fiscal/` bounded context inside the NestJS modular monolith (ADR-001)
— emission behind `EmissionPort` (Plemsi bridge now, direct DIAN adapter in
parallel, per-tenant software-propio habilitación), reception with email
ingestion as the v1 automated channel (ADR-004), ledger v1 (sales/purchases
books, VAT by period, year-versioned retefuente catalog), tenant fiscal
profiles seeded from RUT, Wira `domains/accounting/` agent pack
(reads free, writes confirm-gated).

Blocking before TASKS: review/approval gate (Telegram) + OQ-1 (accountant
validation → Fiscal Rule Catalog v2026), OQ-2 (real habilitación dry run),
OQ-3 (certificate cost model). Once approved and the TASKS breakdown exists,
split phases into `SPEC-FISC-002+` files so each phase becomes its own Plane
issue under module M5.

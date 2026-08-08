# Fiscal Platform & Conversational Accounting Agent

**Status**: DONE

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
validation → Fiscal Rule Catalog v2026, including OQ-1a Régimen Simple
retención exclusions), OQ-2 (real habilitación dry run), OQ-3 (certificate cost
model), OQ-8 (POS emission mode — sync vs async-on-`SaleClosed` with
contingencia fallback). Two further gate conditions were added at the
2026-07-09 review (design doc §9) and also block the TASKS flip: a **signing /
set-de-pruebas spike** (one document accepted in DIAN set de pruebas before any
Phase 4 timeline is committed) and **ADR-007** (certificate & signing-key
custody — no real tenant signing key is persisted until it lands).
Once approved and the TASKS breakdown exists, split phases into
`SPEC-FISC-002+` files so each phase becomes its own Plane issue under module
M5.

> **Status note (2026-08-08):** this issue was auto-flipped to DONE on merge of
> `golavi5/pos-modernization#25` (commit `2864b196`). That was incorrect — none
> of the blockers above have closed and the review gate has not run. Reset to
> DRAFT. Do not mark DONE until every blocker in the paragraph above is
> resolved.

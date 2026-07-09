# DESIGN-001: Fiscal Platform & Conversational Accounting Agent

**Issue:** POS-FISC-001
**Status:** Draft — pending review gate
**Owner:** Gandhi Olavi (Automatizate LLC)
**Date:** 2026-06-10
**Level:** 1 (Design Doc — cross-domain work)
**Repos affected:** `pos-modernization` (primary), `radian` (library extraction source), `wira` (agent domain pack), `ApiFacturame` (legacy reference)

---

## 1. Context

Automatizate will build and commercialize a product that lets Colombian merchants (and Automatizate's own entities as tenant zero) manage electronic invoicing and basic fiscal obligations through a conversational agent, backed by a multi-tenant fiscal engine with direct DIAN integration.

Drivers:

- Per-document cost of third-party providers (Plemsi: 88 COP/doc) is unviable at POS ticket volume (documento equivalente electrónico per ticket).
- Odoo Enterprise `l10n_co_dian` removes per-document cost but is Enterprise-only; hosting Enterprise for third parties carries licensing constraints and per-user cost. Eliminated.
- The "software propio" operation mode registered per tenant before DIAN is a validated multi-tenant pattern (precedent: Odoo's own model — each company registers Software ID/PIN under its NIT).
- Existing assets cover significant ground: `radian` (XML parsing, CUFE validation, NIT/DV utils, RADIAN events, Plemsi adapter, multi-tenant Prisma schema), `pos-modernization` (NestJS modular backend with auth, companies, sales, inventory, notifications), `ApiFacturame` (UBL document models, legacy reference), `puc` (chart of accounts data).

## 2. Decisions (locked in brainstorm 2026-06-10)

| # | Decision |
|---|----------|
| D1 | Engine first: own DIAN emission engine is the critical-path project. |
| D2 | Per-tenant DIAN habilitación as **software propio** (no proveedor tecnológico path in v1). |
| D3 | No ERP in v1. Ledger lives inside the fiscal context. ERP integration deferred behind a port (ADR-005). |
| D4 | Fiscal engine is a **bounded context inside the pos-modernization modular monolith**, not a new service (ADR-001). |
| D5 | Emission behind a port: Plemsi adapter operative today, direct-DIAN adapter built in parallel; migration per tenant is a config switch. |
| D6 | Reception is its own subdomain with multiple acquisition adapters; email ingestion is the v1 automated channel. |
| D7 | Ledger v1 scope: libro de ventas, libro de compras, IVA por periodo, retefuente engine (capability-gated by tenant fiscal profile). |
| D8 | Purchases registration flow (cuentas por pagar light) with agent-assisted supplier→SKU matching. |
| D9 | Agent delivered as a Wira domain pack (`domains/accounting/`), channel WhatsApp. Reads are free; all writes are proposals requiring human confirmation. |
| D10 | Product prepares supporting figures for formularios 300/350. It does **not** file declarations. Legal boundary stated in product terms. |
| D11 | Régimen ordinario and Régimen Simple both in scope; obligations gated by tenant fiscal profile derived from RUT. |

## 3. Bounded contexts

```
pos-modernization backend (modular monolith)
├── modules/
│   ├── auth, users, companies, notifications   (existing — shared kernel candidates)
│   ├── sales, inventory, products, customers   (existing — POS context)
│   └── fiscal/                                 (NEW bounded context)
│       ├── emission/        — UBL build, signing, CUFE/CUDE, EmissionPort
│       ├── reception/       — acquisition adapters, AttachedDocument parsing, RADIAN events
│       ├── ledger/          — sales/purchases books, VAT periods, retefuente engine
│       ├── third-parties/   — fiscal counterparties (NIT, RUT responsibilities)
│       └── fiscal-profile/  — per-tenant régimen, responsibilities, habilitación state
wira
└── domains/accounting/                          (agent domain pack)
```

### Context boundaries (non-negotiable)

- `fiscal/` never imports internals of `sales`, `inventory`, or `customers`. Communication POS→fiscal is via domain events or public interfaces only (e.g., `SaleClosed` → fiscal emits documento equivalente).
- **`ThirdParty` is a fiscal aggregate distinct from POS `Customer`.** Customer = loyalty/purchase history. ThirdParty = NIT, DV, RUT responsibilities, notification address. They may reference each other; they never merge.
- GitNexus blast-radius checks enforce boundary integrity over time.

## 4. Architecture

### 4.1 Emission

- `EmissionPort` with two adapters:
  - `PlemsiAdapter` — extracted from `radian` / `ApiFacturame` patterns; operative from day one.
  - `DianDirectAdapter` — UBL 2.1 per anexo técnico, XAdES signing, CUFE/CUDE, set de pruebas, contingencia numbering. Built in parallel; per-tenant switch via config.
- Document types v1: factura electrónica de venta, notas crédito/débito, documento equivalente electrónico POS. Documento soporte: evaluate for v1.1.
- Certificate management: per-tenant digital certificate (storage encrypted at rest — reuse AES-256-GCM pattern from Tribuno credentials), renewal alerting.

### 4.2 Reception

- `ReceptionPort` with adapters, in delivery order:
  1. Manual XML upload, single + batch (exists in `radian`; port the parsing libs).
  2. **Email ingestion (v1 automated channel):** dedicated inbox per tenant or forwarding address; parse ZIP → AttachedDocument XML + PDF. Incremental improvement over current user habit (invoices already arrive by email; users upload manually today).
  3. Provider reception API (Plemsi) — deferred, cost-bearing.
  4. DIAN portal scraping — deferred, fragile (SIUGJ lesson applies).
- RADIAN events (acuse, recibo, aceptación) — port from `radian`.

### 4.3 Ledger

- Sales book: derived from emitted documents (VAT breakdown already in UBL).
- Purchases book: derived from received + confirmed documents.
- VAT by period: aggregation honoring tenant periodicity (bimestral/cuatrimestral/Simple rules — pending accountant validation, OQ-1).
- **Retefuente engine:** deterministic rule tables — concepto, tarifa, base mínima in UVT, party qualifications — **versioned per fiscal year** (UVT changes annually). Calculation proposed at purchase registration; capability active only for tenants flagged agente retenedor in fiscal profile.
- Outputs: supporting reports for formularios 300 and 350. No filing (D10).

### 4.3.1 Fiscal rule catalog vs tenant fiscal profile (two layers)

- **Fiscal Rule Catalog (global, Automatizate-owned):** the normative layer — obligations per régimen, retefuente conceptos/tarifas/bases, VAT periodicity thresholds (UVT), due-date calendar. Versioned per fiscal year. Single source of truth, validated via OQ-1. Tenants never edit this layer.
- **Tenant Fiscal Profile (per tenant):** parameters selecting the applicable subset of the catalog — régimen (ordinario/Simple), RUT responsibility codes, agente retenedor flag, VAT periodicity (system-derived from prior-year gross income in UVT, tenant-confirmed, not free choice).
- **RUT-seeded onboarding:** the RUT is a standardized PDF. At onboarding the agent receives it via WhatsApp, extracts NIT, régimen, and responsibility codes, and proposes the pre-filled fiscal profile for confirmation. Misconfiguration risk shifts from tenant data entry to a confirm-or-correct flow.
- Ledger and retefuente behavior = `catalog(year) × profile(tenant)`. No tax logic lives in tenant configuration.

### 4.4 Purchases flow & inventory automation

- Received invoice → agent notifies via WhatsApp → merchant confirms → purchase registered.
- Supplier item → internal SKU mapping table, built incrementally: first occurrence proposed by similarity (LLM-assisted), confirmed via chat; subsequent occurrences automatic.
- Confirmed purchase → stock movement in POS inventory module (via public interface/event, not direct service call).
- New cost detected → agent proposes retail price adjustment per margin rules. Confirmation required.

### 4.5 Agent (Wira domain pack)

- PydanticAI, schema-first. Channel: WhatsApp (Wira infrastructure).
- Tool surface over fiscal module's public API: queries unrestricted (sales, pending acuses, VAT position, document status); mutations always proposal + confirm (mirror of Janus pattern).
- Tenant isolation inherited from Wira tenancy; fiscal data scoped by `business.tenant`.

### 4.6 Observability

- Per OBSERVABILITY-STANDARD.md: OTel from day one, namespace `automatizate`, served entity as `business.tenant` span attribute. Logfire (agent, Python) + OTel Node SDK (fiscal module, TS) → shared Collector → OpenObserve.

## 5. ADRs

### ADR-001: Fiscal engine as bounded context in the modular monolith (not a new service)
**Decision:** Build `fiscal/` inside pos-modernization's NestJS backend.
**Rationale:** Reuses auth, companies (tenancy seed), notifications, scaffolding; right-sized for a solo developer; avoids premature microservices.
**Consequences:** Repo identity shifts from "POS" to "Automatizate platform" (rename pending, OQ-5). Extraction path documented: fiscal depends on nothing POS-internal, so it can be deployed independently later without rewrite.

### ADR-002: No ERP in v1
**Decision:** Ledger capabilities (D7) implemented natively in `fiscal/ledger`.
**Rationale:** v1 scope (sales/purchases books, VAT, retefuente) is derivable data plus deterministic rule tables; an ERP for three views is over-engineering.
**Trigger to reopen:** demand for nómina, full NIIF accounting, or medios magnéticos.

### ADR-003: Own DIAN emission behind a port, Plemsi as bridge adapter
**Decision:** `EmissionPort` with PlemsiAdapter (now) and DianDirectAdapter (built in parallel).
**Rationale:** 88 COP/doc kills unit economics at POS volume; per-tenant software propio habilitación is a validated pattern; the port de-risks the build — production traffic flows through Plemsi until the direct adapter passes habilitación per tenant.

### ADR-004: Email ingestion as primary automated reception channel
**Decision:** Inbox/forwarding ingestion over DIAN portal scraping or provider APIs.
**Rationale:** No usable public DIAN pull API for received documents; email delivery is the de-facto universal channel; matches existing user habit; scraping a government portal is fragile (Tribuno/SIUGJ precedent).

### ADR-005: ERP choice (Odoo Community + OCA vs Frappe/ERPNext) deferred
**Decision:** Deferred behind `AccountingExportPort`. Licensing is not a deciding factor (LGPL/GPL impose no SaaS obligations); decisive factors when reopened: Colombian localization maturity (OCA advantage) vs full free accounting (ERPNext advantage) vs team expertise (Odoo advantage).

### ADR-006: ThirdParty as a fiscal aggregate, separate from POS Customer
**Decision:** No shared customer entity across contexts.
**Rationale:** Different invariants (loyalty vs tax identity); merging them couples contexts and corrupts both models.

## 6. Phasing (high level — TASKS doc to follow after review gate)

- **Phase 0 — Validation (blocking):** accountant session (OQ-1); per-tenant habilitación operational dry run with one real NIT (OQ-2); certificate cost model (OQ-3).
- **Phase 1 — Fiscal foundation:** `fiscal/` module skeleton, fiscal-profile, third-parties, EmissionPort + PlemsiAdapter (lib extraction from radian), sales book + VAT view. Tenant zero: one Automatizate entity invoicing through it.
- **Phase 2 — Reception & purchases:** manual upload port, email ingestion, purchases book, supplier→SKU matching, inventory stock-in automation.
- **Phase 3 — Agent:** Wira `domains/accounting/` pack — queries first, then confirmed mutations (emit, register purchase, price adjustment).
- **Phase 4 — DIAN direct:** DianDirectAdapter through habilitación with tenant zero; per-tenant migration switch; retefuente engine.
- Ordering of 3 vs 4 may swap based on commercial pressure; both depend only on Phase 1–2 ports.

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Anexo técnico versioning by DIAN | Adapter isolation; version pinned per tenant habilitación; monitoring of DIAN resolutions |
| DIAN platform downtime | Contingencia numbering support in DianDirectAdapter from design |
| Per-tenant onboarding collapses into manual support | Productize habilitación as a guided wizard (Phase 4 prerequisite) |
| Supplier→SKU matching accuracy | Human confirmation on first occurrence; mapping table is tenant-owned ground truth |
| Solo-dev bandwidth across 8 active projects | Phasing with hard gates; Kairos v2 orchestration once specs sync to Plane |
| Legal exposure on tax figures | D10 boundary in terms of service; reports labeled as "soporte para revisión del contador" |

## 8. Open questions (blocking before TASKS)

- **OQ-1:** Accountant validation — feeds the **Fiscal Rule Catalog v2026**: exact report set per régimen (ordinario vs Simple), VAT periodicity thresholds, retefuente applicability and conceptos. *Owner: Gandhi. External. Output is catalog seed data, not per-tenant config.*
- **OQ-2:** Real habilitación flow timing/cost as software propio for one tenant (set de pruebas, rangos, certificate issuance). *Owner: Gandhi. External.*
- **OQ-3:** Digital certificate unit cost per tenant per year → pricing model input.
- **OQ-4:** Product name (commercial) and service namespace.
- **OQ-5:** Repo rename / identity (`pos-modernization` → platform name) and CLAUDE.md/CONTEXT.md updates for agent consumption.
- **OQ-6:** Wira domain pack interface contract — confirm against current Wira tool-registration conventions (audit `wira` repo before Phase 3 spec).
- **OQ-7:** Documento soporte (purchases from non-obligated suppliers) — v1.1 or Phase 2?

---

## 9. Review-gate engineering assessment (2026-07-09, Claude Code)

**Verdict: architecture is sound and approvable in shape; do NOT flip to TASKS
until the three gate conditions below close.** The load-bearing decisions —
emission/reception behind ports (ADR-003/005), fiscal as a bounded context in
the monolith (ADR-001), the Catalog(global, year-versioned) × Profile(tenant)
split (§4.3.1), ThirdParty≠Customer (ADR-006), and the D10 "prepare figures,
don't file" boundary — are the right calls and should not be relitigated.

### Gate conditions (block the TASKS breakdown)
1. **OQ-1 must yield a v2026 Fiscal Rule Catalog skeleton** — it is a *Phase 1*
   input, not just Phase 4. The sales/VAT view cannot be correct without it, so
   Phase 1 is partially blocked on OQ-1, not merely Phase 0.
2. **Signing / set-de-pruebas spike** — one document accepted in DIAN set de
   pruebas (UBL 2.1 per anexo técnico + XAdES + CUFE) *before* any Phase 4
   timeline is committed. This is the single largest schedule risk and §4.1
   currently lists it as a one-liner.
3. **Certificate-custody ADR (proposed ADR-007)** — see below.

### Ranked risks / gaps (surfaced at review; not yet reflected in §1–8)
| # | Gap | Why it matters | Suggested action |
|---|-----|----------------|------------------|
| R1 | Unit economics unsolved until Phase 4 | Plemsi 88 COP/doc keeps flowing in prod until `DianDirectAdapter` passes habilitación *per tenant*; at POS DE volume that is a long negative-margin runway | Treat Phase 4 as **not** freely swappable with Phase 3 (revises §6); state interim margin plan at gate |
| R2 | XAdES/CUFE/set-de-pruebas underspecified | Where most DIAN builds bleed time; unestimated | Gate condition #2 spike |
| R3 | Certificate custody | Holding tenant signing keys ⇒ ability to emit legally-binding docs on their behalf — larger exposure than the filing boundary | Gate condition #3 (ADR-007): key custody (HSM vs software keystore), issuance, revocation, non-repudiation |
| R4 | Régimen Simple retención semantics | RST payers are generally **not** agentes de retención de renta; catalog must encode RST exclusions | Add as explicit OQ-1 sub-item |
| R5 | Email reception is untrusted input (ADR-004) | ZIP/XML from email → XXE, zip bombs, spoofed-sender forged AttachedDocuments; no genuineness check stated | Require CUFE verification vs DIAN + sender allowlist + dedup; verify `radian` already hardens this before "port the parsing libs" |
| R6 | POS-scale emission mechanics | Failed-emission reconciliation, contingencia numbering when DIAN is down mid-shift, gapless resolución-de-numeración consumption, DIAN rounding rules — all classic set-de-pruebas rejection causes | Add an emission-integrity section to §4.1 before Phase 1 |
| R7 | Agent write-confirm audit trail | A WhatsApp "sí" authorizing a legally-binding emission needs a non-repudiation record | Immutable confirmation log tied to the emitted CUFE (extends D9) |

### Proposed additions
- **ADR-007 — Certificate & signing-key custody** (per R3): decide HSM vs
  encrypted software keystore, key issuance/rotation/revocation, and the
  non-repudiation record. Blocks Phase 4; should exist before the gate.
- **OQ-1a** — Régimen Simple retefuente/retención exclusions in the catalog (R4).
- **OQ-8** — POS emission mode: sync-blocking vs async-on-`SaleClosed` with
  contingencia fallback and reconciliation (R6).

### Coupling note for this repo
OQ-5 (rename `pos-modernization` → platform) touches the RBAC / Kairos /
CLAUDE.md machinery. The `accountant` role parked in PR #25
(`system-roles.ts`, marked "reserved for M5 fiscal work") is the first fiscal
footprint already landed in this repo — M5 and the RBAC work are coupled at
that seam. Gate the `accountant` route wiring on this spec's approval.

---
*Next step per workflow: review/approval gate (Telegram), then TASKS breakdown synced to Plane.*

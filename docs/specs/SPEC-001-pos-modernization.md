---
# ============================================================
# DESIGN DOC METADATA
# Parseable by Kairos design-doc parser to create Plane structure.
# This file is the master doc; per-feature SPECs live alongside as
# SPEC-002, SPEC-003, ... and are auto-discovered (discoveryMode: auto).
# ============================================================

id: pos-modernization-master
title: "POS Modernization — Master Design Doc"
type: design-doc
status: active
author: gandhi
created: 2026-05-21
version: "1.0"

# ============================================================
# PLANE TARGET
# ============================================================
plane:
  workspace: gor                       # same Plane workspace as Kairos
  project_id: "ff10b5ea-863d-4b34-9da8-039ecb47a0bf"   # existing Plane project, adopted (SPEC-006 §3.3 bootstrap)
  project_name: "POS Modernization"
  project_identifier: POS              # Plane project prefix
  description: "Full-stack POS replacing legacy .NET apps — Next.js + NestJS + MySQL"

# ============================================================
# MODULES (units of scope — what)
# Codes must match /^[A-Z][A-Z0-9]*$/, 2-5 chars.
# ============================================================
modules:
  - id: M1
    code: INFRA
    name: "Infrastructure & Deployment"
    description: >
      Docker compose, MySQL 8.0, Caddy/Traefik routing, secrets management,
      Coolify deployment. Cross-cutting platform concerns.
    priority: high
    target_date: null
    status: in_progress

  - id: M2
    code: BACK
    name: "Backend — NestJS API"
    description: >
      NestJS 10 server: REST endpoints, auth, transactions, inventory,
      reporting. Replaces the legacy .NET Web API.
    priority: critical
    target_date: null
    status: in_progress

  - id: M3
    code: FRONT
    name: "Frontend — Next.js POS UI"
    description: >
      Next.js 14 (App Router) + Tailwind. Cashier workstation UI, back-office
      dashboards. Replaces the legacy .NET desktop app.
    priority: critical
    target_date: null
    status: in_progress

  - id: M4
    code: MIGR
    name: "Migration from Legacy"
    description: >
      Data migration scripts, parity testing, gradual cutover plan for the
      legacy .NET stack in `legacy-implementations/`.
    priority: medium
    target_date: null
    status: in_progress

  - id: M5
    code: FISC
    name: "Fiscal Platform & Accounting Agent"
    description: >
      New bounded context (DESIGN-001, 2026-06-10): own DIAN emission engine
      behind EmissionPort (Plemsi bridge + direct adapter), reception via
      email ingestion, ledger (sales/purchases books, VAT, retefuente),
      tenant fiscal profiles, Wira accounting domain pack. Shifts the repo
      identity from POS to Automatizate platform (rename pending, OQ-5).
    priority: high
    target_date: null
    status: planned

# ============================================================
# CYCLES
# Empty until there's an external commitment that requires
# time-boxed delivery (client launch, demo, etc.).
# ============================================================
cycles: []

# ============================================================
# ISSUES
# Empty by design. Add per-feature SPEC files at
# docs/specs/SPEC-002-<slug>.md, SPEC-003-<slug>.md, ... and Kairos
# auto-discovers them on push (discoveryMode: auto).
# Each SPEC file becomes one Plane issue; module assignment comes from
# docs/specs/_modules.yml.
# ============================================================
issues: []
---

# POS Modernization — Master Design Doc

## 1. Purpose

Replace the legacy .NET POS stack (`legacy-implementations/`) with a modern
TypeScript-first stack: Next.js 14 frontend + NestJS 10 backend + MySQL 8.0,
all containerized via Docker. All active work lives in `new-implementation/`.

This file is the Plane-syncable master doc. It declares the project, its
modules, and (initially empty) issue list. Individual features are tracked
in their own `docs/specs/SPEC-NNN-<slug>.md` files, auto-discovered by Kairos.

## 2. Scope

In scope:
- The full POS stack: cashier UI, back-office, payments, inventory, reporting.
- Migration from legacy .NET artifacts in `legacy-implementations/`.

Out of scope:
- The legacy stack itself — read-only reference only.
- Customer-specific customizations that don't fit the generic POS product.

## 3. Conventions

- Active code: `new-implementation/backend/` and `new-implementation/frontend/`.
- Legacy reference (read-only): `legacy-implementations/`.
- Per-feature design docs: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
  (superpowers brainstorming output).
- Per-feature SPEC files for Plane: `docs/specs/SPEC-NNN-<slug>.md` (this file's
  siblings — auto-discovered).
- Implementation plans: `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`.

## 4. Tasks

None defined in this master doc yet. Add per-feature SPECs as work is planned.

## 5. References

- `CLAUDE.md` — stack overview + commands.
- `README.md` — project intro.
- `docs/superpowers/specs/` — design docs (superpowers SDD).
- `docs/superpowers/plans/` — implementation plans.
- Kairos project record: `pos-modernization` (registered via `/addproject`
  on 2026-05-21; webhook secret in GitHub repo settings).

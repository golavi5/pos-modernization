# Fiscal Platform & Conversational Accounting Agent

**Status**: APPROVED — 2026-11-18 (PR #102). **Diseño aprobado en la puerta de revisión por Gandhi Olavi** ([registro de la puerta](../superpowers/specs/2026-06-10-fiscal-platform-design.md#gate-record)): condición n.º 2 cumplida ([spike de firma, PR #101](../superpowers/specs/2026-11-09-fisc-001-signing-spike-plan.md#result): una factura aceptada en el set de pruebas de la DIAN, solo factura de venta) y ADR-007/OQ-8 aceptados 2026-11-10. R1 resuelto: la Fase 4 va antes que la Fase 3, sin tope de costo interino. **Sigue bloqueado el desglose TASKS** hasta cerrar OQ-1/1a (sesión con contador, agenda lista), OQ-2 (el propietario registró personalmente el software y obtuvo el set de pruebas del spike: estimación suya de unos 15 min y hasta ~100.000 COP, sin medir y sin detallar el costo; no se ha probado el paso a producción ni una resolución de numeración propia) y OQ-3 (cotizaciones de certificado, sin enviar). No hay código fiscal en el backend; nada de esto está verificado contra producción.

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

Blocking before TASKS (the review gate was held 2026-11-18, see the status line): OQ-1 (accountant
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

> **Update (2026-11-10):** proposals for **ADR-007** (key custody) and **OQ-8** (POS
> emission mode) are drafted in
> [`2026-11-10-fisc-001-gate-proposals.md`](../superpowers/specs/2026-11-10-fisc-001-gate-proposals.md)
> and were **accepted by the owner the same day** (ADR-007 option A; OQ-8 async outbox).
> Still DRAFT: the review gate, OQ-1/1a, OQ-2, OQ-3 and the signing spike need a human
> or credentials. Prepared 2026-11-09, nothing run: the
> [accountant session agenda](../superpowers/specs/2026-11-09-fisc-001-accountant-session-agenda.md)
> (OQ-1/1a and the two VERIFY items), the
> [OQ-2 habilitación checklist](../superpowers/specs/2026-11-09-fisc-001-oq2-habilitacion-checklist.md),
> the [OQ-3 certificate quote request](../superpowers/specs/2026-11-09-fisc-001-oq3-certificate-quote-request.md)
> and the [signing spike plan](../superpowers/specs/2026-11-09-fisc-001-signing-spike-plan.md).
>
> **Actualización (2026-11-18):** el *spike* de firma/set de pruebas se ejecutó: una factura electrónica de venta fue
> aceptada por la DIAN en habilitación al primer envío (confirmado por el propietario en el portal); ver el
> [resultado](../superpowers/specs/2026-11-09-fisc-001-signing-spike-plan.md#result). Con esto se cumple la condición
> de puerta n.º 2. **Sigue en DRAFT:** faltan la revisión/aprobación, OQ-1/1a, OQ-2 y OQ-3.

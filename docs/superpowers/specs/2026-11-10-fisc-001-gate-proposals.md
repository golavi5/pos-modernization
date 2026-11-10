# FISC-001 gate proposals — ADR-007 (key custody) and OQ-8 (POS emission mode)

**Status:** **ADR-007 ACCEPTED and OQ-8 ANSWERED — 2026-11-10, Gandhi Olavi** (ADR-007: option A as proposed, controls 1–6 mandatory, KMS/HSM as a later drop-in; OQ-8: async via transactional outbox as the default). The two VERIFY items below (CA/accountant on third-party custody; delivery-before-validation and numbering/contingencia rules) remain open and go on the OQ-1 agenda. **Nothing is built.** Prepared originally so the owner could decide at the review gate. Parent: [`2026-06-10-fiscal-platform-design.md`](2026-06-10-fiscal-platform-design.md) §5 (ADR-007) and §8 (OQ-8).

What I could and could not do for the gate. Of its blockers, these two are design questions and are drafted below. The rest need a human or credentials and stay open: the review gate itself, OQ-1/1a (accountant), OQ-2 (a real habilitación dry run), OQ-3 (certificate cost), and the signing / set-de-pruebas spike (needs a real certificate and DIAN test-set access). Regulatory points are marked **VERIFY**; I did not assert DIAN rules from memory.

---

## ADR-007 — Certificate & signing-key custody

**Context.** `DianDirectAdapter` signs every document (UBL 2.1, XAdES) with the tenant's digital certificate. Holding that key means holding the ability to emit legally binding documents in the tenant's name (design §9, R3). §4.1 already requires a custody interface that "both an encrypted software keystore and an HSM can satisfy" and forbids persisting a real tenant key until this ADR lands.

**Options**

| | A. Encrypted software keystore (envelope) | B. KMS / HSM, non-exportable key | C. Tenant-held signer |
|---|---|---|---|
| Key location | encrypted at rest, decrypted in memory only while signing | never leaves the HSM | never reaches the platform |
| Fits today's infra (one VPS, Coolify, no cloud KMS) | yes | no: new dependency and cost | yes |
| Works with the certificate as issued (a `.p12`) | yes | **VERIFY** whether the CA's certificate can be imported or a remote-signing service exists | n/a |
| Operational burden on a small POS tenant | none | none | high; an offline signer breaks checkout |
| Residual risk | host compromise exposes both KEK and ciphertext | lowest | lowest for the platform, highest for UX |

**Proposed decision: A now, behind the custody interface, with B as a drop-in later.** Controls that make A defensible:
1. **Envelope encryption.** One data key per tenant (AES-256-GCM) encrypts the PKCS#12. The data keys are wrapped by a key-encryption key that lives **outside the database** (a Coolify secret, not in `backend/.env` committed anywhere). A database dump alone reveals nothing.
2. **Decrypt only inside `SigningService`**, per operation, never logged, returned, serialized or cached beyond the call.
3. **No signature without an authorization.** `sign(document, { authorizationId })` refuses otherwise. For agent-initiated emissions the id is the confirmation (design D9 / R7); for POS-automatic emissions it is the sale id plus the system actor.
4. **Non-repudiation log.** Append-only `fiscal_signing_log` (tenant, document, CUFE, authorization, actor, time, hash of the signed payload). The application's DB user gets INSERT/SELECT only, no UPDATE/DELETE.
5. **Lifecycle.** Renewal alerts at 60/30/7 days; a revocation runbook (revoke at the CA, delete the ciphertext, mark the tenant "signing disabled", re-habilitate); KEK rotation by re-wrapping the data keys; the KEK backup is held separately from the database backup, so a restore needs both.
6. **Test certificates only** until the spike passes and this ADR is accepted (already §4.1's rule).

**Consequences.** Cheap and compatible with the current deployment; the platform remains a high-value target, which is why controls 1, 3 and 4 are mandatory rather than nice-to-have. Moving to B later changes only the custody implementation.

**Decisions for the owner.** (a) Accept A with these controls and the residual host-compromise risk. (b) Who holds the break-glass KEK backup. **VERIFY (CA / accountant):** whether the CA's terms allow a third party to hold and use the certificate on the tenant's behalf, and what DIAN's software-propio habilitación says about the signer.

---

## OQ-8 — POS emission mode

**Facts in this codebase.** A sale closes in one DB transaction: `PaymentsService.recordPayment` locks the order, records the payment and marks it `completed`. There is no event bus, queue or scheduler in the backend today (`@nestjs/schedule` appears only in a comment in the notification scheduler).

**Options.** *Sync:* the cashier waits for DIAN. *Async:* the sale completes at once and the document is emitted afterwards.

**Proposed decision: async via a transactional outbox, as the default.**
- **Enqueue inside the sale's transaction.** `recordPayment` inserts a `fiscal_emission_outbox` row (`order_id` **UNIQUE**, tenant, `status = pending`, `attempts`, `next_attempt_at`) in the same transaction that completes the order. Either both commit or neither does, and the unique key makes emission exactly-once per sale (the same lesson as the payment and refund races fixed in #64 and #68).
- **A worker emits.** It claims rows with `SELECT … FOR UPDATE SKIP LOCKED` (MySQL 8), calls `EmissionPort`, retries with backoff, and records the CUFE. Phase 1 needs a scheduler for this (`@nestjs/schedule` or an interval).
- **Gapless numbering at emission, not at sale time.** The consecutive number is taken inside the worker's transaction under a row lock on the numbering range, so a failed attempt does not burn a number. **VERIFY** the resolución-de-numeración rules.
- **DIAN unreachable:** after N failed attempts the row moves to contingencia numbering. **VERIFY** the contingencia rules.
- **Visibility.** Failed or stale rows appear in a reconciliation view and raise a notification; the receipt shows the fiscal state (pending / validated + CUFE and QR).
- Checkout **never blocks** on DIAN.

**Caveat that needs the accountant (add to the OQ-1 session agenda).** Whether a document may be handed to the buyer *before* DIAN validation depends on the document type and DIAN's rules: **VERIFY.** If it must be validated first for some type (for example a factura de venta to an identified buyer), that type uses *enqueue, then wait up to N seconds for the row, then fall back to contingencia*. That hybrid reuses the same outbox, so the schema does not depend on the answer.

**Decisions for the owner.** (a) Accept async-outbox as the default. (b) Get the delivery-before-validation rule from the accountant.

---

## What still blocks the TASKS breakdown

| Blocker | Who / what it needs |
|---|---|
| Review gate | the owner |
| OQ-1 / OQ-1a Fiscal Rule Catalog v2026 | an accountant |
| OQ-2 real habilitación dry run | the owner, one real NIT |
| OQ-3 certificate unit cost | quotes from CAs |
| Signing / set-de-pruebas spike | a certificate and DIAN test-set access |
| **ADR-007** | **drafted above: accept or amend** |
| **OQ-8** | **drafted above: accept or amend** |

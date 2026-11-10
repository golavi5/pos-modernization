# FISC-001 — Signing / set-de-pruebas spike plan

**Status:** Draft — not started. Blocked on a **test** certificate and DIAN set-de-pruebas access, both from the owner. Prepared 2026-11-09.

Gate condition #2 (design §9): **one document accepted in the DIAN set de pruebas** (UBL 2.1 per anexo técnico + XAdES + CUFE) before any Phase 4 timeline is committed. The spike answers one question: how hard is signing that DIAN accepts? It is throwaway code, not the `DianDirectAdapter`.

## Rules (ADR-007 control 6 and §4.1)
- **Test certificate only.** A real tenant key is never used, copied or persisted.
- Runs in a **scratch directory outside the repo**. Nothing from it is committed: no certificate, password, TestSetId, software PIN, or a response containing them.
- Credentials are passed as environment variables for the session and deleted at the end. The certificate file is deleted when the spike ends.
- What returns to the repo is a written result: what worked, what was rejected and why, time spent. Code is not brought back.

## Inputs needed from the owner
1. Test certificate (`.p12`) and its password — source per [OQ-3 template](2026-11-09-fisc-001-oq3-certificate-quote-request.md) Q9.
2. Habilitación test environment: software id, software PIN, TestSetId, the test endpoint URL (from [OQ-2 checklist](2026-11-09-fisc-001-oq2-habilitacion-checklist.md) steps 2–3).
3. The current anexo técnico version and its resolución, downloaded from DIAN. **VERIFY** the version in force. It is the only reference for the XML; nothing is written from memory.
4. The NIT the test set is registered to, and a test numbering range/prefix if the set requires one. **VERIFY**

## Document
**One documento: factura electrónica de venta**, the type the anexo and existing tools document best. The documento equivalente POS comes second if the first is accepted quickly. **VERIFY** whether the POS set de pruebas is separate.

## Steps
| # | Step | Done when |
|---|---|---|
| 1 | Build the UBL 2.1 XML for one invoice from the anexo: issuer, buyer, one line with VAT, totals, numbering | validates against the anexo's XSD |
| 2 | Compute CUFE per the anexo's formula (field order and hash algorithm from the anexo, **VERIFY**) | matches the anexo's worked example, if it gives one |
| 3 | XAdES enveloped signature (profile and DIAN signature policy per the anexo, **VERIFY**) with the test certificate | signature verifies locally with an independent tool (e.g. `xmlsec1`) |
| 4 | Wrap in the SOAP request (`SendTestSetAsync`, WS-Security with the certificate) **VERIFY** operation name | DIAN returns a ZipKey / track id |
| 5 | Poll status (`GetStatusZip`) **VERIFY** | **accepted**, or rejection rule codes recorded |
| 6 | Iterate on rejections | accepted, or a time-box hit |

**Time-box:** 3 working days of effort. If it is not accepted by then, stop and report the remaining rejections. That outcome is the schedule risk the gate exists to expose.

**Library choice is part of the result:** try Node first (stack fit). Write down which XAdES library worked, or why none did and what was used instead (e.g. a Java/.NET signer). If a library needs the private key in a form ADR-007 forbids (unencrypted on disk), that is a finding, not something to work around.

## Report (goes into this doc's Result section, then into FISC-001's update note)
- Accepted: yes/no, date, document type, attempts.
- Each rejection: DIAN rule code, cause, fix.
- Libraries and tools used; anything that needed the key outside `SigningService`-style in-memory use.
- Effort in hours → an evidence-based estimate for the Phase 4 adapter.

## Result
_Not run._

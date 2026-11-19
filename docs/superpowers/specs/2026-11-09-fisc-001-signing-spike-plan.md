# FISC-001 — Signing / set-de-pruebas spike plan

**Status:** Executed 2026-11-18 — gate condition #2 met: one factura accepted in the DIAN habilitación set de pruebas (owner confirmed in the portal). Result below.

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
**Run 2026-11-18, owner's test NIT and test certificate, scratch directory outside the repo. Nothing from the run is committed.**

**Outcome.** One factura electrónica de venta, built and signed by throwaway scripts, was accepted by the DIAN habilitación service on the **first send**: `SendTestSetAsync` returned a ZipKey, `GetStatusZip` went from "Batch en proceso de validación" to "Set de prueba … se encuentra Aceptado" (`StatusCode 2`) within about 10 s, and the owner confirmed in the habilitación portal that everything was accepted. No rejection was received, so no DIAN rule code was exercised. One caveat: the API's `IsValid` stayed `false` throughout, and the per-document result was read from the portal, not from the API response.

**What was built, against anexo técnico v1.9 (Resolución 000165 de 2023-11-01) and DIAN's own toolbox:**
| Step | Result |
|---|---|
| 1. UBL 2.1 invoice | Built from DIAN's `Consumidor Final.xml` example, one line with 19% IVA; validates against `UBL-Invoice-2.1.xsd`. DIAN's own examples validate with the same harness. |
| 2. CUFE (SHA-384, anexo 11.2) and `SoftwareSecurityCode` (11.8) | CUFE reproduces the anexo's worked example exactly. DIAN accepted our CUFE, which confirms the `ClTec` and field order used. |
| 3. XAdES-EPES enveloped signature (anexo 10) | RSA-SHA256, c14n 2001, three references (document, KeyInfo, SignedProperties), DIAN policy v2 with the hash of the policy PDF (matches DIAN's signed example), certificate chain in `X509Data`. Verified independently with the JDK's XMLDSig before sending. |
| 4. SOAP 1.2 + WS-Security (anexo 7.5, 15.6-15.7) | X.509 binary token, RSA-SHA256, exclusive c14n, `wsa:To` signed, 60 s timestamp. DIAN accepted it with **no TLS client certificate**. |
| 5. Status | `GetStatusZip` polled until the set was accepted. |

**Findings that matter for the Phase 4 estimate**
- **No library problem.** Python `lxml` (canonicalisation) plus `cryptography` (RSA-SHA256) were enough; no XAdES library was needed. Node was **not** evaluated, so the "Node first" question in this plan is still open. The key was loaded from the PKCS#12 into memory only and never written unencrypted, which fits ADR-007's decrypt-in-memory-inside-`SigningService` control.
- **Everything needed is in DIAN's toolbox:** anexo PDF, XSDs, 30+ example XMLs, the policy PDF. The numbering range used (`SETP`, 990000000-995000000, resolución `18760000001`) and the technical key come from the anexo's examples and were accepted for this test set.
- **Spec inconsistencies found:** the anexo (10.10) gives the policy identifier as `.../politicadefirma/v2/...` while DIAN's example uses `.../v1/...`; **v2 was accepted**. The ZIP/XML naming `ppp` code for software propio was assumed to be `000` and was accepted.
- **Latency:** asynchronous validation of one document took about 10 s, which is relevant to the outbox design (OQ-8).
- **Not covered:** notas crédito/débito, the documento equivalente POS, contingencia numbering, production habilitación, volume, multiple documents per ZIP, the DIAN schematron rules locally (the 2019 `.sch` needs an XSLT 3 processor), and the effort in hours (not recorded).

**Next.** Delete the test certificate and the env file from the scratch directory. The spike scripts stay out of the repo; this document is the deliverable.

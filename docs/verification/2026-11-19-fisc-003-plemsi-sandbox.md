# SPEC-FISC-003 — Plemsi sandbox run (2026-11-19)

**Outcome: partial.** One **factura de venta** went through the whole stack (outbox → worker → `PlemsiAdapter` → DIAN verdict → sales ledger) and was **validated by DIAN** in Plemsi's sandbox. The **documento equivalente POS was not run** (owner skipped it, see below) and the **nota crédito was refused by Plemsi** for a payload reason that is now understood but not yet fixed. SPEC-FISC-003 acceptance item 3 ("a document issued in Plemsi's test environment") is met for the factura only.

**Redaction.** No token, NIT, legal name, QR value or provider document body is recorded here. CUFEs are not recorded. Resolution numbers of the owner's account are not recorded. The sandbox account also held a 2024 document of another company; none of its data is recorded.

## How it was run
`backend/scripts/fiscal-sandbox-run.ts <env-file> [--skip-pos]`, against a throwaway MySQL 8 and the real `OutboxWorker`, `PlemsiConfigService` (token envelope-encrypted with a one-time key), `DocumentsService` and `SalesLedgerService`. Credentials came from a `chmod 600` file outside the repo that the script never prints; everything it prints is redacted. Host: Plemsi sandbox (`pruebas.plemsi.com`, from ApiFacturame's config; it answered, so the VERIFY on the host is resolved).

## Results
| Step | Result |
|---|---|
| Numbering lookup (`remaining-numbers`) | Works for the three ranges. Unused range returns `number: null`. |
| Status lookup of an unknown document | **HTTP 404**, mapped to `null` as designed (VERIFY resolved). |
| **Factura de venta**, final consumer, one line with 19% IVA | `POST /api/billing/invoice` → **201**; status read-back → `state: Emitted`, DIAN `IsValid: true`, "Procesado Correctamente". Worker: `sent` → `validated`. Ledger entry written in the same transaction, dated 2026-11-19, equal to DIAN's `IssueDate`; base 10,000, tax 1,900, total 11,900. Two DIAN notifications (rules FAJ43b, FAJ44b, name/NIT vs RUT) that ApiFacturame's own sandbox notes show on every accepted invoice. |
| Invoice PDF (`/api/billing/invoice/pdf/{cufe}`, Bearer, relative URL as in sandbox mode) | **HTTP 500**. ApiFacturame's notes also say "sandbox PDF broken". Production behaviour (raw key, absolute host) not exercised. Still VERIFY. |
| **Nota crédito** (reference to the validated factura) | `POST /api/billing/credit` → **500, `ENCE017`**, `data`: *Cannot read properties of undefined (reading 'identification_number')*. Plemsi's credit-note endpoint **requires a `customer` object**; for a final consumer we (like ApiFacturame) omit it. Not accepted. |
| **Documento equivalente POS** | Skipped by the owner after three refusals caused by the account's numbering (below). Not run, not proven. |

## What the sandbox taught us (and what was fixed in code)
All fixes have unit tests and, where they touch the worker, e2e tests on real MySQL.
1. **A 400 with an empty `errCode` is permanent.** Plemsi answers a wrong resolution with `400 {"success":false,"info":"Given resolution is not available","errCode":""}`. The classifier only knew `errCode`/`errors`, so it retried; a 400/409/422 with a JSON message is now a permanent rejection.
2. **Document type of the numbering range matters.** A POS range registered as document type 2 is refused for `equivalent/pos`; POS ranges are type 14. Enabling emission does not check this; the admin sees it only at the first send.
3. **A resolution can hold several ranges with the same prefix** (an exhausted 1..1,000,000 next to a live 1..1000). `nextNumber` took the first and computed an out-of-range number. It now skips exhausted ranges and refuses to guess between two live ones. For an unused range it starts at the range's first number (the old code got 1 only because `Number(null) + 1`).
4. **A lookup by prefix+number can return somebody else's document**: another resolution of the same account, or a stale one at the same number. The worker twice recorded our sale as "rejected by DIAN" because of a stale 2024 document. `getStatus` now checks resolution, prefix and date (a document older than our first attempt is not ours) and prefers the CUFE once known.
5. **Rejected or refused sends do not consume numbers** (`lastNumberUsed` stayed null after four refused POSTs).

## Open
- **Nota crédito:** needs a `customer`. What Plemsi/DIAN accept for a credit note to a final consumer is unobserved; the generic-consumer identification and its document-type code are VERIFY (anexo tables). Until then, credit notes work only for invoices that had an identified buyer, which is also untested.
- **POS:** needs a type-14 range without stale documents (a fresh prefix); the number the worker picks is the range start, which collides with a stuck stale document if one exists.
- **PDF:** sandbox returns 500; production auth quirk unverified.
- **Billing:** whether Plemsi bills sandbox documents is unknown to the author.
- All DIAN/Plemsi codes in `plemsi.constants.ts` remain VERIFY against the anexo; the accepted factura is evidence for the invoice shape (unit 70, IVA tax id 1, payment 1/10, truncation) only.

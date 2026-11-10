# FISC-001 — OQ-2 habilitación dry-run checklist

**Status:** Draft — dry run not started. Prepared 2026-11-09. Owner: Gandhi Olavi (needs one real NIT and its MUISCA access).

Goal (design §8 OQ-2): measure the real **time and cost** of habilitación as software propio for one tenant. Do not design the wizard yet. Record what actually happens; every step marked **VERIFY** is my understanding of the flow and must be confirmed against the DIAN portal and its current instructions.

Use one tenant (tenant zero, an Automatizate entity per design §6). Do not use a customer's NIT.

## Before starting
- [ ] Tenant chosen; NIT, legal representative, and who holds the MUISCA credentials recorded (names in your notes, not in this repo).
- [ ] RUT up to date with the responsabilidad for facturación electrónica. **VERIFY** which code
- [ ] Digital certificate: already held / to be bought (feeds OQ-3: note supplier, price, lead time).
- [ ] Decide the mode registered with DIAN: software propio (target) vs proveedor tecnológico (Plemsi today).

## Steps (record start/end date and effort for each)

| # | Step | Started | Done | Hours of human effort | Blockers / notes |
|---|---|---|---|---|---|
| 1 | Register as facturador electrónico in the habilitación portal. **VERIFY** | | | | |
| 2 | Register the software (software propio): name, PIN, software id. **VERIFY** | | | | |
| 3 | Obtain the set de pruebas (TestSetId) and test endpoint. **VERIFY** | | | | |
| 4 | Send the required test documents per type (counts per DIAN's current rule). **VERIFY** | | | | |
| 5 | Set de pruebas accepted | | | | |
| 6 | Request the resolución de numeración (prefix, range, validity) | | | | |
| 7 | Associate prefix/range to the software in the portal. **VERIFY** | | | | |
| 8 | Switch to production; first real document validated | | | | |
| 9 | Same flow for the documento equivalente POS, if it is a separate habilitación. **VERIFY** | | | | |

Steps 3–5 are the signing spike's territory ([spike plan](2026-11-09-fisc-001-signing-spike-plan.md)). The spike uses a test certificate, so it can run before this checklist does.

## Record at the end
- Total calendar days, steps 1→8, and total human hours.
- Money spent (certificate, any fees) — feeds OQ-3.
- Which steps a tenant could do alone vs needs us (input to the Phase 4 wizard, design §7).
- Which steps repeat per tenant vs once for the platform.
- Rejections received in the set de pruebas, with the DIAN rule code and fix.

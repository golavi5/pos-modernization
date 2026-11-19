# FISC-001 — Can the owner's certificate sign for every customer?

**Status:** Research note, 2026-11-18. Not legal advice; points not read in a primary source are marked VERIFY.

**Question (owner):** use one digital certificate, the owner's, to sign the documents of all customers, so each tenant does not need its own (140,000 COP per tenant per year, OQ-3).

## Answer
**Not under the approved model (D2, software propio per tenant). Yes only by becoming a DIAN-authorized Proveedor Tecnológico (PT), which is a different and much heavier model.**

## Evidence
| Source | What it says |
|---|---|
| Anexo técnico v1.9 (Res. 165/2023), rule **ZE03**, §8.8.5 | Rejection: "ID del emisor difiere del propietario del Certificado Digital". A document whose issuer is the customer's NIT, signed with the owner's certificate, fails this rule. |
| Anexo §10.12 Firmante | `SignerRole` is `supplier` when the obligado a facturar signs, and `third party` when a **Proveedor Tecnológico** (or a third party acting for it) signs. |
| Anexo §10.9 | The signature is applied by the facturador or by "el proveedor tecnológico expresamente autorizado por este". |
| Res. 165/2023 arts. 11 num. 14 and 19 num. 13 | The invoice carries "la firma digital del facturador electrónico"; the POS equivalent "la firma digital del emisor". |
| Res. 165/2023 **art. 55** (compiled as 1.5.1.8.1.1 in Res. 227/2025) | PT requirements: a sociedad constituted in Colombia or a sucursal of a foreign company; RUT; **patrimonio contable ≥ 20,000 UVT**, of which **propiedad, planta y equipo ≥ 10,000 UVT**; ISO 27001 certification (may be delivered within 18 months of the habilitación); contingency plan; professional staff. Art. 56: habilitación for 5 years. |

So a third party can sign for a facturador only as a PT. The spike worked because the owner's certificate signed a document issued by the owner's own NIT.

## What this means
- **20,000 UVT is roughly 1,000 million COP** (at the 2025 UVT of 49,799 COP; **VERIFY** the current UVT). With 3 customers this is out of proportion.
- "Automatizate LLC" reads as a foreign entity. Art. 55 needs a Colombian sociedad or a registered sucursal. **VERIFY** the owner's entity.
- Being a PT contradicts D2. The design would change: one software and one certificate for all tenants, and the platform carries the PT obligations.
- **VERIFY:** how DIAN applies ZE03 to PT-signed documents and how a facturador authorizes a PT in the portal. Neither was read in a primary source.

## Options
| | Model | Certificate | Cost / effort |
|---|---|---|---|
| **A (recommended, current design)** | Software propio per tenant | One per tenant, held under ADR-007 | ~140,000 COP per tenant per year; ask SOENAC for volume pricing. The owner's certificate serves tenant zero. |
| B | Become a PT | One, the platform's | Art. 55 requirements; a commercial decision for when volume justifies it. |
| C | Keep an existing PT (Plemsi) for tenants without a certificate | The PT's | 88 COP per document; already possible through `EmissionPort` (D5). |

A and C can coexist per tenant, which is what D5 already allows.

# FISC-001 — Accountant session agenda (OQ-1 / OQ-1a)

**Status:** Draft — session not held. Prepared 2026-11-09 so the owner can run the session; nothing below is an answer.

Parent: [`2026-06-10-fiscal-platform-design.md`](2026-06-10-fiscal-platform-design.md) §8 (OQ-1, OQ-1a, OQ-8), §9 (R4, R6) and [`2026-11-10-fisc-001-gate-proposals.md`](2026-11-10-fisc-001-gate-proposals.md) (the two VERIFY items routed here).

**Output wanted:** seed data for the **Fiscal Rule Catalog v2026** (global, year-versioned; design §4.3.1). It is not per-tenant config. For every answer, record the **norm it rests on** (decreto, resolución DIAN, artículo del Estatuto Tributario) and its version or date. An answer with no source stays **VERIFY** in the catalog.

Nothing here is asserted as a rule. The questions are phrased so the accountant supplies the fact; no thresholds, rates or dates are given from memory.

---

## 1. Report set per régimen (OQ-1)

1. For **régimen ordinario** (persona jurídica and persona natural): which books and reports must the platform produce so the contador can file? (Sales book, purchases book, VAT by period, retenciones practicadas, anything else.)
2. Same question for **Régimen Simple de Tributación (RST)**: what changes and what disappears?
3. Which of those are **legal obligations** and which are just convenient support for the contador? The design labels every figure "soporte para revisión del contador" (D10). Confirm that framing is enough.
4. What retention period applies to the electronic documents and books we store, and in what format? **VERIFY**

## 2. VAT periodicity (OQ-1)

5. What decides bimonthly vs four-monthly VAT filing (gross-income thresholds in UVT, the year they apply to)? Give the current figures and their source.
6. How does an RST taxpayer declare VAT/consumo, and does it change the periodicity our VAT view must group by?
7. Is a non-VAT-responsible tenant (no responsable de IVA) in scope for a VAT view at all?
8. Impuesto nacional al consumo: which POS tenants (e.g. restaurants) need it instead of VAT, and how must it appear in the books?

## 3. Retención en la fuente (OQ-1)

9. Which **conceptos** apply to a typical POS tenant's purchases (compras, servicios, honorarios, arrendamientos, …)? Give the **base mínima** (in UVT) and **tarifa** for each, with the source.
10. Who is an **agente de retención**: what makes a tenant one, and what makes its supplier subject to it?
11. Do ReteIVA and ReteICA belong in v1? If ReteICA does, how is the municipal rate determined per tenant?
12. When the catalog year changes (new UVT), does the retention rule follow the transaction date, the document date or the payment date? **VERIFY**

## 4. Régimen Simple retención exclusions (OQ-1a)

13. Confirm or correct design R4: RST payers are generally **not** agentes de retención de renta. What are the exceptions?
14. When an RST tenant **buys** from an ordinario supplier, or an ordinario tenant buys from an RST supplier, which retentions apply on each side?
15. Does RST change the obligation to practise ReteIVA? ReteICA?

## 5. Delivery before DIAN validation (OQ-8 caveat), per document type

The decided default is async emission (sale completes, document emitted afterwards from an outbox). The open question is when the buyer may receive the document. Answer for each row:

| Document type | May it be delivered to the buyer before DIAN validates it? | Max time allowed to transmit afterwards | Source |
|---|---|---|---|
| Documento equivalente electrónico POS | | | |
| Factura electrónica de venta (identified buyer) | | | |
| Nota crédito | | | |
| Nota débito | | | |

16. If a type must be validated first, what is acceptable at the counter while DIAN is slow (paper copy, contingencia, waiting)?

## 6. Consecutive numbering and contingencia

17. **Resolución de numeración:** must the numbers used be gapless? What happens to a number assigned to a document DIAN rejected, and must it be reused, voided or reported? **VERIFY**
18. Can one numbering range be shared across several cajas/branches of the same tenant, or does each need its own prefix?
19. **Contingencia:** what triggers it (DIAN down, our outage, internet loss at the shop)? Which numbering does it use? What must be transmitted afterwards and within how long? **VERIFY**
20. Is contingencia different for the documento equivalente POS and for the factura de venta?

## 7. Certificate custody by a third party (ADR-007 VERIFY)

21. May a software provider **hold and use** the tenant's digital certificate to sign on the tenant's behalf? Does that depend on the certification authority's terms, on DIAN's software-propio habilitación, or both?
22. If allowed, what must the tenant sign to authorize it (mandato, contract clause)? Who is liable for a document signed in the tenant's name?
23. Under software propio, who must be the signer: the tenant, its legal representative, or can it be the software provider's certificate? **VERIFY**

## 8. Wrap-up (record before leaving)

- Which answers the accountant is confident in vs needs to check, with a date for the follow-up.
- The list of sources quoted, so the catalog can cite them.
- Whether the accountant will review the catalog seed once it is written.

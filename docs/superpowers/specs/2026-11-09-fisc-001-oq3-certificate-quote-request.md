# FISC-001 — OQ-3 certificate quote-request template

**Status:** Draft — no quotes requested yet. Prepared 2026-11-09.

Goal (design §8 OQ-3): the per-tenant, per-year cost of the digital signing certificate, as a pricing input. Send the same request to at least three certification authorities accredited for DIAN electronic invoicing (current list: ONAC accredited ECD — **VERIFY**). Record the answers in the table at the end.

The question about third-party custody here is the same one as ADR-007's CA VERIFY item and the [accountant agenda](2026-11-09-fisc-001-accountant-session-agenda.md) §7. Ask both, because the CA's terms and the accountant's reading can disagree.

---

## Message (Spanish, for the CA)

> **Asunto:** Cotización — certificados de firma digital para facturación electrónica (volumen, software propio)
>
> Buen día. Somos una empresa de software que desarrolla un sistema POS con facturación electrónica como software propio ante la DIAN. Necesitamos cotizar certificados de firma digital para nuestros clientes (personas jurídicas y naturales, la mayoría pequeños comercios). Agradecemos responder:
>
> 1. Tipo de certificado adecuado para firmar factura electrónica, notas y documento equivalente electrónico POS (persona jurídica / natural / facturación electrónica u otro).
> 2. Precio por certificado y vigencia (1, 2, 3 años), con IVA discriminado.
> 3. Precios por volumen: 10, 50 y 200 certificados al año. ¿Ofrecen esquema de revendedor o aliado?
> 4. Formato de entrega: archivo PKCS#12 (.p12/.pfx), token físico, o firma remota/centralizada. ¿Se puede exportar la llave privada?
> 5. ¿Ofrecen firma en la nube o HSM administrado vía API? Costo por firma o por mes.
> 6. **Custodia:** ¿sus términos permiten que un tercero (el proveedor de software) custodie el certificado del cliente y firme en su nombre, con autorización del titular? ¿Qué documento debe firmar el titular?
> 7. Tiempo de emisión desde la solicitud, y documentos que debe aportar el cliente.
> 8. Renovación y revocación: proceso, costo y tiempo. ¿Avisan antes del vencimiento?
> 9. ¿Emiten certificados de prueba para el set de pruebas de la DIAN? ¿Con qué costo?
>
> Gracias.

---

## Answers

| CA | Cert type | Price / validity (incl. IVA) | Volume price (10 / 50 / 200) | Format · key exportable | Remote signing / HSM | Third-party custody allowed? | Issue time | Test cert | Date received |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |
| | | | | | | | | | |
| | | | | | | | | | |

**Feeds:** OQ-3 (unit cost → pricing), ADR-007 (does option B, KMS/HSM, become possible via remote signing; is custody A permitted), and the spike (test certificate source).

# M5 — Emisión directa ante la DIAN (software propio por emisor)

**Status**: DRAFT — 2026-11-18. Desglosado de SPEC-FISC-001 (Fase 4, adelantada a la Fase 3 por decisión del propietario). Nada construido. Depende de SPEC-FISC-003.

Origen: [diseño](../superpowers/specs/2026-06-10-fiscal-platform-design.md) §4.1, ADR-007, [spike](../superpowers/specs/2026-11-09-fisc-001-signing-spike-plan.md#result), [certificado único](../superpowers/specs/2026-11-18-fisc-001-shared-certificate-research.md).

## 1. Objetivo
`DianDirectAdapter` detrás del mismo `EmissionPort`, con cambio por emisor, para dejar de pagar por documento.

## 2. Lo que se sabe y lo que no
- **Probado (spike 2026-11-18):** una factura de venta aceptada en habilitación; UBL, CUFE, XAdES-EPES y SOAP/WS-Security según el anexo v1.9.
- **No probado:** el **documento equivalente POS**. No está en el anexo de factura (su tabla de tipos solo lista facturas, notas y eventos); tiene anexo propio y, probablemente, su propio set de pruebas. Es el documento del que depende el ahorro.
- **Un certificado para todos los clientes no es viable** (regla ZE03): un certificado por emisor.

## 3. Tareas
- **T-01** **Segundo spike:** un documento equivalente POS aceptado en habilitación con su anexo. Va primero; sin él no se estima el resto.
- **T-02** Custodia (ADR-007): almacén con cifrado de sobre, clave maestra fuera de la base, descifrado solo dentro de `SigningService`. **Condición previa a guardar la clave de un cliente:** confirmación de la ECD (SOENAC) de que un tercero puede custodiar y usar el certificado. Mientras tanto, solo el certificado del propietario.
- **T-03** `SigningService`: no firma sin autorización; bitácora `fiscal_signing_log` solo de inserción.
- **T-04** Constructor UBL 2.1 y CUFE/CUDE para factura, notas y POS, validado con los XSD de la DIAN en las pruebas.
- **T-05** Firma XAdES-EPES en Node (el spike usó Python; evaluar librería o implementación propia sobre canonicalización).
- **T-06** Cliente SOAP: `SendBillSync`/`SendTestSetAsync`/`GetStatusZip`, nombres de archivo según el anexo.
- **T-07** Numeración: consecutivo tomado al emitir, bajo bloqueo del rango. **VERIFY** reglas de la resolución de numeración.
- **T-08** Contingencia (factura tipo 03 del anexo). **VERIFY** disparadores y plazos.
- **T-09** Alta guiada de habilitación por emisor y alertas de vencimiento del certificado (60/30/7 días).
- **T-10** Cambio por emisor Plemsi ↔ directo, y primer emisor en producción (emisor cero).

## 4. Aceptación
- Factura, nota crédito y POS aceptados en habilitación desde el backend, con registro en `docs/verification/`.
- Un volcado de la base no permite firmar (prueba de la custodia).
- Emisor cero emite en producción por la vía directa.

## 5. Fuera de alcance
Ser Proveedor Tecnológico; HSM/KMS (queda como reemplazo posterior de la custodia).

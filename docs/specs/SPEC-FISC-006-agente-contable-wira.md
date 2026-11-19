# M5 — Agente contable en Wira

**Status**: DRAFT — 2026-11-18. Desglosado de SPEC-FISC-001 (Fase 3, va después de la emisión directa por decisión del propietario). Nada construido. Depende de SPEC-FISC-003 y SPEC-FISC-005.

Origen: [diseño](../superpowers/specs/2026-06-10-fiscal-platform-design.md) §4.5, D9, R7, OQ-6.

## 1. Objetivo
Paquete `domains/accounting/` en Wira (WhatsApp): consultas libres y escrituras siempre como propuesta con confirmación, sobre `/fiscal/v1`.

## 2. Sin revisar todavía
El repo `wira` no se auditó para este desglose. **T-01 es esa auditoría**; las demás tareas pueden cambiar con su resultado.

## 3. Tareas
- **T-01** Auditar las convenciones de registro de herramientas de Wira y fijar el contrato del paquete (OQ-6).
- **T-02** El agente usa una credencial de aplicación de SPEC-FISC-002; el emisor se resuelve desde la tenencia de Wira.
- **T-03** Herramientas de consulta: ventas, estado de documentos, acuses pendientes.
- **T-04** Escrituras con confirmación: emitir documento, registrar compra.
- **T-05** Bitácora inmutable de confirmaciones ligada al CUFE emitido (R7); la confirmación es el identificador de autorización que exige `SigningService`.
- **T-06** Alta por RUT: extraer NIT, régimen y responsabilidades del PDF y proponer el perfil para confirmar.

## 4. Aceptación
- Ninguna escritura ocurre sin una confirmación registrada (prueba).
- Un emisor no obtiene datos de otro a través del agente.

## 5. Fuera de alcance
Posición de IVA y retenciones (dependen de SPEC-FISC-007), ajuste de precios por margen.

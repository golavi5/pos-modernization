# M5 — Emisión por Plemsi con outbox y libro de ventas

**Status**: APPROVED — 2026-11-19 (PR #108, apilado sobre #107, no fusionado). T-01..T-03 construidos con pruebas de contrato (sin ninguna llamada a Plemsi); abiertos: T-04..T-09, corrida en sandbox de Plemsi, y todos los códigos DIAN/Plemsi portados quedan VERIFY. Desglosado de SPEC-FISC-001 (Fase 1, segunda mitad). Depende de SPEC-FISC-002.

Origen: [diseño](../superpowers/specs/2026-06-10-fiscal-platform-design.md) §4.1, §4.3, OQ-8 (asíncrono por outbox transaccional, aceptado 2026-11-10).

## 1. Objetivo
Emitir factura, nota crédito y documento equivalente POS a través de Plemsi, detrás de `EmissionPort`, sin bloquear la caja. Es lo que ya pagan 3 clientes (88 COP por documento).

## 2. Corrección al diseño
El diseño decía "extraer `PlemsiAdapter` de radian". **No existe:** `radian/lib/dian-api.ts` solo envía eventos RADIAN. El cliente de emisión está en `ApiFacturame` en C# (`PlemsiApi.cs`, `DianPayloadBuilder.cs`, con pruebas de rechazo). Aquí es **trabajo nuevo en TypeScript** usando ese código como especificación.

## 2.1 Hallazgos del código C# (2026-11-19)
- El cliente vivo es `FactApi.cs`; `PlemsiApi.cs` solo tiene duplicados heredados.
- **No hay** endpoint de nota débito, ni descarga de XML, ni tiempo de espera o reintento. Nota débito queda fuera de v1 (decisión del propietario, 2026-11-19); el PDF sí existe.
- El POST devuelve `success:true` antes del veredicto de la DIAN: se lee después con `GET .../one`. Estados: `Emitted` aceptado, `Error`/`Deleted` rechazado, otro = pendiente (no reenviar: gasta consecutivo).
- Rechazo de carga útil (`errCode` o `data.errors`) es permanente y no dispara contingencia; fallos de pasarela, transporte y 401 sí son reintentables.
- La fecha y hora del documento deben ser el momento de transmisión (reglas FAD09b/FAD09e, observado por ApiFacturame): el adaptador las fija en cada envío.

## 3. Tareas
- **T-01** `EmissionPort`: emitir, consultar estado, obtener PDF/XML. Tipos de documento v1: factura de venta, nota crédito, nota débito, documento equivalente POS.
- **T-02** `PlemsiAdapter` en TypeScript (factura, nota crédito, POS, consulta, numeración restante), con tiempos de espera y sin registrar cargas ni tokens. El token de Plemsi por emisor se guarda cifrado (en radian está en texto plano).
- **T-03** Pruebas de contrato del adaptador portando los casos de `PlemsiPayloadRejectionTests`.
- **T-04** Tabla `fiscal_emission_outbox` (`order_id` único, estado, intentos, próximo intento) y su inserción **dentro** de la transacción de `PaymentsService.recordPayment`, por interfaz pública del módulo fiscal.
- **T-05** Trabajador que reclama filas con `FOR UPDATE SKIP LOCKED`, reintenta con espera creciente y guarda CUFE/CUDE. Requiere añadir un planificador.
- **T-06** Endpoints `/fiscal/v1/documents`: emitir (idempotente), estado, descarga. Para apps externas el resultado asíncrono se consulta por estado; el webhook queda como idea diferida.
- **T-07** Vista de conciliación: filas fallidas o atascadas, con notificación.
- **T-08** Estado fiscal en el recibo del POS (pendiente / validado + CUFE y QR).
- **T-09** Libro de ventas derivado de los documentos emitidos, con el desglose de IVA que ya trae el documento. **Sin** agrupación por periodo tributario (eso es SPEC-FISC-007).

## 4. Aceptación
- Una venta cerrada produce exactamente un documento aunque el pago se registre dos veces a la vez (prueba contra MySQL real).
- Con Plemsi caído la venta se cierra y la fila queda pendiente y visible.
- Un documento emitido en el entorno de pruebas de Plemsi, con registro en `docs/verification/`.

## 5. VERIFY (no se inventa)
Si un documento puede entregarse al comprador antes de la validación, por tipo. Hasta citar la norma, el recibo indica "pendiente de validación".

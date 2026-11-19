# M5 — Recepción de documentos y registro de compras

**Status**: DRAFT — 2026-11-18. Desglosado de SPEC-FISC-001 (Fase 2). Nada construido. Depende de SPEC-FISC-002. Va **después** de SPEC-FISC-004 por decisión del propietario (2026-11-18): primero la emisión directa.

Origen: [diseño](../superpowers/specs/2026-06-10-fiscal-platform-design.md) §4.2, §4.4, R5.

## 1. Objetivo
Recibir facturas de proveedores, enviar los eventos RADIAN y registrar la compra con entrada de inventario.

## 2. Qué hay para portar (revisado en radian)
- Eventos RADIAN por Plemsi (`lib/dian-api.ts`, 030–033): portable con cambios menores. Conservar tal cual la tabla de códigos de evento.
- Analizador XML (`lib/xml-parser.ts`): **solo referencia.** No maneja ZIP, ni notas, ni protege contra entidades externas; hay que reescribirlo.
- El validador de CUFE de radian solo revisa el formato; no recalcula el hash.

## 3. Tareas
- **T-01** `ReceptionPort` y modelo de documento recibido (CUFE único **por emisor**; en radian es único global).
- **T-02** Analizador endurecido de Invoice, CreditNote, DebitNote y AttachedDocument: sin entidades externas, con límites de tamaño y profundidad; ZIP con límite de expansión.
- **T-03** Carga manual, individual y por lote.
- **T-04** Verificación de autenticidad: recalcular CUFE y deduplicar. **VERIFY** si la consulta del CUFE ante la DIAN es utilizable por el receptor.
- **T-05** Ingesta por correo: buzón o dirección de reenvío por emisor, lista de remitentes permitidos (R5).
- **T-06** Eventos RADIAN (acuse, recibo del bien, aceptación, rechazo) detrás de un puerto, adaptador Plemsi.
- **T-07** Registro de compra confirmada y libro de compras.
- **T-08** Mapa artículo del proveedor → SKU, propiedad del emisor; primera vez confirmada por una persona.
- **T-09** Entrada de inventario por interfaz pública de `inventory` (movimiento `IN`), nunca por llamada directa a sus servicios.

## 4. Aceptación
- Un ZIP malicioso (entidad externa, bomba de compresión) se rechaza sin consumir memoria (prueba).
- Una factura recibida dos veces se registra una sola.
- Una compra confirmada deja un movimiento `IN` y el stock coincide con el diario.

## 5. Fuera de alcance
Retención en la fuente sobre compras (SPEC-FISC-007), API de recepción del proveedor, raspado del portal DIAN, propuesta de precios por el agente.

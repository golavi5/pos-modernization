# M5 — Catálogo de reglas fiscales (IVA por periodo, retención en la fuente, Régimen Simple)

**Status**: DRAFT — 2026-11-18. **Bloqueado:** OQ-1/1a fue dispensado por el propietario sin respuestas; ninguna regla tiene fuente validada. Desglosado de SPEC-FISC-001. Nada construido.

Origen: [diseño](../superpowers/specs/2026-06-10-fiscal-platform-design.md) §4.3, §4.3.1, R4, [agenda del contador](../superpowers/specs/2026-11-09-fisc-001-accountant-session-agenda.md) (sin celebrar).

## 1. Por qué está aparte
Todo lo que codifica una regla tributaria vive aquí para que no entre por la ruta de emisión. La emisión (SPEC-FISC-003/004) no depende de este spec.

## 2. Condición de desbloqueo
Cada regla que se cargue cita su norma (artículo del Estatuto Tributario, decreto o resolución, con fecha). Sin fuente, la regla no se carga. La vía es la sesión con contador o una revisión normativa equivalente.

## 3. Tareas (todas bloqueadas salvo T-01)
- **T-01** Estructura del catálogo, versionado por año fiscal, **vacío**: tablas y contrato, sin valores. No está bloqueada.
- **T-02** Periodicidad del IVA (umbrales en UVT) y vista de IVA por periodo.
- **T-03** Conceptos, bases mínimas y tarifas de retención en la fuente; motor de cálculo en el registro de compras.
- **T-04** Exclusiones del Régimen Simple (R4).
- **T-05** Impuesto al consumo, ReteIVA y ReteICA: decidir si entran en v1.
- **T-06** Informes de soporte para los formularios 300 y 350, rotulados "soporte para revisión del contador". El producto no presenta declaraciones (D10).

## 4. Aceptación
- Ningún valor tributario en el código o en datos semilla sin su cita.
- Comportamiento = catálogo(año) × perfil(emisor); nada de lógica tributaria en la configuración del emisor.

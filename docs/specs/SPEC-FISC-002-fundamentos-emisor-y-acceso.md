# M5 — Fundamentos fiscales: módulo, emisor, terceros y acceso por API

**Status**: APPROVED — 2026-11-19 (PR #107, no fusionado). T-01..T-07 construidos y probados contra MySQL real (e2e + migración arriba/abajo/arriba); sin verificar en staging. Abiertos: tablas del anexo para régimen/responsabilidades (campos libres hasta entonces). Desglosado de SPEC-FISC-001 (Fase 1, primera mitad).

Origen: [diseño](../superpowers/specs/2026-06-10-fiscal-platform-design.md) §3, §4.1, §6 y "Owner inputs" (el motor se expone como API pública versionada dentro del monolito, ADR-001).

## 1. Objetivo
Dejar el contexto `fiscal/` con su modelo base y una puerta de entrada que sirva tanto al POS como a otras apps del propietario. No emite documentos todavía.

## 2. Hechos del código hoy
- El backend no tiene claves de API, ni planificador, ni bus de eventos (`@nestjs/schedule` y `@nestjs/event-emitter` no están instalados).
- `companies.tax_id` y `settings.nit` guardan el NIT en dos sitios, sin dígito de verificación.

## 3. Decisión tomada
**El emisor fiscal es siempre una `company`** (Gandhi Olavi, 2026-11-18). Una app externa que facture para otro NIT necesita que ese NIT exista como `company`; la tenencia y el alcance de las claves de API se apoyan en `company_id`. No se crea una entidad de emisor aparte.

## 4. Tareas
- **T-01** Esqueleto `modules/fiscal/` con subcarpetas `emission`, `reception`, `ledger`, `third-parties`, `fiscal-profile`; regla de frontera: no importa internos de `sales`, `inventory` ni `customers`.
- **T-02** Perfil fiscal ligado a `company_id` (el emisor es la `company`): NIT + DV, razón social, régimen, códigos de responsabilidad del RUT, estado de habilitación. Migración TypeORM. Los valores de régimen y responsabilidades salen de las tablas del anexo, no se inventan.
- **T-03** Utilidad NIT/DV (portar `radian/lib/utils/nit-helper.ts`, que tiene pruebas; hay dos implementaciones en radian, se conserva una).
- **T-04** `ThirdParty` como agregado fiscal distinto de `Customer` (ADR-006): NIT, DV, responsabilidades, correo de notificación; referencia opcional a `customer_id`.
- **T-05** Credenciales por aplicación: clave de API con hash en base de datos, ligada a un emisor, con alcances; guard propio, separado del JWT de usuarios del POS.
- **T-06** Contrato público `/fiscal/v1` descrito en OpenAPI: convenciones de error, paginación, cabecera `Idempotency-Key` y su tabla de deduplicación.
- **T-07** Observabilidad mínima: identificador de emisor en cada log del módulo. OTel completo (§4.6) queda fuera.

## 5. Aceptación
- Una app con clave de API crea y consulta un tercero de su emisor y no ve los de otro emisor (prueba e2e).
- La misma petición repetida con igual `Idempotency-Key` no duplica.
- `npm run lint:ci`, pruebas y `migration:run:prod` en verde; sin deriva de esquema.

## 6. Fuera de alcance
Emisión, certificados, reglas tributarias (SPEC-FISC-007), extracción a servicio aparte.

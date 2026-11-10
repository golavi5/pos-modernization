# M2 — Zona horaria por empresa (los días de los reportes siguen la hora de la empresa)

**Status**: APPROVED — 2026-11-09 (PR #89). Decidido por Gandhi Olavi («add a per-company timezone»). Implementado y verificado: MySQL 8 real (barras y endpoint diario, zona UTC− y UTC+, con mutación) y Playwright 63/63 contra una pila viva. **Ensayo de actualización local hecho** ([registro](../verification/2026-11-09-migrations-upgrade-rehearsal.md): las filas de `settings` existentes reciben `America/Bogota`). **Abierto:** aplicar la migración `AddCompanyTimezone` en staging (las empresas existentes pasan a `America/Bogota`, lo que mueve sus fronteras de día) y los límites declarados en §3. Por eso sigue `APPROVED`.

## 1. Problema

Los reportes agrupan por día con `DATE(created_at)` en la zona de MySQL (UTC) y el dashboard calcula «hoy» en UTC. Una venta de las 20:00 en Bogotá (UTC−5) cae en la barra del día siguiente, y «Ventas hoy» se reinicia a las 19:00 locales. Hoy no existe forma de decir en qué zona opera una empresa.

## 2. Decisión

- Un ajuste por empresa, `settings.timezone`: nombre IANA, `varchar(64) NOT NULL`, **por defecto `America/Bogota`** (mercado del producto; el cambio de comportamiento para empresas existentes es justo el objetivo). Editable en Ajustes → Empresa con una lista corta de zonas; el backend acepta cualquier zona IANA válida.
- Un solo helper (`common/timezone.ts`): offset de una zona en un instante, y «inicio del día local» → instante UTC. Sin dependencias nuevas (`Intl`).
- Se aplica donde el «día» se ve:
  1. agrupación por día/semana/mes de `sales/by-period` (el offset se aplica con `CONVERT_TZ(created_at, '+00:00', offset)`);
  2. `GET /sales/reports/daily` (las tarjetas «hoy» del dashboard): límites del día en la zona de la empresa, y `?date=YYYY-MM-DD` se interpreta como fecha local;
  3. la ventana de 7 días y las claves de día del gráfico del dashboard.

## 3. Límites conocidos (declarados, no ocultos)

- El offset es **fijo por consulta** (el del final del rango): exacto en zonas sin horario de verano (Colombia, Perú, Ecuador…), con error de ≤1 h en los límites de día de un rango que cruce un cambio de horario. Usar zonas con nombre dentro de MySQL exigiría las tablas de zonas horarias cargadas; se descartó por frágil.
- El preajuste `daily` del reporte de **ventas** empieza a la medianoche **local** de la empresa (antes, la del servidor). *Corrección:* este spec decía que los reportes de productos y clientes también usaban la medianoche del servidor; no es así: esos dos reportes **ignoraban `period`** y, sin fechas explícitas, siempre cubrían el último mes, aunque la página de Reportes ofrece el selector en esas pestañas. **Corregido** (PR #95): ahora usan el mismo `reportDateRange` que ventas, también con la zona de la empresa.
- No hay «cierre de caja por turno»: el día es el día calendario local.

## 4. Aceptación

- [x] Una venta a las 20:00 de Bogotá aparece en la barra del día local, no en la del siguiente.
- [x] Cambiar la zona de la empresa mueve la venta de barra.
- [x] `PATCH /settings/company` rechaza una zona que no existe.
- [x] Probado contra MySQL 8 real, incluida una zona UTC+ para el signo del offset.

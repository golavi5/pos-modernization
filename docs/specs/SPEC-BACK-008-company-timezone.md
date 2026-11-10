# M2 — Zona horaria por empresa (los días de los reportes siguen la hora de la empresa)

**Status**: DONE — 2026-11-10 (PR #100). **Aplicado y verificado en staging** ([registro de staging](../verification/2026-11-10-staging-migrations.md)): `AddCompanyTimezone` corrió una sola vez (ledger 6/6, despliegue `bc901345`); `settings.timezone` es `varchar(64) NOT NULL DEFAULT 'America/Bogota'`; la empresa tiene `America/Bogota`; Ajustes → Empresa guarda un cambio de zona y sobrevive a la recarga; el panel muestra cifras reales. **Salvedad:** staging no tenía filas de `settings`, así que la fila se creó tras la migración y prueba el valor por defecto, no el relleno de filas existentes (eso lo cubre el ensayo local). Historial: PR #89, decidido por Gandhi Olavi («add a per-company timezone»). Implementado y verificado: MySQL 8 real (barras y endpoint diario, zona UTC− y UTC+, con mutación) y Playwright 63/63 contra una pila viva. **Ensayo de actualización local hecho** ([registro](../verification/2026-11-09-migrations-upgrade-rehearsal.md): las filas de `settings` existentes reciben `America/Bogota`). Siguen vigentes los límites declarados en §3 y el efecto conocido: las empresas existentes pasan a `America/Bogota`, lo que mueve sus fronteras de día en datos históricos.

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

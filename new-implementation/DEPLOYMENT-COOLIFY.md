# Despliegue en VPS con Coolify

Se despliega **el stack completo como un solo recurso** de Coolify, a partir de
[`docker-compose.coolify.yml`](./docker-compose.coolify.yml). Coolify crea una
red privada para los tres servicios e inyecta su proxy para el acceso externo.

## Arquitectura

```
Internet → Coolify (reverse proxy + SSL)
              ├── frontend  → Next.js  :3000  (app.tu-dominio.com)
              └── backend   → NestJS   :3000  (api.tu-dominio.com)

     red interna del stack (sin salida a Internet)
              └── mysql     → MySQL    :3306  (sin publicar)
```

Los puertos son **los del contenedor** — es a donde enruta el proxy. Nadie
publica puertos al host: el proxy llega por la red interna del stack.

> **Que el VPS tenga el 3000 ocupado no importa.** Este compose no hace ningún
> `ports:`, así que nada se enlaza a un puerto del host: cada contenedor tiene su
> propia pila de red y el proxy de Coolify los alcanza por la red privada del
> stack. Por eso `backend` y `frontend` pueden escuchar **los dos** en 3000 sin
> chocar entre sí ni con lo que ya corra en el VPS.
>
> Si aun así querés mover el backend a otro puerto interno, son tres cambios
> coordinados: `PORT` en el `environment`, el `healthcheck` de ese servicio, y el
> nombre de la variable mágica (`SERVICE_FQDN_BACKEND_3001`, que lleva el puerto
> en el nombre). No hace falta tocar el `Dockerfile`: `EXPOSE` es documentación y
> el `healthcheck` del compose pisa al de la imagen.

---

## ⚠️ Hay dos archivos compose. No confundirlos

| Archivo | Para qué | Qué hace distinto |
|---------|----------|-------------------|
| `docker-compose.yml` | **Desarrollo local** | Publica puertos en el host (MySQL `3308`, backend `3000`, frontend `3001` — configurables con `MYSQL_HOST_PORT` / `BACKEND_HOST_PORT` / `FRONTEND_HOST_PORT`), lee `backend/.env`, hornea `NEXT_PUBLIC_API_URL=http://127.0.0.1:3000` |
| `docker-compose.coolify.yml` | **Producción / Coolify** | No publica ningún puerto, variables inyectadas por Coolify, `NEXT_PUBLIC_API_URL` real |

> 🚨 **No despliegues `docker-compose.yml` en Coolify.** Dos cosas se romperían:
> el frontend quedaría compilado apuntando a `http://127.0.0.1:3000` — el
> navegador del usuario llamaría a *su propia* máquina y nada cargaría — y MySQL
> quedaría publicado en el host, que es exactamente el gate que
> `SPEC-CUT-002` §2 exige cerrar.

El compose de producción usa `${VARIABLE:?}` en cada secreto: si falta, **el
deploy falla al interpolar**, con el nombre de la variable en el error, en vez
de arrancar a medias. Verificado:

```
error while interpolating services.frontend.build.args.NEXT_PUBLIC_API_URL:
required variable NEXT_PUBLIC_API_URL is missing a value: falta NEXT_PUBLIC_API_URL
```

---

## Requisitos previos

- VPS con Ubuntu 22.04+ (mínimo 2 vCPU, 2 GB RAM)
- Coolify instalado (`curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`)
- Dominio apuntando a la IP del VPS (idealmente un wildcard `*.tu-dominio.com`)
- Repositorio en GitHub: `golavi5/pos-modernization`

---

## Paso 1 — Crear el recurso

En Coolify: **New Resource → Public Repository** (o Private, si aplica)

| Campo | Valor |
|-------|-------|
| Repository | `https://github.com/golavi5/pos-modernization` |
| Branch | `main` |
| Build Pack | **Docker Compose** |
| Base directory | `/new-implementation` |
| Docker Compose location | `/new-implementation/docker-compose.coolify.yml` |

Coolify parsea el archivo y detecta los tres servicios (`mysql`, `backend`,
`frontend`) y **todas** las variables `${...}` que aparecen en él, que quedan
disponibles en la pestaña *Environment Variables*.

> El compose construye backend y frontend desde sus `Dockerfile` (`target:
> production`). No hay que configurar Dockerfile paths por separado: el compose
> ya los declara.

---

## Paso 2 — Variables de entorno

En **Environment Variables** del recurso. Las que no tienen valor por defecto
son obligatorias — sin ellas el deploy falla al interpolar.

```env
# ── Base de datos ────────────────────────────────────────────────
MYSQL_ROOT_PASSWORD=<generar>
DB_PASSWORD=<generar>
DB_USERNAME=pos_user          # opcional (def. pos_user)
DB_NAME=pos_db                # opcional (def. pos_db)

# ── JWT ──────────────────────────────────────────────────────────
JWT_SECRET=<openssl rand -base64 48>
JWT_REFRESH_SECRET=<openssl rand -base64 48>
JWT_EXPIRES_IN=1h             # opcional
JWT_REFRESH_EXPIRES_IN=7d     # opcional

# ── CORS y URL pública del API ───────────────────────────────────
CORS_ORIGINS=https://app.tu-dominio.com
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com

# ── Primer admin — SIN ESTO NADIE PUEDE INICIAR SESIÓN ────────────
BOOTSTRAP_ADMIN_EMAIL=admin@tu-dominio.com
BOOTSTRAP_ADMIN_PASSWORD=<mínimo 12 caracteres>
BOOTSTRAP_ADMIN_NAME=Administrator    # opcional
BOOTSTRAP_COMPANY_NAME=Mi Empresa     # opcional

# ── Otros (opcionales) ───────────────────────────────────────────
LOG_LEVEL=info                # trace|debug|info|warn|error|fatal
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

> 💡 Generar secretos: `openssl rand -base64 48`
>
> ⚠️ **No reutilices valores del historial del repo.** Dos `.env` con secretos
> reales estuvieron commiteados y siguen alcanzables por SHA en GitHub (ver
> `SPEC-CUT-001` S-05). La validación del backend rechaza los placeholders
> `CHANGE_ME...` y los fallbacks de desarrollo, pero **no** puede distinguir un
> secreto filtrado de uno nuevo: generarlos frescos es una regla de
> procedimiento, no algo que el código pueda imponer.

> ⚠️ `NEXT_PUBLIC_API_URL` se hornea **en el build** del frontend (Next.js
> embebe los `NEXT_PUBLIC_*` en el bundle). Si la cambiás, hay que
> **reconstruir**, no sólo reiniciar. Y tiene que ser la URL pública — quien
> llama es el navegador, no el contenedor: `http://backend:3000` no sirve.

### Validación al arrancar

En `NODE_ENV=production` el backend falla de inmediato si `JWT_SECRET`,
`JWT_REFRESH_SECRET`, `DB_PASSWORD` o `CORS_ORIGINS` faltan o siguen con el
placeholder `CHANGE_ME...`. También rechaza los fallbacks de desarrollo que
viven en `auth.constants.ts`.

---

## Paso 3 — Dominios por servicio

En Coolify, dentro del recurso, cada servicio con dominio se configura por
separado:

| Servicio | Dominio | Puerto del contenedor |
|----------|---------|----------------------|
| `frontend` | `https://app.tu-dominio.com` | 3000 |
| `backend` | `https://api.tu-dominio.com` | 3000 |
| `mysql` | *(ninguno)* | — |

El compose declara `SERVICE_FQDN_FRONTEND_3000` y `SERVICE_FQDN_BACKEND_3000`,
las variables mágicas con las que Coolify asocia dominio ↔ servicio ↔ puerto. Si
tenés un wildcard configurado, Coolify genera los dominios solo; si querés los
tuyos, ponelos en el campo *Domains* del servicio correspondiente.

> **`mysql` no lleva dominio y no debe publicar puertos.** Si en algún momento le
> agregás un `ports:`, quedaría accesible desde fuera del VPS, saltándose el
> proxy.

---

## Paso 4 — SSL

Coolify gestiona SSL con Let's Encrypt. En cada servicio con dominio:

- ✅ **Force HTTPS** activado
- ✅ **Generate SSL Certificate** activado

---

## Paso 5 — Deploy

✅ Click **Deploy**. El orden lo resuelve el compose: `mysql` arranca primero,
`backend` espera a que esté *healthy* (`depends_on: condition: service_healthy`)
y `frontend` arranca después del backend.

En el primer arranque el backend corre las migraciones y crea el primer admin.

---

## 🚨 El primer admin — el único fallo que se ve verde

La base de producción arranca **vacía**: el esquema lo crean las migraciones y
**no se carga ningún seed**. Si `BOOTSTRAP_ADMIN_EMAIL` y
`BOOTSTRAP_ADMIN_PASSWORD` no están puestas, el despliegue queda así:

- ✅ los contenedores arrancan y quedan *healthy*
- ✅ `/health` y `/health/ready` responden 200
- ✅ las tablas se crean
- ❌ **la tabla de usuarios queda vacía y nadie puede entrar**

No hay error ni crash: sólo un `logger.warn` en el log de arranque —
`bootstrap.service.ts` nunca tumba el boot, por diseño. **Una contraseña de menos
de 12 caracteres falla exactamente igual de silenciosa** (`logger.error` y sigue
de largo).

En el compose de producción estas dos variables llevan `:?`, así que el deploy
falla antes de llegar a ese estado. La advertencia sigue valiendo si alguien las
quita, o si despliega de otra forma.

Confirmá que funcionó buscando esta línea en los logs del backend:

```
Bootstrapped admin user "admin@tu-dominio.com" (company "Mi Empresa") with roles admin, superadmin.
```

**Es recuperable sin reinstalar nada:** la guarda es `userCount > 0`, o sea que
mientras no exista ningún usuario podés corregir las variables y **reiniciar** —
el bootstrap corre otra vez. Lo que no hace nunca es re-sembrar una base que ya
tiene usuarios.

> ⚠️ El usuario creado recibe **`admin` + `superadmin`**, a propósito (operador
> de plataforma en el primer despliegue). Tenelo presente si vas a correr el
> chequeo RBAC de `SPEC-CUT-002` §5, que espera que un `admin` reciba `403` en
> `POST /companies`: **este usuario no**, porque además es superadmin. Para esa
> prueba creá un usuario `admin` puro.

### Roles del sistema

En **cada** arranque el backend ejecuta `ensureSystemRoles()`, que garantiza que
existan `admin`, `superadmin`, `manager`, `cashier`, `inventory_manager` y
`accountant` (ver `SPEC-BACK-001`). No hay que provisionarlos a mano.

### Migraciones (esquema)

El esquema lo gestionan **migraciones TypeORM**
(`backend/src/database/migrations/`) — `synchronize` está desactivado en
producción. `database/schema.sql` quedó **obsoleto** y no debe cargarse (ver
`SPEC-CUT-001` B-05).

El compose fija `DB_RUN_MIGRATIONS=true`, así que el backend aplica las
pendientes **al arrancar**. En el primer deploy deben ejecutarse **las dos**
migraciones del repo: `InitialSchema…` y `AddLegacyIdColumns…`.

---

## Paso 6 — Verificación

### Backend — liveness y readiness

Son **dos** endpoints distintos y sirven para cosas distintas:

```bash
# Liveness: el proceso está vivo. NO toca la base — es el que va en el
# healthcheck de reinicio (un parpadeo de la BD no debe reiniciar el backend).
curl https://api.tu-dominio.com/health
# Esperado: {"status":"ok","timestamp":"..."}

# Readiness: el proceso Y la base responden. Es el que revela una BD caída.
curl -i https://api.tu-dominio.com/health/ready
# Esperado: 200 {"status":"ready","db":"up","timestamp":"..."}
# Si la BD no responde: 503 {"status":"unavailable","db":"down",...}
```

Un `/health` verde **no** dice nada sobre la base: usá `/health/ready`.

### Frontend

```bash
curl https://app.tu-dominio.com/api/health
# Esperado: {"status":"ok","timestamp":"..."}  (no llama al backend, a propósito)
```
```
https://app.tu-dominio.com
# Debe mostrar la pantalla de login, sin errores CORS en la consola del navegador
```

### MySQL no alcanzable desde fuera

```bash
# Desde tu máquina, NO desde el VPS:
nc -zv <IP-del-VPS> 3306   # debe fallar (connection refused / timeout)
```

### El primer login (el chequeo que de verdad importa)

```bash
curl -i -X POST https://api.tu-dominio.com/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@tu-dominio.com","password":"<tu BOOTSTRAP_ADMIN_PASSWORD>"}'
# Esperado: 200 + accessToken
# 401 → el admin no se creó: revisá el log de arranque (§ "El primer admin")
```

### Base de datos

En Coolify → recurso → servicio `mysql` → **Terminal**:
```sql
SHOW DATABASES;
USE pos_db;
SHOW TABLES;
SELECT COUNT(*) FROM users;   -- debe ser >= 1; si es 0, el bootstrap no corrió
```

---

## Backups, restauración y rollback

> El servicio de base se llama **`mysql`** dentro del stack (así lo declara el
> compose). Ése es el hostname que resuelve desde el backend y el nombre que
> verás en Coolify — no `pos-mysql`.

### Backups (primario: Coolify nativo)

En Coolify → servicio `mysql` → **Backups**: programa backups automáticos (cron)
y, de preferencia, destino **S3** off-host. Recomendado: diario + retención ≥ 7
días. Verifica periódicamente que un backup **restaura** (un backup sin restore
probado no es un backup).

### Backups (fallback portable / hosts sin Coolify)

Scripts en [`scripts/`](./scripts) — conexión por las mismas env vars del backend
(`DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME`).

> ⚠️ **Contexto de ejecución.** El host del VPS **no** tiene cliente
> `mysql`/`mysqldump`, y el servicio `mysql` sólo resuelve dentro de la red del
> stack: estos comandos no corren tal cual desde una shell del host. Envolvelos
> en un contenedor cliente `mysql:8.0` unido a esa red — receta completa en
> [`STAGING-ROLLBACK-RUNBOOK.md`](./STAGING-ROLLBACK-RUNBOOK.md) §1 (aplica
> también a la línea de cron de abajo).

```bash
# Backup → gzip con timestamp + poda por retención (RETENTION_DAYS, def. 7)
DB_PASSWORD=*** BACKUP_DIR=/backups ./scripts/db-backup.sh

# Cron diario 02:17 (evita el minuto :00)
17 2 * * *  cd /opt/pos && DB_HOST=mysql DB_USERNAME=pos_user \
  DB_PASSWORD=*** DB_NAME=pos_db BACKUP_DIR=/backups ./scripts/db-backup.sh >> /var/log/pos-backup.log 2>&1
```

### Restauración (⚠️ destructiva)

Restaura **primero en una base scratch** para validar el backup antes de tocar prod:
```bash
# la base scratch debe existir Y estar concedida a pos_user (el script no la crea):
#   mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS pos_scratch CHARACTER SET <charset> \
#     COLLATE <collation>; GRANT ALL ON pos_scratch.* TO 'pos_user'@'%'; FLUSH PRIVILEGES;"
# <charset>/<collation>: copiá los de la base origen — ver STAGING-ROLLBACK-RUNBOOK.md §1.
DB_PASSWORD=*** DB_NAME=pos_scratch ./scripts/db-restore.sh /backups/pos_db_YYYYMMDD-HHMMSS.sql.gz
# tras validar, repetir con DB_NAME=pos_db — respondé el prompt a mano.
# CONFIRM=yes es sólo para cron/automatización: en un restore manual el prompt
# es la única protección contra un DB_NAME o un archivo equivocado.
```

### Rollback de un deploy

> 📖 **Procedimiento completo:
> [`STAGING-ROLLBACK-RUNBOOK.md`](./STAGING-ROLLBACK-RUNBOOK.md)** — árbol de
> decisión Caso A / Caso B, orden exacto de los pasos y verificación de salida.
> Esta sección es sólo el resumen; ante un incidente, seguí el runbook.

Sin cambio de esquema entre el commit desplegado y el anterior (**Caso A**):
Coolify → recurso → **Deployments** → **Redeploy** del commit anterior.

> ⚠️ **Con un stack compose, el Redeploy reconstruye los tres servicios juntos**
> — no hay rollback por servicio. Si sólo cambió el frontend, igual se rehace el
> backend. Tenelo en cuenta al estimar la ventana.

> ⚠️ **Las migraciones son forward-only.** Hacer rollback del *código* no revierte
> el *esquema*. Clasificá **con la base de datos**, no con el repo — el ledger
> manda (Coolify → servicio `mysql` → Terminal):
> ```bash
> mysql -uroot -p -D pos_db -e "SELECT name FROM typeorm_migrations ORDER BY timestamp;"
> ```
> Si aparece alguna migración que el commit destino **no** tiene (**Caso B**), el
> Redeploy solo **no** alcanza: hay que restaurar el backup previo a esa migración
> (recreando `pos_db` primero — el dump no borra las tablas que la migración creó),
> deteniendo el backend antes de tocar el esquema. Ver **§3 B1** del runbook.
>
> ⚠️ **`npm run migration:revert` no existe en la imagen de producción** (usa
> ts-node contra `src/`, y la imagen sólo trae `dist` con `--omit=dev`). Para
> producción hay un script **con guardas**, y revierte **una sola** migración por
> ejecución — no es el inverso de `migration:run:prod`, que aplica *todas* las
> pendientes:
> ```bash
> # dentro del contenedor backend (Coolify → servicio backend → Terminal)
> cd /app && npm run migration:revert-one:prod
> ```
> Imprime el ledger, exige tipear el **nombre exacto** de la migración a
> revertir, y se niega a correr sin terminal o con `DB_RUN_MIGRATIONS=true`
> (si no, el próximo reinicio del contenedor vuelve a aplicar lo que acabás de
> revertir). **El compose de producción fija `DB_RUN_MIGRATIONS=true`**, así que
> para usar este script hay que ponerla en `false` y reiniciar primero.
> Salidas: `0` revertida · `1` rechazada/abortada, esquema intacto ·
> `2` falló a mitad → restaurar backup (**§3 B1** del runbook).
>
> Sólo tras el preflight de **§3 B2**, y **antes** de redesplegar el commit
> destino: el `down()` de la migración vive en la imagen del commit *malo*; una
> vez desplegado el commit viejo ya no se puede revertir, sólo restaurar.
> Para cambios de esquema riesgosos: backup **inmediatamente antes** del deploy.

---

## Auto-deploy en cada push (GitHub Webhook)

En Coolify → tu recurso → **Webhooks**:

1. Copia la URL del webhook de Coolify
2. Ve a GitHub → tu repo → **Settings → Webhooks → Add webhook**
3. Payload URL: `<URL copiada de Coolify>`
4. Content type: `application/json`
5. Events: **Just the push event**
6. ✅ Active

Ahora cada `git push origin main` desplegará automáticamente.

> Con un stack compose, cada push reconstruye **los tres servicios**. Si eso es
> demasiado ruido, dejá el auto-deploy apagado y desplegá a mano.

---

## Comandos útiles en el VPS

> ⚠️ Coolify nombra los contenedores solo (identificador del recurso + nombre del
> servicio + sufijo). Los nombres `pos_backend` / `pos_frontend` / `pos_mysql`
> son los que fija `docker-compose.yml` para **desarrollo local** y no existen en
> el VPS. Sacá el nombre real con `docker ps`, o usá la **Terminal** que Coolify
> expone en cada servicio, que ya entra al contenedor correcto.

```bash
# Listar contenedores del stack
docker ps --format '{{.Names}}\t{{.Status}}'

# Logs (sustituí <nombre> por el real)
docker logs <nombre> -f

# Reiniciar un servicio
docker restart <nombre>
```

---

## Estructura de subdominios recomendada

| Subdominio | Servicio |
|------------|---------|
| `app.tu-dominio.com` | Frontend Next.js |
| `api.tu-dominio.com` | Backend NestJS |
| `coolify.tu-dominio.com` | Panel de Coolify |

---

## Troubleshooting

### El deploy falla al interpolar variables
- Es el comportamiento buscado: falta una variable obligatoria. El error nombra
  cuál (`required variable X is missing a value`). Ponela en *Environment
  Variables* y volvé a desplegar.

### El backend no conecta a MySQL
- `DB_HOST` debe ser `mysql` — el nombre del **servicio** en el compose, no
  `localhost` ni `pos-mysql`.
- Los servicios del stack se resuelven por nombre dentro de la red privada.

### Error CORS en el frontend
- `CORS_ORIGINS` debe incluir el dominio del frontend con `https://`.
- `NEXT_PUBLIC_API_URL` sin `/` final.
- Recordá que `NEXT_PUBLIC_API_URL` se hornea en el build: si la corregís, hay
  que **reconstruir**, no sólo reiniciar.

### El frontend carga pero no habla con el API
- Mirá en el navegador a qué URL llama. Si es `127.0.0.1:3000` o `backend:3000`,
  se construyó con el `NEXT_PUBLIC_API_URL` equivocado — casi siempre por haber
  desplegado `docker-compose.yml` en vez de `docker-compose.coolify.yml`.

### Build falla en el frontend
- `output: 'standalone'` debe estar en `next.config.js`.
- El compose ya pasa `NEXT_PUBLIC_API_URL` como build arg; no hace falta
  configurarlo aparte en la UI.

### No se crean las tablas en producción
- En producción `synchronize` está **desactivado** a propósito; el esquema lo
  crean las migraciones. El compose ya fija `DB_RUN_MIGRATIONS=true`.
- Revisá los logs de arranque: deben ejecutarse `InitialSchema…` y
  `AddLegacyIdColumns…`.
- No cargues `database/schema.sql` (obsoleto/divergente).

### El deploy está verde pero no puedo iniciar sesión
- Faltan `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`, o la contraseña
  tiene menos de 12 caracteres. Ver **El primer admin**.
- Comprobación directa: `SELECT COUNT(*) FROM users;`. Si da 0, corregí las
  variables y **reiniciá** el backend — el bootstrap corre de nuevo mientras no
  exista ningún usuario.

---

## Recursos

- [Coolify Docs](https://coolify.io/docs)
- [Coolify Discord](https://discord.gg/coolify)
- GitHub: `https://github.com/golavi5/pos-modernization`

---

**Fecha:** Agosto 2026 (revisado contra el código el 2026-08-10)  
**Stack:** NestJS + Next.js + MySQL 8.0 + Coolify

> Verificado en esta revisión contra `backend/.env.example`,
> `backend/src/main.ts` (`validateProductionEnv`),
> `backend/src/modules/bootstrap/bootstrap.service.ts`,
> `backend/src/app.controller.ts`, ambos `Dockerfile`, `docker-compose.yml` y
> `docker-compose.coolify.yml` (validado con `docker compose config`).

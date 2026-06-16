# Despliegue en VPS con Coolify

## Arquitectura

```
Internet → Coolify (reverse proxy + SSL)
              ├── Frontend  → Next.js  :3001  (app.tu-dominio.com)
              ├── Backend   → NestJS   :3000  (api.tu-dominio.com)
              └── MySQL     → MySQL    :3306  (interno, sin exponer)
```

---

## Requisitos previos

- VPS con Ubuntu 22.04+ (mínimo 2 vCPU, 2 GB RAM)
- Coolify instalado (`curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`)
- Dominio apuntando a la IP del VPS
- Repositorio en GitHub: `golavi5/pos-modernization`

---

## Paso 1 — MySQL (primero)

En Coolify: **New Resource → Database → MySQL 8.0**

| Campo | Valor |
|-------|-------|
| Name | `pos-mysql` |
| MySQL Database | `pos_db` |
| MySQL User | `pos_user` |
| MySQL Password | *(generar contraseña fuerte)* |
| MySQL Root Password | *(generar contraseña fuerte)* |
| Expose port | ❌ NO (solo interno) |

✅ Click **Deploy** y esperar que inicie.

📋 Copiar el **Internal DB URL** que muestra Coolify:
```
mysql://pos_user:PASSWORD@pos-mysql:3306/pos_db
```

---

## Paso 2 — Backend (NestJS)

En Coolify: **New Resource → Application → Public Repository**

| Campo | Valor |
|-------|-------|
| Repository | `https://github.com/golavi5/pos-modernization` |
| Branch | `main` |
| Build Pack | `Dockerfile` |
| Dockerfile path | `new-implementation/backend/Dockerfile` |
| Base directory | `/new-implementation/backend` |
| Port | `3000` |
| Domain | `api.tu-dominio.com` |

### Variables de entorno del backend

En **Environment Variables** agregar:

```env
NODE_ENV=production
PORT=3000
DB_HOST=pos-mysql
DB_PORT=3306
DB_USERNAME=pos_user
DB_PASSWORD=<contraseña de MySQL paso 1>
DB_NAME=pos_db
JWT_SECRET=<generar: openssl rand -base64 48>
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=<generar: openssl rand -base64 48>
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=https://app.tu-dominio.com
DB_RUN_MIGRATIONS=true
```

> 💡 Generar secretos seguros:
> ```bash
> openssl rand -base64 48
> ```

> ⚠️ El backend valida estas variables al arrancar en `NODE_ENV=production`:
> falla de inmediato si `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DB_PASSWORD` o
> `CORS_ORIGINS` faltan o siguen con el placeholder `CHANGE_ME...`.

### Migraciones de base de datos (esquema)

El esquema de producción lo gestionan **migraciones TypeORM**
(`backend/src/database/migrations/`), generadas a partir de las entidades —
`synchronize` está desactivado en producción. `database/schema.sql` quedó
**obsoleto** y no debe cargarse (ver SPEC-CUT-001 B-05).

Con `DB_RUN_MIGRATIONS=true` (arriba), el backend ejecuta las migraciones
pendientes **al arrancar** — no se requiere paso aparte. Es la opción
recomendada para el despliegue de una sola instancia en Coolify.

Alternativa (correr migraciones como release command, sin auto-run):
```bash
# omitir DB_RUN_MIGRATIONS y, tras el build, ejecutar:
npm run migration:run:prod   # = typeorm migration:run -d dist/database/data-source.js
```

✅ Click **Deploy**

---

## Paso 3 — Frontend (Next.js)

En Coolify: **New Resource → Application → Public Repository**

| Campo | Valor |
|-------|-------|
| Repository | `https://github.com/golavi5/pos-modernization` |
| Branch | `main` |
| Build Pack | `Dockerfile` |
| Dockerfile path | `new-implementation/frontend/Dockerfile` |
| Base directory | `/new-implementation/frontend` |
| Port | `3001` |
| Domain | `app.tu-dominio.com` |

### Variables de entorno del frontend

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com
NEXT_PUBLIC_APP_NAME=POS System
```

### Build arguments

```env
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com
```

> ⚠️ Las variables `NEXT_PUBLIC_*` necesitan estar también en **Build Args** porque Next.js las embebe en el build.

✅ Click **Deploy**

---

## Paso 4 — SSL automático

Coolify gestiona SSL automáticamente con Let's Encrypt.

En cada aplicación, asegúrate de que:
- ✅ **Force HTTPS** activado
- ✅ **Generate SSL Certificate** activado

---

## Paso 5 — Verificación

### Backend
```bash
curl https://api.tu-dominio.com/health
# Esperado: {"status":"ok","timestamp":"..."}
```

### Frontend
```
https://app.tu-dominio.com
# Debe mostrar la pantalla de login
```

### Base de datos
En Coolify → pos-mysql → **Terminal**:
```sql
SHOW DATABASES;
USE pos_db;
SHOW TABLES;
```

---

## Backups, restauración y rollback

### Backups (primario: Coolify nativo)
En Coolify → `pos-mysql` → **Backups**: programa backups automáticos (cron) y,
de preferencia, destino **S3** off-host. Recomendado: diario + retención ≥ 7 días.
Verifica periódicamente que un backup **restaura** (un backup sin restore probado
no es un backup).

### Backups (fallback portable / hosts sin Coolify)
Scripts en [`scripts/`](./scripts) — conexión por las mismas env vars del backend
(`DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME`):
```bash
# Backup → gzip con timestamp + poda por retención (RETENTION_DAYS, def. 7)
DB_PASSWORD=*** BACKUP_DIR=/backups ./scripts/db-backup.sh

# Cron diario 02:17 (evita el minuto :00)
17 2 * * *  cd /opt/pos && DB_HOST=pos-mysql DB_USERNAME=pos_user \
  DB_PASSWORD=*** DB_NAME=pos_db BACKUP_DIR=/backups ./scripts/db-backup.sh >> /var/log/pos-backup.log 2>&1
```

### Restauración (⚠️ destructiva)
Restaura **primero en una base scratch** para validar el backup antes de tocar prod:
```bash
DB_PASSWORD=*** DB_NAME=pos_scratch ./scripts/db-restore.sh /backups/pos_db_YYYYMMDD-HHMMSS.sql.gz
# tras validar, repetir con DB_NAME=pos_db (CONFIRM=yes para automatizar)
```

### Rollback de un deploy
En Coolify → aplicación → **Deployments** → **Redeploy** del commit anterior.

> ⚠️ **Las migraciones son forward-only.** Hacer rollback del *código* no revierte
> el *esquema*. Si el commit anterior es incompatible con el esquema ya migrado:
> 1. restaura el backup **previo a esa migración**, **o**
> 2. añade y aplica una migración de reversa (`npm run migration:revert`) antes
>    de bajar el código.
> Para cambios de esquema riesgosos: backup **inmediatamente antes** del deploy.

---

## Auto-deploy en cada push (GitHub Webhook)

En Coolify → tu aplicación → **Webhooks**:

1. Copia la URL del webhook de Coolify
2. Ve a GitHub → tu repo → **Settings → Webhooks → Add webhook**
3. Payload URL: `<URL copiada de Coolify>`
4. Content type: `application/json`
5. Events: **Just the push event**
6. ✅ Active

Ahora cada `git push origin main` desplegará automáticamente.

---

## Variables de entorno de producción — Referencia completa

### Backend
```env
NODE_ENV=production
PORT=3000

# Base de datos
DB_HOST=pos-mysql         # nombre del servicio MySQL en Coolify
DB_PORT=3306
DB_USERNAME=pos_user
DB_PASSWORD=TU_PASSWORD_FUERTE
DB_NAME=pos_db

# JWT
JWT_SECRET=RANDOM_64_CHARS
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=OTRO_RANDOM_64_CHARS
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGINS=https://app.tu-dominio.com
```

### Frontend
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com
```

---

## Comandos útiles en el VPS

```bash
# Ver logs del backend
docker logs pos_backend -f

# Ver logs del frontend
docker logs pos_frontend -f

# Reiniciar servicio
docker restart pos_backend

# Ver estado de todos los containers
docker ps

# Conectarse a MySQL
docker exec -it pos_mysql mysql -u pos_user -p pos_db
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

### El backend no conecta a MySQL
- Verifica que el `DB_HOST` sea el nombre del servicio en Coolify (no `localhost`)
- Los servicios en Coolify se comunican por nombre interno

### Error CORS en el frontend
- Asegúrate que `CORS_ORIGINS` en el backend incluya el dominio del frontend con `https://`
- Verifica que `NEXT_PUBLIC_API_URL` termine sin `/`

### Build falla en el frontend
- Verifica que `output: 'standalone'` esté en `next.config.js`
- Asegúrate de pasar `NEXT_PUBLIC_API_URL` como Build Arg además de env var

### No se crean las tablas en producción
- En producción `synchronize` está **desactivado** a propósito; el esquema lo
  crean las migraciones. Verifica que `DB_RUN_MIGRATIONS=true` esté en las env
  vars del backend (o corre `npm run migration:run:prod` como release command).
- Revisa los logs de arranque del backend: debe aparecer
  `Migration InitialSchema… has been executed successfully` en el primer deploy.
- No cargues `database/schema.sql` (obsoleto/divergente).

---

## Recursos

- [Coolify Docs](https://coolify.io/docs)
- [Coolify Discord](https://discord.gg/coolify)
- GitHub: `https://github.com/golavi5/pos-modernization`

---

**Fecha:** Febrero 2026  
**Stack:** NestJS + Next.js + MySQL 8.0 + Coolify

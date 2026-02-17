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
```

> 💡 Generar secretos seguros:
> ```bash
> openssl rand -base64 48
> ```

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

### TypeORM no crea las tablas
- Verifica que `synchronize: true` esté activo en `app.module.ts` (solo para dev/primera vez)
- Para producción: usar `synchronize: false` y correr migrations

---

## Recursos

- [Coolify Docs](https://coolify.io/docs)
- [Coolify Discord](https://discord.gg/coolify)
- GitHub: `https://github.com/golavi5/pos-modernization`

---

**Fecha:** Febrero 2026  
**Stack:** NestJS + Next.js + MySQL 8.0 + Coolify

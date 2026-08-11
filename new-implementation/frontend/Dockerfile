# ── Stage 1: Dependencies ──────────────────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app
# --include=dev: `next build` type-checks and needs @types/*, que son
# devDependencies. npm las omite si NODE_ENV=production está en el entorno, y
# Coolify inyecta `ARG NODE_ENV` en las etapas del build. Ver la nota extensa en
# backend/Dockerfile. La etapa de producción no instala nada: copia standalone.
COPY package*.json ./
RUN npm ci --frozen-lockfile --include=dev

# ── Stage 2: Build ─────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args for env vars needed at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ── Stage 3: Production ────────────────────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

ENV NODE_ENV=production
# Next.js standalone server binds to $HOSTNAME; Docker sets that to the container
# id, so it would listen only on the container IP and the localhost healthcheck
# would fail. Bind to all interfaces and pin the port.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Install wget for healthcheck
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1001 -r nodejs && useradd -r -u 1001 -g nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching).
# --include=dev is NOT redundant: `npm run build` is `nest build`, and
# @nestjs/cli is a devDependency. npm omits devDependencies whenever
# NODE_ENV=production is in the environment, and Coolify injects an
# `ARG NODE_ENV` into this stage and passes --build-arg NODE_ENV=production —
# Docker exposes ARGs as env vars to RUN, so the install would silently skip
# the CLI and this stage would die at `npm run build` with exit 127.
# --include=dev overrides NODE_ENV. The production stage below still prunes.
COPY package*.json ./
RUN npm ci --frozen-lockfile --include=dev

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Production ────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install only production deps
COPY package*.json ./
RUN npm ci --frozen-lockfile --omit=dev && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

POS Modernization — a full-stack Point of Sale system replacing legacy .NET desktop/web apps with a modern stack. All active work lives in `new-implementation/`. The `legacy-implementations/` and `prototypes/` directories are read-only references.

**Stack:** Next.js 14 (App Router) + NestJS 10 + MySQL 8.0, containerized via Docker.

---

## Development Commands

### Full stack (local)
```bash
cd new-implementation
docker compose up -d          # starts MySQL (port 3308), backend (3000), frontend (3001)
docker compose down
docker compose logs -f backend
```

### Backend (NestJS)
```bash
cd new-implementation/backend
npm run start:dev             # watch mode
npm run build
npm run test                  # Jest unit tests
npm run test:cov
npm run lint
```

### Frontend (Next.js)
```bash
cd new-implementation/frontend
npm run dev                   # port 3000 (standalone dev server)
npm run build
npm run lint
npm run test:e2e              # Playwright (headless)
npm run test:e2e:ui           # Playwright UI mode
npm run test:e2e:headed
```

> Playwright base URL defaults to `http://localhost:3000`. Set `BASE_URL` env var to override.

---

## Architecture

### Repository layout
```
pos-modernization/
├── new-implementation/       # All active code
│   ├── frontend/             # Next.js 14
│   ├── backend/              # NestJS 10
│   ├── database/             # schema.sql (MySQL init)
│   └── docker-compose.yml
├── documentation/
├── prototypes/               # read-only
└── legacy-implementations/   # read-only (.NET)
```

### Backend (`new-implementation/backend/src/`)

NestJS module-per-domain pattern:

| Module | Domain |
|--------|--------|
| `modules/auth` | JWT auth, RBAC, user entities |
| `modules/products` | Products + categories |
| `modules/sales` | Orders + payments |
| `modules/customers` | Customer management |
| `modules/inventory` | Stock control |
| `modules/reports` | Analytics/reporting services |
| `modules/users` | User CRUD (admin) |
| `modules/notifications` | In-app notifications |
| `modules/settings` | App configuration |

Each module owns its own `entities/`, `dto/`, `controllers/`, `services/`.

**Auth flow:** Local strategy (email/password → bcrypt) → JWT access token (1h) + refresh token (7d). JWT strategy guards all protected routes. Multi-tenancy via `company_id` column on all tenant-scoped entities.

**Database:** TypeORM with `synchronize: true` in development only. In production, schema is applied from `database/schema.sql`. UUID primary keys (char 36). Soft deletes for compliance.

### Frontend (`new-implementation/frontend/`)

Next.js 14 App Router. No `src/` directory — code lives at root level:

```
app/                          # Routes
  (panel)/                    # Authenticated shell (layout.tsx wraps all below)
    dashboard/
    products/
    sales/
    customers/
    inventory/
    reports/
    users/
    notifications/
    settings/
  login/
  register/
components/                   # Feature-scoped UI components
hooks/                        # One hook per domain (useProducts, useSales, …)
lib/api/                      # Axios client + per-domain API functions
stores/                       # Zustand (authStore.ts only)
types/                        # TypeScript interfaces, one file per domain
messages/                     # i18n: es.json (default), en.json
```

**State:** Zustand (`authStore`) persisted to localStorage for auth tokens. Server state via TanStack Query v5 (5-min stale time).

**API client:** `lib/api/client.ts` — Axios instance with JWT Bearer interceptor and automatic token refresh on 401.

**Auth routing:** `middleware.ts` guards `(panel)/` routes using the `accessToken` cookie. Unauthenticated requests redirect to `/login`.

**i18n:** `next-intl` with cookie-based locale detection. Default locale: Spanish (`es`). Locale cookie: `NEXT_LOCALE`.

**Theming:** `next-themes` for dark/light mode.

---

## Environment Setup

Backend env vars (create `new-implementation/backend/.env`):
```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=pos_user
DB_PASSWORD=...
DB_NAME=pos_db
JWT_SECRET=...
NODE_ENV=development
```

Frontend env vars (create `new-implementation/frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

MySQL Docker port is `3308` on the host (maps to 3306 inside).

---

## Key Conventions

- **Schema-Driven Development:** Define TypeScript types in `types/` before implementing features. Zod is available for runtime validation.
- **Component size:** Max 200 lines per component. Extract logic into hooks or utils when approaching the limit.
- **Feature structure:** Each domain follows the same pattern in both frontend and backend — don't introduce new patterns without good reason.
- **TypeORM `synchronize`:** Never enable in production. Schema changes go through `database/schema.sql`.
- **RBAC:** Use decorators from `modules/auth/decorators/` to protect backend routes. Frontend should also guard UI based on user roles from `authStore`.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **pos-modernization** (5404 symbols, 8334 relationships, 65 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/pos-modernization/context` | Codebase overview, check index freshness |
| `gitnexus://repo/pos-modernization/clusters` | All functional areas |
| `gitnexus://repo/pos-modernization/processes` | All execution flows |
| `gitnexus://repo/pos-modernization/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

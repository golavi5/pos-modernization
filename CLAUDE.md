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
cp .env.example .env                      # root MySQL creds for the compose db (gitignored)
cp backend/.env.example backend/.env      # then fill real DB_PASSWORD/JWT_*/CORS_ORIGINS + BOOTSTRAP_ADMIN_*
cp frontend/.env.local.example frontend/.env.local   # optional
docker compose up -d          # starts MySQL (port 3308), backend (3000), frontend (3001)
docker compose down
docker compose logs -f backend
```
> The backend runs in `NODE_ENV=production` under compose (dogfoods prod +
> migrations-on-boot) and fails fast if secrets are missing or left as
> `CHANGE_ME...`. The `env_file`s are `required: false`, so a missing file is a
> clear runtime error, not a compose parse failure. Generate secrets with
> `openssl rand -base64 48`.
>
> The DB starts **empty** (migrations only, no demo seed). Set
> `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` (min 12) in `backend/.env`
> so the backend creates the first admin on boot — otherwise no one can log in.

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
npm run dev                   # port 3000 — collides with backend. Use `PORT=3001 npm run dev` when running both natively.
npm run build
npm run lint
npm run test:e2e              # Playwright (headless) — specs in `frontend/tests/e2e/`
npm run test:e2e:ui           # Playwright UI mode
npm run test:e2e:headed
```

> Playwright base URL defaults to `http://localhost:3000`. Set `BASE_URL` env var to override.

### Migration CLI (M4)
```bash
cd new-implementation/migration
npm install
npm test                      # builds backend first (pretest), then runs Testcontainers e2e
NODE_ENV=migration npm run migrate -- reset    # provision target DB via TypeORM migrations
NODE_ENV=migration npm run migrate -- import   # load legacy rows
NODE_ENV=migration npm run migrate -- verify   # parity diff (exit 0 = clean)
NODE_ENV=migration npm run migrate -- report   # render HTML report
```

---

## Architecture

### Repository layout
```
pos-modernization/
├── new-implementation/       # All active code
│   ├── frontend/             # Next.js 14
│   ├── backend/              # NestJS 10
│   ├── database/             # schema.sql (MySQL init)
│   ├── migration/            # M4 legacy parity CLI (standalone)
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
| `modules/companies` | Tenant (company) management |
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

---

## Project Docs

- `docs/specs/SPEC-001-pos-modernization.md` — master spec (Kairos Plane sync). Active source of truth for scope decisions.
- `docs/superpowers/plans/` — implementation plans from the brainstorming/planning workflow.
- `new-implementation/DEPLOYMENT-COOLIFY.md` — production deployment notes. The
  Coolify deploy is a **Docker Compose stack** built from
  `new-implementation/docker-compose.coolify.yml` — a separate file from the
  dev `docker-compose.yml`, which must never be deployed (it publishes MySQL to
  the host and bakes `NEXT_PUBLIC_API_URL=http://127.0.0.1:3000` into the
  frontend bundle).
- `new-implementation/frontend/i18n-request.ts` — next-intl 3.x request config (locale resolution lives here, not in `next.config.js`).

## Plane / Kairos Index Maintenance (MANDATORY — auto-discovery mode)

This repo uses Kairos **discoveryMode: auto**, which works differently from
the manual-index repos:

- The master doc `docs/specs/SPEC-001-pos-modernization.md` declares modules
  only — its `issues:` list is **empty by design. NEVER add issues to it.**
- **New work item → create `docs/specs/SPEC-<MOD>-NNN-<slug>.md`.** Kairos
  synthesizes one Plane issue per file with id `POS-<MOD>-<NNN>` (taken from
  the filename). The file needs an H1 title and a `**Status**: WORD` line —
  colon OUTSIDE the bold (`**Status**: DRAFT|APPROVED|DONE`); the
  colon-inside form is NOT parsed in SPEC files.
- Module assignment comes from filename globs in `docs/specs/_modules.yml`
  (first match wins; unmatched → M2 BACK). New module → add it to the master
  doc AND a glob block to `_modules.yml`.
- Superpowers design docs (`docs/superpowers/specs/`) use the OTHER syntax:
  `**Issue:** POS-<MOD>-NNN` (colon inside) + `**Status:** Word` — add the
  Issue line so Kairos links the design to its SPEC-file issue.
- Sync contract: files own structure; **Plane owns per-issue state after
  creation.** Never hand-create POS issues in the Plane UI.
- **A merged PR closes a POS issue — and auto-rewrites its SPEC file's
  `**Status**` to DONE — only via an explicit closing keyword:
  `Closes POS-CUT-002` / `Fixes SPEC-CUT-002` in the PR title or body.**
  Naming the ID in the title or discussing it in the body does NOT promote it,
  so a PR may safely reference specs it defers or did not touch. One keyword can
  introduce a list (`Closes POS-A-001, POS-A-002`), stopping at the first
  non-ref word; keywords inside code fences are ignored. If a PR completes an
  issue, the `Closes` line is what records it — without it the issue stays open.
- Two SPEC files with the same number abort the sync — numbers are unique
  per module prefix.

### Spec status convention (the `**Status**:` line is the ledger)

**The status line is the only maintained record of what is done.** Acceptance
checkboxes are working notes — do not treat `- [ ]` as evidence of anything.
(This repo accumulated 14 unchecked / 0 checked boxes across every spec before
the convention landed; `realtime-agents` shows the same 12%-ticked pattern at
200+ specs. The status line is what people actually keep current.)

Format — a token, then the evidence that makes the claim falsifiable:

```
**Status**: <TOKEN> — <date> (PR #N). <what shipped / what is still open>
```

Kairos parses only the leading token and stops at the first space, so
everything after it is free text. Write the evidence: dates, PR numbers, a link
to a verification record for anything exercised against real infrastructure,
and an honest tail (`…; T-20 follow-up open`) when a spec is partly landed.
Record a corrected header too (`header was stale DRAFT`) — that history is why
this convention exists.

| Token | Means | Board state |
|-------|-------|-------------|
| `DRAFT` | not started, or blocked before approval | Backlog |
| `APPROVED` | approved and/or built, not yet verified | Ready |
| `DONE` | shipped **and** verified; cite the PR | Done |
| `SUPERSEDED` | replaced — name the successor spec | Backlog |

**Do not use `IMPLEMENTED`.** Kairos maps it to **Done**, but it reads as
"code shipped, verification pending" — it would show Done before anything is
verified. Use `APPROVED` with the gap spelled out instead.

Changing this line moves the Plane board, and the sync's monotonic guard only
advances state: a more advanced token silently overrides a manual walk-back to
an earlier one, and cannot pull an item back. Pick the token you want the board
to show.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **pos-modernization** (5978 symbols, 9101 relationships, 76 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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

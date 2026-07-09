# Staging Rollback Rehearsal — Runbook

> Ready-to-run procedure for the **rollback-by-redeploy** gate of the Coolify
> staging dry-run (`STAGING-DRY-RUN.md` §6 / SPEC-CUT-002). Run this on the
> **staging** stack once Coolify access exists — it needs live infra and is
> intentionally *not* automatable from the repo.
>
> **Goal:** prove you can take a bad `main` deploy back to the previous healthy
> release and return a healthy stack, **without losing or corrupting data** —
> and know exactly which of two paths a given rollback requires *before* you
> click Redeploy.

---

## 0. The one thing that makes DB rollback non-trivial

Migrations are **forward-only** and run on boot (`DB_RUN_MIGRATIONS=true`).
**Rolling back the code does NOT roll back the schema.** So every rollback is
one of two cases, and you must classify it first:

- **Case A — no schema change** between the current (bad) commit and the target
  (previous) commit → plain Coolify Redeploy. Safe, fast, no DB action.
- **Case B — the bad deploy ran a new migration** the target commit doesn't know
  about → the target code may be incompatible with the now-migrated schema.
  Redeploy alone is **not safe**; follow Case B.

**Classify with one command** (from a checkout, comparing the two commits):
```bash
git diff --name-only <target_sha>..<bad_sha> -- \
  new-implementation/backend/src/database/migrations/
# empty  → Case A
# lists a migration file → Case B
```

---

## 1. Preconditions (before ANY risky deploy)

- [ ] Note the **currently-healthy commit SHA** (Coolify → backend →
      *Deployments* shows the deployed commit). This is your rollback target.
- [ ] **Take a backup immediately before the deploy** — this is the anchor a
      Case-B rollback restores to. Prefer Coolify native (pos-mysql → *Backups*
      → *Backup Now*); portable fallback:
      ```bash
      # from the VPS, against the internal DB service
      DB_HOST=pos-mysql DB_PORT=3306 DB_USERNAME=pos_user DB_PASSWORD=*** \
        DB_NAME=pos_db BACKUP_DIR=/backups ./scripts/db-backup.sh
      # → Backup written: /backups/pos_db_YYYYMMDD-HHMMSS.sql.gz   ← record this path
      ```
- [ ] Confirm the health endpoints of the **current** release respond (baseline
      to compare against after rollback — see §4).

> If you skip the pre-deploy backup, a Case-B rollback has nothing safe to
> restore to. Don't skip it for schema-touching deploys.

---

## 2. Case A — code-only rollback (no migration in the bad deploy)

1. Coolify → **backend** application → **Deployments**.
2. Find the previous healthy deployment (the SHA from §1) → **Redeploy**.
3. Repeat for **frontend** if the frontend was part of the bad release.
4. Wait for the deployment to go green, then run **§4 health verification**.
5. **Pass gate:** all §4 checks pass; app serves the previous release; no DB
   action was needed.

That's the whole happy path. Most rollbacks are Case A.

---

## 3. Case B — rollback across a migration (schema-incompatible)

The bad deploy applied a migration the target commit predates. Pick **one**
strategy; B1 is the default for staging.

### B1 — Restore the pre-deploy backup, then redeploy the old code (recommended)
Order matters: **restore first, code second**, so the old code never boots
against the newer schema.

1. **Restore into a scratch DB first to validate the backup** (never trust an
   unverified backup):
   ```bash
   DB_HOST=pos-mysql DB_USERNAME=pos_user DB_PASSWORD=*** \
     DB_NAME=pos_scratch ./scripts/db-restore.sh /backups/pos_db_YYYYMMDD-HHMMSS.sql.gz
   # scratch DB must already exist — the script does NOT CREATE DATABASE.
   #   create it once: docker exec -it pos_mysql mysql -uroot -p -e "CREATE DATABASE pos_scratch"
   ```
   Sanity-check row counts / a known record in `pos_scratch`.
2. **Restore over prod** (⚠️ destructive — overwrites `pos_db`):
   ```bash
   DB_NAME=pos_db CONFIRM=yes DB_HOST=pos-mysql DB_USERNAME=pos_user \
     DB_PASSWORD=*** ./scripts/db-restore.sh /backups/pos_db_YYYYMMDD-HHMMSS.sql.gz
   ```
3. Coolify → **backend** → Deployments → **Redeploy** the target (pre-migration)
   commit. On boot it sees the restored (pre-migration) schema and runs no
   pending migrations.
4. Run **§4 health verification**.

### B2 — Revert the migration, then redeploy the old code (no data loss)
Use only if the migration has a correct `down()` and you must keep writes made
after the deploy.

> ⚠️ **There is no prod-compiled revert npm script.** `npm run migration:revert`
> targets `src` via ts-node and won't exist in the production image. Run the
> compiled data-source explicitly inside the backend container:
> ```bash
> # in the running backend container (Coolify → backend → Terminal)
> npx typeorm migration:revert -d dist/database/data-source.js
> # reverts exactly ONE migration per invocation; repeat per migration to undo.
> ```
1. Revert the offending migration(s) with the command above (once per migration).
2. Coolify → backend → **Redeploy** the target commit.
3. Run **§4 health verification**.

> If the migration's `down()` is missing or lossy, **do not** use B2 — use B1.

---

## 4. Health verification (run after every rollback)

Replace `api.` / `app.` with the real staging subdomains.

```bash
# 1. Liveness — process up (never depends on DB)
curl -fsS https://api.<staging>/health
# expect: {"status":"OK","timestamp":"..."}

# 2. Readiness — process AND DB reachable
curl -fsS https://api.<staging>/health/ready
# expect: {"status":"ready","db":"up","timestamp":"..."}
# 503 {"status":"unavailable","db":"down"} → DB not reachable; rollback not done

# 3. Auth smoke — schema + data intact end-to-end
curl -fsS -X POST https://api.<staging>/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<bootstrap-admin>","password":"<pw>"}'
# expect: 200 with accessToken/refreshToken (camelCase)

# 4. Frontend serves
curl -fsS -o /dev/null -w '%{http_code}\n' https://app.<staging>/login
# expect: 200
```

- [ ] `/health` → 200 `OK`
- [ ] `/health/ready` → 200 `ready` / `db: up`
- [ ] `/auth/login` → 200 with tokens (proves the restored/reverted schema still
      authenticates a real user)
- [ ] `/login` page → 200
- [ ] Coolify shows the **target** commit as the deployed one, container healthy
- [ ] (Case B only) spot-check a known record survived (or was correctly rolled
      back to the backup state)

**Pass gate:** all boxes checked; deployed commit == rollback target; readiness
green.

---

## 5. Abort / escalate

Stop and escalate rather than improvise if:
- `/health/ready` stays 503 after rollback → DB is down or unreachable; do not
  keep redeploying (you'll loop). Check the pos-mysql resource first.
- A Case-B restore's scratch validation (§3 B1.1) shows wrong row counts →
  backup is bad; find an earlier good backup before overwriting prod.
- `migration:revert` errors or the migration has no `down()` → switch to B1
  (backup restore); never leave the schema half-reverted.

---

## 6. Rehearsal script (what to actually do in the staging dry-run)

To *rehearse* (not wait for a real incident):

1. Deploy current `main` to staging; run §4 — record it green.
2. **Case A drill:** Redeploy the immediately-previous commit; run §4; Redeploy
   `main` again. Confirms the redeploy-previous mechanic + health gate.
3. **Case B drill:** take a pre-deploy backup (§1); deploy a commit that adds a
   throwaway migration (or use the real last schema-changing commit); then
   execute **B1** back to the pre-migration commit; run §4. Confirms the
   backup→restore→redeploy ordering end-to-end.
4. Record commands + outcomes in `STAGING-DRY-RUN-RESULTS.md` under a new
   "Rollback rehearsal" section (mirror the backup/restore section's format:
   commands, result, pass/fail).

**Exit criterion for §6 of `STAGING-DRY-RUN.md`:** both drills pass — a healthy
stack returns on the previous commit (Case A) and a schema-incompatible rollback
recovers to a healthy, data-consistent stack (Case B).

---

## Notes / known gaps surfaced while writing this

- **No `migration:revert:prod` script.** `package.json` only has
  `migration:run:prod`; revert must be invoked with the explicit `dist`
  data-source (§3 B2). Worth adding a `migration:revert:prod` script to remove
  the footgun — tracked as a follow-up, not blocking the rehearsal.
- **`db-restore.sh` requires the target DB to pre-exist** (single-schema dump,
  no `CREATE DATABASE`) — see the create-once note in §3 B1.1. Matches the local
  rehearsal finding in `STAGING-DRY-RUN-RESULTS.md`.
- **`/health` returns `OK` (uppercase);** `DEPLOYMENT-COOLIFY.md` §Paso 5 shows
  lowercase `ok` — cosmetic doc drift, the real value is `OK`.

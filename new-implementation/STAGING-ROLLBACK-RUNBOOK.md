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

### Classify by asking the DATABASE, not the repo

<a id="ledger-query"></a>The authoritative source is the migration ledger —
TypeORM's `migrationsTableName` (`backend/src/database/data-source.ts`). This is
the **canonical ledger query**, referenced again in §3 B2 and §4:

```bash
# Coolify → pos-mysql → Terminal (no node tooling needed)
mysql -uroot -p -D pos_db -e "SELECT name FROM typeorm_migrations ORDER BY timestamp;"
```

**Rule:** compare that list against the **target commit's**
`new-implementation/backend/src/database/migrations/` directory.
- Every ledger name exists in the target commit → **Case A**.
- Any ledger name the target commit does **not** have → **Case B**.

> A `git diff` between the two commits is a *hint only* — it reports what the
> repo gained, not what ran on this environment. It says "Case A" whenever the
> migration was already committed at the target SHA but hadn't run yet, whenever
> the target isn't an ancestor of the bad SHA (two-dot silently ignores one
> side), or whenever someone ran `migration:run:prod` by hand. Never classify
> from it alone:
> ```bash
> git diff --name-only <target_sha>..<bad_sha> -- \
>   new-implementation/backend/src/database/migrations/   # hint, not the answer
> ```

> ⚠️ **Third case — the half-applied migration.** MySQL auto-commits DDL, so a
> multi-statement migration that failed partway leaves the schema changed but
> writes **no** ledger row. The schema is then ahead of *both* the ledger and
> the target commit. Symptom: the boot log shows a migration erroring, and the
> ledger head is still the previous migration. Treat this as **Case B and use
> B1 only** — B2 would revert the wrong (previous, good) migration. See the B2
> preflight.

---

## 1. Preconditions (before ANY risky deploy)

- [ ] Note the **currently-healthy commit SHA** (Coolify → backend →
      *Deployments* shows the deployed commit). This is your rollback target.
- [ ] <a id="exec-context"></a>**Take a backup immediately before the deploy** —
      this is the anchor a Case-B rollback restores to. Prefer Coolify native
      (pos-mysql → *Backups* → *Backup Now*); portable fallback below.

      > **Execution context (do not skip).** `pos-mysql` is the Coolify
      > *resource* name; the actual container name is generated (Coolify appends
      > a suffix) and it resolves only on the Docker network — the VPS host has
      > no `mysql`/`mysqldump` client at all (confirmed in
      > `STAGING-DRY-RUN-RESULTS.md`). So: **discover** the container, then run
      > `db-backup.sh` / `db-restore.sh` from a throwaway client container joined
      > to its network. `-it` is required — the restore prompts, and without a
      > TTY the read hits EOF and `set -e` aborts. Root-level SQL (DDL, GRANT,
      > the ledger query) runs in **Coolify → pos-mysql → Terminal** instead —
      > that shell already has a TTY and root.

      ```bash
      # from the VPS, in the repo checkout (DEPLOYMENT-COOLIFY.md's cron assumes
      # /opt/pos — adjust if yours differs)
      cd /opt/pos/new-implementation

      # 1. Discover the DB container + its network (never hardcode either)
      docker ps --format '{{.Names}}\t{{.Image}}' | grep -i mysql   # expect ONE row
      DB_CT=<name from that row>
      NET=$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' "$DB_CT")

      # 2. Back up through the real script, in a client container on that network
      docker run --rm -it --network "$NET" \
        -v "$PWD/scripts:/scripts:ro" -v /backups:/backups \
        -e DB_HOST="$DB_CT" -e DB_PORT=3306 -e DB_USERNAME=pos_user \
        -e DB_PASSWORD=*** -e DB_NAME=pos_db -e BACKUP_DIR=/backups \
        -w /scripts mysql:8.0 bash db-backup.sh
      # → Backup written: /backups/pos_db_YYYYMMDD-HHMMSS.sql.gz   ← record this path
      ```
- [ ] **Record the DB's charset/collation** — a B1 restore has to recreate the
      schema, and the dump carries no `CREATE DATABASE`, so the values must be
      copied, not guessed (Coolify → pos-mysql → Terminal):
      ```bash
      mysql -uroot -p -e "SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME \
        FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='pos_db';"
      # → record both values verbatim. Read them, don't assume: pos_db is created
      #   by MYSQL_DATABASE at container init, so it carries the MySQL 8 server
      #   default (utf8mb4 / utf8mb4_0900_ai_ci) — NOT the utf8mb4_unicode_ci
      #   that database/schema.sql declares per table.
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
Order matters: **validate, stop the bad code, restore, code last**, so neither
the bad release nor the old release ever runs against a schema it doesn't match.
Only steps 2–5 are an outage.

All `db-*.sh` invocations below use the client-container recipe from
[§1](#exec-context); root SQL runs in Coolify → pos-mysql → Terminal.

1. **Validate the backup in a scratch DB** (never trust an unverified backup).
   This touches only `pos_scratch`, so do it **before** taking the app down —
   it's the slowest step and there's no reason to be offline for it:
   ```bash
   # create-once, as root (Coolify → pos-mysql → Terminal). The GRANT is
   # required — db-restore.sh connects as pos_user, which has no rights on a
   # freshly created schema and would fail with "Access denied".
   mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS pos_scratch \
     CHARACTER SET <charset> COLLATE <collation>; \
     GRANT ALL PRIVILEGES ON pos_scratch.* TO 'pos_user'@'%'; FLUSH PRIVILEGES;"
   # <charset>/<collation> = the values recorded in §1.
   ```
   ```bash
   docker run --rm -it --network "$NET" \
     -v "$PWD/scripts:/scripts:ro" -v /backups:/backups \
     -e DB_HOST="$DB_CT" -e DB_USERNAME=pos_user -e DB_PASSWORD=*** \
     -e DB_NAME=pos_scratch -w /scripts mysql:8.0 \
     bash db-restore.sh /backups/pos_db_YYYYMMDD-HHMMSS.sql.gz
   ```
   Sanity-check row counts / a known record in `pos_scratch`. Bad backup → stop
   here and find an earlier one; prod is still untouched.
2. **Stop the backend** (Coolify → **backend** → **Stop**) — everything after
   this point mutates `pos_db`, and the restore is not atomic with respect to
   live traffic. Coolify builds the target image *before* swapping containers,
   so without this the bad release keeps serving for the whole redeploy window:
   the moment the restore lands, its writes hit columns that no longer exist —
   500s on order submit (`ER_BAD_FIELD_ERROR`), and any multi-statement
   order/payment write that already committed its header row leaves an orphaned
   partial order. **The outage starts here** and ends at step 5.
3. **Recreate `pos_db` empty** (⚠️ destructive — root, in the pos-mysql Terminal):
   ```bash
   mysql -uroot -p -e "DROP DATABASE pos_db; \
     CREATE DATABASE pos_db CHARACTER SET <charset> COLLATE <collation>;"
   # <charset>/<collation> = the values recorded in §1. Do not let the server
   # default decide — future migrations inherit it.
   # DROP DATABASE keeps pos_user's grants (mysql.db rows survive), so no re-GRANT.
   ```
   > **Why the drop is mandatory.** `db-backup.sh` dumps a single schema, so the
   > archive holds `DROP TABLE IF EXISTS` + `CREATE` only for tables that existed
   > at dump time. Restoring straight over `pos_db` rolls `typeorm_migrations`
   > back but leaves any table/column the bad migration *created* in place. The
   > next forward deploy then re-runs that migration and dies on
   > `ER_TABLE_EXISTS_ERROR` during `NestFactory.create` — a boot crash-loop that
   > needs manual SQL to escape.
4. **Restore over prod** (⚠️ destructive — overwrites `pos_db`):
   ```bash
   docker run --rm -it --network "$NET" \
     -v "$PWD/scripts:/scripts:ro" -v /backups:/backups \
     -e DB_HOST="$DB_CT" -e DB_USERNAME=pos_user -e DB_PASSWORD=*** \
     -e DB_NAME=pos_db -w /scripts mysql:8.0 \
     bash db-restore.sh /backups/pos_db_YYYYMMDD-HHMMSS.sql.gz
   # Answer the "This OVERWRITES database 'pos_db'" prompt by hand.
   ```
   > Do **not** add `CONFIRM=yes` here. That switch exists for cron/automation;
   > on the one destructive step a human runs, the prompt is the only guard
   > against a mistyped `DB_NAME` or a stale backup path pulled from scrollback.
   > (It also needs the `-it` above — without a TTY the prompt read hits EOF and
   > `set -e` aborts mid-restore.)
5. Coolify → **backend** → Deployments → **Redeploy** the target (pre-migration)
   commit. This also brings the backend back up. On boot it sees the restored
   (pre-migration) schema and runs no pending migrations.
6. Run **§4 health verification**.

### B2 — Revert the migration, then redeploy the old code (no data loss)
Use only if the migration has a correct `down()` and you must keep writes made
after the deploy.

> ⚠️ **`migration:revert` undoes the last *recorded* migration — not "the bad
> one".** It has no notion of which deploy went wrong; it just pops the ledger
> head. On this repo the head below the offending migration is
> `1781600000000-AddLegacyIdColumns`, and one invocation further down is
> `1781578985277-InitialSchema`, whose `down()` **drops all 15 tables**. Run it
> blind — or once too often — and the "no data loss" path is the one that wipes
> staging.

**B2 preflight — all three must hold, or use B1:**
- [ ] The ledger head **is** the offending migration. Confirm with the
      [canonical ledger query](#ledger-query); the last row must be the migration
      the bad deploy added.
- [ ] The bad deploy's migration **completed** (it wrote that ledger row). If the
      boot log shows it erroring, the schema is half-applied with no ledger row —
      revert would undo the previous *good* migration. → **B1**.
- [ ] That migration has a correct, non-lossy `down()`. Read it. → else **B1**.

> **Use the guarded script — not the bare TypeORM CLI.**
> `npm run migration:revert-one:prod` runs `dist/database/revert-one-migration.js`,
> which wraps `undoLastMigration()` in the preflight this section demands: it
> prints the ledger (head marked) plus anything pending, refuses to run
> unattended or while `DB_RUN_MIGRATIONS=true`, warns when the head is the only
> applied migration, and requires you to type that migration's **exact name**
> before it touches the schema. A generic "yes" is too easy to answer twice.
> ```bash
> # in the running backend container (Coolify → backend → Terminal)
> cd /app && npm run migration:revert-one:prod
> ```
> Exit codes: `0` reverted · `1` refused or aborted — **schema untouched** ·
> `2` the revert failed part-way → **B1**, do not retry (§5).
>
> It is deliberately **not** called `migration:revert:prod`: `migration:run:prod`
> applies **all** pending migrations, so the mirrored name would promise an
> inverse that does not exist. This undoes **one** migration per invocation.
> Re-run it — it re-reads the ledger every time — until the head is the target
> commit's last migration.
>
> ⚠ **Revert BEFORE you redeploy the target commit.** Both the script and the
> offending migration's `down()` ship inside the image built from the **bad**
> commit. Once the older target commit is deployed, `dist` no longer contains
> that migration class and *no* command can revert it — the only way back is
> **B1**. §0 warns that the `git diff` hint mis-reports several Case-B
> situations as Case A; if you redeployed first and only then found the schema
> mismatch, go straight to **B1**.
>
> On an image built before this script landed, `npm run migration:revert-one:prod`
> fails with `Missing script`. The unguarded fallback is
> `cd /app && ./node_modules/.bin/typeorm migration:revert -d dist/database/data-source.js`
> (call it by path — only npm puts it on `PATH`, and `npx` can hit the network
> from a slim image). It has none of the guards above: re-read the preflight and
> the ledger query before **every** invocation.
1. **Cut traffic to the app** — Coolify → **frontend** → **Stop** (or put the
   proxy in maintenance). Do *not* stop the backend: B2 needs its running
   container to execute the revert. Leaving traffic on means the bad code writes
   against a schema being reverted underneath it (500s, orphaned partial orders).
2. **Set `DB_RUN_MIGRATIONS=false`** on the backend service and let Coolify
   restart it. Migrations run on boot, so without this the container re-applies
   the migration you are about to revert the moment it restarts — and it *will*
   restart: after the revert the bad code is serving an old schema and the
   healthcheck fails. The script refuses to run while the flag is `true`.
   > A restart is not a stop — the backend comes back and is still available to
   > run the revert, which is all step 1 requires. Traffic is already cut.
3. Revert the offending migration(s) with the command above, re-checking the
   ledger between invocations.
4. Coolify → backend → **Redeploy** the target commit, **restore
   `DB_RUN_MIGRATIONS=true`**, then restart the frontend. (Leaving it `false`
   means the *next* forward deploy silently ships code ahead of the schema.)
5. Run **§4 health verification**.

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

# 5. Schema state — the ledger matches the deployed commit
#    (Coolify → pos-mysql → Terminal; the canonical ledger query from §0)
mysql -uroot -p -D pos_db -e "SELECT name FROM typeorm_migrations ORDER BY timestamp;"
# expect: exactly the migrations present in the TARGET commit's
#         backend/src/database/migrations/ — no more, no fewer
```

> Check 5 from the **backend** container instead, when you are already there and
> don't want to switch to the DB terminal (there is no mysql client in the
> backend image, and none on the VPS host at all):
> ```bash
> cd /app && npm run migration:show:prod   # [X] applied · [ ] pending
> ```
> Read-only. `[X]` rows are the ledger; every `[ ]` row is a migration the
> **deployed image** carries but has not run — after a Case-B rollback that list
> should be empty, since the target commit shouldn't know about the reverted one.
> Note it reports against the deployed image's migration set, so it cannot tell
> you about a migration the *bad* commit added and the current image lacks — for
> that, the mysql query above is authoritative.

- [ ] `/health` → 200 `OK`
- [ ] `/health/ready` → 200 `ready` / `db: up`
- [ ] `/auth/login` → 200 with tokens (proves the restored/reverted schema still
      authenticates a real user)
- [ ] `/login` page → 200
- [ ] Coolify shows the **target** commit as the deployed one, container healthy
- [ ] **Ledger == target commit's migration set** (check 5 above)
- [ ] (Case B only) spot-check a known record survived (or was correctly rolled
      back to the backup state)

> The four HTTP checks are all satisfiable by a **half**-rolled-back schema: a
> B2 that reverted one of two migrations, or a B1 that left orphan objects, still
> returns 200 on every one of them (login only touches `users`/`companies`).
> Without check 5 the rehearsal is recorded PASS and the *next* forward deploy is
> what fails to boot. Do not tick the gate on the HTTP checks alone.

**Pass gate:** all boxes checked; deployed commit == rollback target; readiness
green; ledger matches the deployed commit.

---

## 5. Abort / escalate

Stop and escalate rather than improvise if:
- `/health/ready` stays 503 after rollback → DB is down or unreachable; do not
  keep redeploying (you'll loop). Check the pos-mysql resource first.
- A Case-B restore's scratch validation (§3 B1 step 1) shows wrong row counts →
  backup is bad; find an earlier good backup before overwriting prod. Prod is
  still untouched at that point — do not proceed to step 2.
- The revert errors (script **exit 2**) or the migration has no `down()` →
  switch to B1 (backup restore); never leave the schema half-reverted. MySQL
  auto-commits DDL, so a `down()` that throws mid-way has already applied some
  of its statements while the ledger row survives — the migration still reads as
  applied, re-running re-attempts statements that succeeded, and
  `migration:run:prod` sees nothing pending. There is no scripted way out of
  that state; only a restore is. (Exit **1** is the opposite case — refused or
  aborted before any SQL ran, so the schema is untouched and you can safely
  fix the flagged condition and retry.)
- The B2 preflight fails on the ledger head (head isn't the offending migration,
  or the migration errored without recording a row) → **B1 only**. Do not "just
  try" a revert to see what happens; the head below it may be `InitialSchema`.
- §4 check 5 shows a ledger that doesn't match the deployed commit → the rollback
  is **not** done, whatever the HTTP checks say. Do not sign off; do not deploy
  forward on top of it.

---

## 6. Rehearsal script (what to actually do in the staging dry-run)

To *rehearse* (not wait for a real incident):

1. Deploy current `main` to staging; run §4 — record it green.
2. **Case A drill:** Redeploy the immediately-previous commit; run §4; Redeploy
   `main` again. Confirms the redeploy-previous mechanic + health gate.
3. **Case B drill:** take a pre-deploy backup (§1, and record charset/collation);
   deploy a commit whose throwaway migration **creates** a table (or use the real
   last schema-changing commit); classify with the ledger query (§0); then
   execute **B1** back to the pre-migration commit; run §4 including check 5.
   Confirms the stop→validate→recreate→restore→redeploy ordering end-to-end.
   A migration that only creates is the case that catches a skipped step 3: if
   the drill's forward redeploy of `main` boots clean afterwards, the created
   table really was removed.
4. Record commands + outcomes in `STAGING-DRY-RUN-RESULTS.md` under a new
   "Rollback rehearsal" section (mirror the backup/restore section's format:
   commands, result, pass/fail).

**Exit criterion for §6 of `STAGING-DRY-RUN.md`:** both drills pass — a healthy
stack returns on the previous commit (Case A) and a schema-incompatible rollback
recovers to a healthy, data-consistent stack (Case B).

---

## Notes / known gaps surfaced while writing this

- **Prod revert is now a guarded script** — `migration:revert-one:prod`
  (`backend/src/database/revert-one-migration.ts`), added because the gap
  written up here originally invited a bare `migration:revert:prod`, which would
  have been *worse* than the hand-typed binary path: discoverable, routine-looking,
  and popping the ledger head regardless of which deploy was bad. The script
  keeps the B2 preflight attached to the invocation (ledger echo, typed-name
  confirmation, no unattended mode, `DB_RUN_MIGRATIONS` guard). Two hazards it
  cannot remove, both handled in §3 B2 / §5 instead: a `down()` that throws
  leaves the schema half-reverted (DDL auto-commits), and neither script nor
  migration class exists in an image built from an older commit.
- **`db-restore.sh` requires the target DB to pre-exist** (single-schema dump,
  no `CREATE DATABASE`) and connects as `pos_user`, so a freshly created schema
  also needs a `GRANT` — both folded into §3 B1. Matches the local rehearsal
  findings in `STAGING-DRY-RUN-RESULTS.md`.
- **Neither script can run from the VPS host shell** — no client binaries there,
  and `pos-mysql` resolves only on the Docker network. Every invocation here is
  wrapped in a `mysql:8.0` client container (§1).
- **`/health` returns `OK` (uppercase);** `DEPLOYMENT-COOLIFY.md` §Paso 5 shows
  lowercase `ok` — cosmetic doc drift, the real value is `OK`.

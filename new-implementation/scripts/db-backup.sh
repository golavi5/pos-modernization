#!/usr/bin/env bash
# POS — MySQL logical backup: mysqldump → gzip, timestamped, with retention.
# Suitable for cron. Connection comes from env (same names as the backend).
#
#   Env:  DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_NAME
#   Opt:  BACKUP_DIR (default ./backups)  RETENTION_DAYS (default 7)
#   Run:  DB_PASSWORD=... ./db-backup.sh
#
# Note: Coolify offers native scheduled DB backups (to S3) — prefer that in
# production. This script is the portable fallback / for non-Coolify hosts.
set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USERNAME="${DB_USERNAME:-pos_user}"
DB_NAME="${DB_NAME:-pos_db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"

mkdir -p "$BACKUP_DIR"
ts="$(date +%Y%m%d-%H%M%S)"
out="$BACKUP_DIR/${DB_NAME}_${ts}.sql.gz"

# Dump to a scratch name and only publish it as ${DB_NAME}_*.sql.gz once the
# archive is complete. The shell truncates the redirect target before mysqldump
# can fail, so writing straight to "$out" would leave a partial archive that is
# indistinguishable by name from a good one — and retention (below) would then
# prune the last known-good backups in its favour.
partial="$out.partial"
trap 'rm -f "$partial"' EXIT

# MYSQL_PWD keeps the password off the command line / process list.
# --single-transaction: consistent InnoDB snapshot without locking writes.
# --no-tablespaces: avoids needing the PROCESS privilege on MySQL 8.
export MYSQL_PWD="$DB_PASSWORD"
mysqldump \
  --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USERNAME" \
  --single-transaction --quick --no-tablespaces \
  --routines --triggers --events \
  "$DB_NAME" | gzip > "$partial"

# gzip -t fails on a truncated member, so a dump killed after the pipe flushed
# is still caught here rather than at restore time.
gzip -t "$partial"
mv "$partial" "$out"
trap - EXIT

echo "Backup written: $out ($(du -h "$out" | cut -f1))"

# Prune backups older than RETENTION_DAYS.
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -print -delete

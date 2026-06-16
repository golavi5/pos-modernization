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

# MYSQL_PWD keeps the password off the command line / process list.
# --single-transaction: consistent InnoDB snapshot without locking writes.
# --no-tablespaces: avoids needing the PROCESS privilege on MySQL 8.
export MYSQL_PWD="$DB_PASSWORD"
mysqldump \
  --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USERNAME" \
  --single-transaction --quick --no-tablespaces \
  --routines --triggers --events \
  "$DB_NAME" | gzip > "$out"

echo "Backup written: $out ($(du -h "$out" | cut -f1))"

# Prune backups older than RETENTION_DAYS.
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -print -delete

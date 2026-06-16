#!/usr/bin/env bash
# POS — restore a MySQL backup produced by db-backup.sh. ⚠️ DESTRUCTIVE: overwrites
# the target database. Restore into a SCRATCH database first to verify a backup.
#
#   Env:  DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_NAME
#   Run:  DB_PASSWORD=... ./db-restore.sh <backup_file.sql.gz>
#   Set   CONFIRM=yes to skip the interactive prompt (automation).
set -euo pipefail

file="${1:-}"
[ -n "$file" ] || { echo "Usage: $0 <backup_file.sql.gz>" >&2; exit 1; }
[ -f "$file" ] || { echo "No such file: $file" >&2; exit 1; }

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USERNAME="${DB_USERNAME:-pos_user}"
DB_NAME="${DB_NAME:-pos_db}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"

if [ "${CONFIRM:-}" != "yes" ]; then
  printf "This OVERWRITES database '%s' on %s. Type 'yes' to proceed: " "$DB_NAME" "$DB_HOST"
  read -r ans
  [ "$ans" = "yes" ] || { echo "Aborted."; exit 1; }
fi

export MYSQL_PWD="$DB_PASSWORD"
gunzip -c "$file" | mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USERNAME" "$DB_NAME"
echo "Restored '$DB_NAME' from $file"

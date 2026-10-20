#!/usr/bin/env bash
set -euo pipefail

: "${DB_HOST:?DB_HOST es obligatorio}"
: "${DB_PORT:?DB_PORT es obligatorio}"
: "${DB_USER:?DB_USER es obligatorio}"
: "${DB_PASS:?DB_PASS es obligatorio}"
: "${DB_NAME:?DB_NAME es obligatorio}"

BACKUP_FILE="${1:?Uso: restore-db.sh ARCHIVO.dump}"
if [[ "${ALLOW_DB_RESTORE:-}" != "YES" ]]; then
  echo 'Restore bloqueado: defina ALLOW_DB_RESTORE=YES de forma explícita.' >&2
  exit 2
fi
[[ -f "$BACKUP_FILE" ]] || { echo "No existe el backup: $BACKUP_FILE" >&2; exit 1; }
DB_ADMIN_USER="${DB_ADMIN_USER:-$DB_USER}"
DB_ADMIN_PASS="${DB_ADMIN_PASS:-$DB_PASS}"
DB_ADMIN_HOST="${DB_ADMIN_HOST:-$DB_HOST}"
export PGPASSWORD="$DB_ADMIN_PASS"
psql --host="$DB_ADMIN_HOST" --port="$DB_PORT" --username="$DB_ADMIN_USER" --dbname=postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"
psql --host="$DB_ADMIN_HOST" --port="$DB_PORT" --username="$DB_ADMIN_USER" --dbname=postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"
psql --host="$DB_ADMIN_HOST" --port="$DB_PORT" --username="$DB_ADMIN_USER" --dbname=postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";"
export PGPASSWORD="$DB_PASS"
pg_restore --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --no-owner --no-privileges --exit-on-error "$BACKUP_FILE"
unset PGPASSWORD
printf 'RESTORE_PASS %s\n' "$DB_NAME"

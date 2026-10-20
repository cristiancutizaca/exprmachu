#!/usr/bin/env bash
set -euo pipefail

: "${DB_HOST:?DB_HOST es obligatorio}"
: "${DB_PORT:?DB_PORT es obligatorio}"
: "${DB_USER:?DB_USER es obligatorio}"
: "${DB_PASS:?DB_PASS es obligatorio}"
: "${DB_NAME:?DB_NAME es obligatorio}"

OUTPUT_DIR="${1:-./backups}"
mkdir -p "$OUTPUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT_FILE="$OUTPUT_DIR/${DB_NAME}_${STAMP}.dump"
export PGPASSWORD="$DB_PASS"
pg_dump --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --format=custom --no-owner --no-privileges --file="$OUTPUT_FILE"
unset PGPASSWORD
printf 'BACKUP_PASS %s\n' "$OUTPUT_FILE"

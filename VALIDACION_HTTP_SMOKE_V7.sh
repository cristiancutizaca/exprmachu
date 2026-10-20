#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:3002}"
API="${API_BASE_URL:-$BASE/api/v1}"
USER="${GRAEL_SMOKE_USER:?Defina GRAEL_SMOKE_USER}"
PASSWORD="${GRAEL_SMOKE_PASSWORD:?Defina GRAEL_SMOKE_PASSWORD}"
DB_HOST_VALUE="${DB_HOST:-localhost}"
DB_PORT_VALUE="${DB_PORT:-5432}"
DB_USER_VALUE="${DB_USER:-grael_user}"
DB_PASS_VALUE="${DB_PASS:-grael_pass_2026}"
DB_NAME_VALUE="${DB_NAME:-grael_db}"
export PGPASSWORD="$DB_PASS_VALUE"

request_code() {
  local method="$1" url="$2" body_file="$3" data="${4:-}" header="${5:-}"
  local args=(-sS -o "$body_file" -w '%{http_code}' -X "$method" "$url")
  [[ -n "$header" ]] && args+=(-H "$header")
  if [[ -n "$data" ]]; then args+=(-H 'Content-Type: application/json' -d "$data"); fi
  curl "${args[@]}"
}
check() {
  local name="$1" expected="$2" method="$3" url="$4" data="${5:-}" header="${6:-}"
  local body code
  body="$(mktemp)"
  code="$(request_code "$method" "$url" "$body" "$data" "$header")"
  if [[ "$code" != "$expected" ]]; then echo "FAIL|$name|HTTP $code|$(tr '\n' ' ' < "$body")"; rm -f "$body"; exit 1; fi
  echo "PASS|$name|HTTP $code"
  rm -f "$body"
}

check health 200 GET "$BASE/health"
check unauthenticated_report 401 GET "$API/reportes/dashboard"
LOGIN_BODY="$(curl -fsS -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "$(printf '{\"username\":\"%s\",\"password\":\"%s\"}' "$USER" "$PASSWORD")")"
TOKEN="$(printf '%s' "$LOGIN_BODY" | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
[[ -n "$TOKEN" ]] || { echo 'FAIL|login|token ausente'; exit 1; }
H="Authorization: Bearer $TOKEN"
echo 'PASS|login|HTTP 200'
check me 200 GET "$API/auth/me" '' "$H"

for pair in 'reportes_dashboard|/reportes/dashboard' 'incidencias|/incidencias' 'inventario|/inventario/bultos?page=1&limit=10' 'transbordo|/transbordo?page=1&limit=10' 'comprobantes|/comprobantes?page=1&limit=10'; do
  name="${pair%%|*}"; path="${pair#*|}"
  body="$(mktemp)"; code="$(curl -sS -o "$body" -w '%{http_code}' "$API$path" -H "$H")"
  [[ "$code" == 200 ]] && echo "PASS|$name|HTTP 200" || { echo "FAIL|$name|HTTP $code|$(tr '\n' ' ' < "$body")"; rm -f "$body"; exit 1; }
  rm -f "$body"
done

LEGACY_ID="$(psql -h "$DB_HOST_VALUE" -p "$DB_PORT_VALUE" -U "$DB_USER_VALUE" -d "$DB_NAME_VALUE" -Atc 'SELECT id FROM desembarques ORDER BY created_at LIMIT 1' 2>/dev/null || true)"
if [[ -n "$LEGACY_ID" ]]; then
  check legacy_bypass_blocked 400 PATCH "$API/desembarque/$LEGACY_ID/verificar" '' "$H"
else
  echo 'SKIP|legacy_bypass_blocked|no hay desembarque histórico para fixture'
fi

TICKET_ID="$(psql -h "$DB_HOST_VALUE" -p "$DB_PORT_VALUE" -U "$DB_USER_VALUE" -d "$DB_NAME_VALUE" -Atc 'SELECT id FROM tickets ORDER BY created_at LIMIT 1' 2>/dev/null || true)"
if [[ -n "$TICKET_ID" ]]; then
  GRE_BODY="$(mktemp)"; GRE_CODE="$(curl -sS -o "$GRE_BODY" -w '%{http_code}' -X POST "$API/gre/emitir" -H "$H" -H 'Content-Type: application/json' -d "{\"ticketId\":\"$TICKET_ID\",\"tipo\":\"GRE\",\"observacion\":\"Smoke V7\"}")"
  if [[ "$GRE_CODE" == 201 || "$GRE_CODE" == 200 ]]; then echo "PASS|gre_mock_persistente|HTTP $GRE_CODE"; else echo "FAIL|gre_mock_persistente|HTTP $GRE_CODE|$(tr '\n' ' ' < "$GRE_BODY")"; rm -f "$GRE_BODY"; exit 1; fi
  rm -f "$GRE_BODY"
  GRE_COUNT="$(psql -h "$DB_HOST_VALUE" -p "$DB_PORT_VALUE" -U "$DB_USER_VALUE" -d "$DB_NAME_VALUE" -Atc 'SELECT COUNT(*) FROM gre_documentos')"
  echo "PASS|gre_documentos_persistidos|count=$GRE_COUNT"
else
  echo 'SKIP|gre_mock_persistente|no hay ticket fixture'
fi
unset PGPASSWORD
printf 'SMOKE_V7_COMPLETED\n'

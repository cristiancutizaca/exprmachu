#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:3002}"
API="$BASE/api/v1"
AUTH_JSON="$(curl -fsS -X POST "$API/auth/login" -H 'Content-Type: application/json' -d '{"username":"supervisor","password":"super123"}')"
TOKEN="$(printf '%s' "$AUTH_JSON" | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
[ -n "$TOKEN" ] || { echo 'FAIL login: token ausente'; exit 1; }
H="Authorization: Bearer $TOKEN"
check() {
  local name="$1" url="$2"
  local code body
  body="$(mktemp)"
  code="$(curl -sS -o "$body" -w '%{http_code}' "$url" -H "$H")"
  if [ "$code" != "200" ]; then echo "FAIL $name HTTP $code $(tr '\n' ' ' < "$body")"; rm -f "$body"; exit 1; fi
  echo "PASS $name HTTP $code"
  rm -f "$body"
}
health_code="$(curl -sS -o /tmp/grael_v6_smoke_health.json -w '%{http_code}' "$BASE/health")"
[ "$health_code" = "200" ] && echo "PASS health HTTP 200" || { echo "FAIL health HTTP $health_code"; exit 1; }
unauth_code="$(curl -sS -o /dev/null -w '%{http_code}' "$API/reportes/dashboard")"
[ "$unauth_code" = "401" ] && echo "PASS unauthenticated report HTTP 401" || { echo "FAIL unauthenticated report HTTP $unauth_code"; exit 1; }
check me "$API/auth/me"
check reportes-dashboard "$API/reportes/dashboard"
check incidencias "$API/incidencias"
check inventario "$API/inventario/bultos?limit=10"
check transbordo "$API/transbordo?page=1&limit=10"
TICKET_ID="$(PGPASSWORD=grael_pass_2026 psql -h localhost -p 5432 -U grael_user -d grael_db -Atc "select id from tickets order by created_at limit 1")"
[ -n "$TICKET_ID" ] || { echo 'FAIL no hay ticket seeded'; exit 1; }
GRE_CODE="$(curl -sS -o /tmp/grael_v6_smoke_gre.json -w '%{http_code}' -X POST "$API/gre/emitir" -H "$H" -H 'Content-Type: application/json' -d "{\"ticketId\":\"$TICKET_ID\",\"tipo\":\"GRE\",\"observacion\":\"Smoke V6\"}")"
[ "$GRE_CODE" = "201" ] && echo "PASS gre-mock HTTP 201" || { echo "FAIL gre-mock HTTP $GRE_CODE $(cat /tmp/grael_v6_smoke_gre.json)"; exit 1; }
GRE_COUNT="$(PGPASSWORD=grael_pass_2026 psql -h localhost -p 5432 -U grael_user -d grael_db -Atc "select count(*) from gre_documentos")"
echo "PASS gre_documentos persisted count=$GRE_COUNT"
echo "SMOKE V6 PASS"

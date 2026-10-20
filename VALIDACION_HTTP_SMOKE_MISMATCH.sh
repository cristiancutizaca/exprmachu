#!/usr/bin/env bash
set -u
BASE="${BASE_URL:-http://localhost:3001/api/v1}"
OUT="${OUT_FILE:-VALIDACION_HTTP_SMOKE_MANUS_V4.txt}"
login=$(curl -sS -X POST "$BASE/auth/login" -H 'Content-Type: application/json' --data '{"username":"jesus.cutisaca","password":"admin123"}')
token=$(printf '%s' "$login" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
ticket_id='c4764760-0308-41c0-8e62-834f119b4346'
foreign_bulto_id='12d767b9-4a89-49b1-ad0d-92319379a9f0'
tmp=$(mktemp)
code=$(curl -sS -o "$tmp" -w '%{http_code}' -X POST "$BASE/tracking" -H 'Content-Type: application/json' -H "Authorization: Bearer $token" --data "{\"ticketId\":\"$ticket_id\",\"bultoId\":\"$foreign_bulto_id\",\"tipoEvento\":\"OBSERVADO\",\"observacion\":\"Smoke mismatch real\"}")
printf 'tracking manual mismatch con bulto real | HTTP %s | %s\n' "$code" "$(tr '\n' ' ' < "$tmp")" | tee -a "$OUT"
rm -f "$tmp"

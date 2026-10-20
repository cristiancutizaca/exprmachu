#!/usr/bin/env bash
set -u
BASE="${BASE_URL:-http://localhost:3001/api/v1}"
OUT="${OUT_FILE:-VALIDACION_HTTP_SMOKE_MANUS_V4.txt}"
log() { printf '%s\n' "$1" | tee -a "$OUT" >/dev/null; }
call() {
  local name="$1" method="$2" url="$3" token="$4" body="${5:-}" tmp code
  tmp=$(mktemp)
  if [ -n "$body" ]; then code=$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" "$BASE$url" -H 'Content-Type: application/json' -H "Authorization: Bearer $token" --data "$body"); else code=$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" "$BASE$url" -H "Authorization: Bearer $token"); fi
  log "$name | HTTP $code | $(tr '\n' ' ' < "$tmp" | cut -c1-700)"
  cat "$tmp"
  rm -f "$tmp"
}

admin_login=$(curl -sS -X POST "$BASE/auth/login" -H 'Content-Type: application/json' --data '{"username":"jesus.cutisaca","password":"admin123"}')
admin_token=$(printf '%s' "$admin_login" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
sede_id=$(printf '%s' "$admin_login" | sed -n 's/.*"sedeId":"\([^"]*\)".*/\1/p')
super_login=$(curl -sS -X POST "$BASE/auth/login" -H 'Content-Type: application/json' --data '{"username":"superadmin","password":"superadmin123"}')
super_token=$(printf '%s' "$super_login" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

manifests=$(curl -sS "$BASE/manifiesto" -H "Authorization: Bearer $admin_token")
manifest_id=$(printf '%s' "$manifests" | grep -o '"id":"[0-9a-f-]\{36\}"' | head -1 | cut -d'"' -f4)
manifest_state=$(printf '%s' "$manifests" | grep -o '"estado":"[A-Z_]*"' | head -1 | cut -d'"' -f4)
if [ -n "$manifest_id" ]; then
  if [ "$manifest_state" = 'EN_RUTA' ]; then call 'llegada manifiesto real' POST "/manifiesto/$manifest_id/llegada" "$admin_token"; else log "llegada manifiesto real | SKIP | estado actual=$manifest_state"; fi
  call 'resumen llegada manifiesto' GET "/manifiesto/$manifest_id/llegada/resumen" "$admin_token"
fi

tickets=$(curl -sS "$BASE/tickets" -H "Authorization: Bearer $admin_token")
ticket_id=$(printf '%s' "$tickets" | grep -o '"id":"[0-9a-f-]\{36\}"' | head -1 | cut -d'"' -f4)
second_ticket_id=$(printf '%s' "$tickets" | grep -o '"id":"[0-9a-f-]\{36\}"' | sed -n '2p' | cut -d'"' -f4)
if [ -n "$ticket_id" ]; then
  bultos=$(curl -sS "$BASE/bultos?ticketId=$ticket_id" -H "Authorization: Bearer $admin_token")
  bulto_id=$(printf '%s' "$bultos" | grep -o '"id":"[0-9a-f-]\{36\}"' | head -1 | cut -d'"' -f4)
  if [ -n "$bulto_id" ]; then
    call 'tracking manual válido ticket-bulto' POST '/tracking' "$admin_token" "{\"ticketId\":\"$ticket_id\",\"bultoId\":\"$bulto_id\",\"tipoEvento\":\"LLEGADA_SEDE\",\"sedeId\":\"$sede_id\",\"manifiestoId\":\"$manifest_id\",\"observacion\":\"Smoke HTTP V4\"}"
  fi
  if [ -n "$second_ticket_id" ]; then
    other_bultos=$(curl -sS "$BASE/bultos?ticketId=$second_ticket_id" -H "Authorization: Bearer $admin_token")
    other_bulto_id=$(printf '%s' "$other_bultos" | grep -o '"id":"[0-9a-f-]\{36\}"' | head -1 | cut -d'"' -f4)
    if [ -n "$other_bulto_id" ]; then
      call 'tracking manual mismatch controlado' POST '/tracking' "$admin_token" "{\"ticketId\":\"$ticket_id\",\"bultoId\":\"$other_bulto_id\",\"tipoEvento\":\"OBSERVADO\",\"observacion\":\"Smoke mismatch\"}"
    fi
  fi
fi

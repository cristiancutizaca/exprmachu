#!/usr/bin/env bash
set -u
BASE="${BASE_URL:-http://localhost:3001/api/v1}"
OUT="${OUT_FILE:-/tmp/grael_smoke_v4_results.txt}"
: > "$OUT"

request() {
  local name="$1" method="$2" url="$3" body="${4:-}" token="${5:-}"
  local tmp="$(mktemp)" code
  if [ -n "$token" ]; then
    if [ -n "$body" ]; then code=$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" "$BASE$url" -H 'Content-Type: application/json' -H "Authorization: Bearer $token" --data "$body")
    else code=$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" "$BASE$url" -H "Authorization: Bearer $token")
    fi
  elif [ -n "$body" ]; then
    code=$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" "$BASE$url" -H 'Content-Type: application/json' --data "$body")
  else
    code=$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" "$BASE$url")
  fi
  printf '%s | HTTP %s | %s\n' "$name" "$code" "$(tr '\n' ' ' < "$tmp" | cut -c1-500)" >> "$OUT"
  cat "$tmp"
  rm -f "$tmp"
  printf '\n'
}

printf 'GRAEL V4 HTTP SMOKE\nBASE=%s\nDATE=%s\n\n' "$BASE" "$(date -Is)" >> "$OUT"
request 'health' GET '/../../health'

admin_login=$(curl -sS -X POST "$BASE/auth/login" -H 'Content-Type: application/json' --data '{"username":"jesus.cutisaca","password":"admin123"}')
admin_token=$(printf '%s' "$admin_login" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
admin_sede=$(printf '%s' "$admin_login" | sed -n 's/.*"sedeId":"\([^"]*\)".*/\1/p')
printf 'login admin_sede | HTTP %s | sedeId=%s\n' "$([ -n "$admin_token" ] && echo 200 || echo 401)" "$admin_sede" >> "$OUT"

super_login=$(curl -sS -X POST "$BASE/auth/login" -H 'Content-Type: application/json' --data '{"username":"superadmin","password":"superadmin123"}')
super_token=$(printf '%s' "$super_login" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
printf 'login superadmin | HTTP %s\n' "$([ -n "$super_token" ] && echo 200 || echo 401)" >> "$OUT"

request 'me admin' GET '/auth/me' '' "$admin_token"
request 'listar egresos admin' GET '/egresos' '' "$admin_token"

if [ -n "$admin_token" ] && [ -n "$admin_sede" ]; then
  expense=$(request 'crear egreso sin caja' POST '/egresos' "{\"sedeId\":\"$admin_sede\",\"categoria\":\"OTRO\",\"concepto\":\"Smoke V4\",\"monto\":1,\"afectaCaja\":false}" "$admin_token")
  expense_id=$(printf '%s' "$expense" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
  if [ -n "$expense_id" ] && [ -n "$super_token" ]; then
    request 'aprobar egreso con superadmin' PATCH "/egresos/$expense_id/aprobar" '{"afectaCaja":false}' "$super_token"
  fi
fi

request 'listar reparto admin' GET '/reparto' '' "$admin_token"
request 'crear reparto sin tickets elegibles' POST '/reparto' "{\"sedeId\":\"$admin_sede\",\"ticketIds\":[]}" "$admin_token"
request 'listar manifiestos admin' GET '/manifiesto' '' "$admin_token"
request 'listar tracking publico inválido' GET '/tracking/public/SMOKE-NOT-FOUND'
request 'listar tickets admin' GET '/tickets' '' "$admin_token"

printf '\nResultados guardados en %s\n' "$OUT"
cat "$OUT"

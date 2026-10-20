#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE_URL:-http://localhost:3001/api/v1}"
BASE_ROOT="${BASE%/api/v1}"
OUT="${1:-VALIDACION_HTTP_SMOKE_V5.txt}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
: > "$OUT"

log() { printf '%s\n' "$*" | tee -a "$OUT" >&2; }
request() {
  local name="$1" method="$2" url="$3" token="${4:-}" body="${5:-}"
  local response="$TMP/${name}.json" status
  local -a headers=(-H 'Content-Type: application/json')
  if [[ -n "$token" ]]; then headers+=(-H "Authorization: Bearer $token"); fi
  if [[ -n "$body" ]]; then
    status=$(curl -sS -o "$response" -w '%{http_code}' -X "$method" "$BASE$url" "${headers[@]}" --data "$body")
  else
    status=$(curl -sS -o "$response" -w '%{http_code}' -X "$method" "$BASE$url" "${headers[@]}")
  fi
  local compact
  compact=$(tr '\n' ' ' < "$response" | sed -E 's/[[:space:]]+/ /g' | cut -c1-500)
  log "$name status=$status body=$compact"
  printf '%s' "$status"
}

log "GRAEL V5 HTTP SMOKE $(date -Is)"
health_response="$TMP/health.json"
health=$(curl -sS -o "$health_response" -w '%{http_code}' "$BASE_ROOT/health")
log "health status=$health body=$(tr '\n' ' ' < "$health_response" | sed -E 's/[[:space:]]+/ /g' | cut -c1-500)"
[[ "$health" == 200 ]]

login_super=$(curl -sS "$BASE/auth/login" -H 'Content-Type: application/json' --data '{"username":"superadmin","password":"superadmin123"}')
printf '%s' "$login_super" > "$TMP/login_super.json"
super_token=$(jq -r '.access_token // empty' "$TMP/login_super.json")
[[ -n "$super_token" ]]
log "login_super status=200 body={access_token:<redacted>, user_role:$(jq -r '.user.rol // "unknown"' "$TMP/login_super.json")}"
me=$(request me GET /auth/me "$super_token")
[[ "$me" == 200 ]]

noauth=$(request protected_without_token GET /usuarios)
[[ "$noauth" == 401 ]]

login_operator=$(curl -sS "$BASE/auth/login" -H 'Content-Type: application/json' --data '{"username":"almacen.cusco","password":"almacen123"}')
printf '%s' "$login_operator" > "$TMP/login_operator.json"
operator_token=$(jq -r '.access_token // empty' "$TMP/login_operator.json")
[[ -n "$operator_token" ]]
log "login_almacen status=200 body={access_token:<redacted>, user_role:$(jq -r '.user.rol // "unknown"' "$TMP/login_operator.json")}"
operator_users=$(request almacen_users_forbidden GET /usuarios "$operator_token")
[[ "$operator_users" == 403 ]]
operator_config=$(request almacen_config_forbidden GET /configuracion "$operator_token")
[[ "$operator_config" == 403 ]]
operator_create_user=$(request almacen_create_user_forbidden POST /usuarios "$operator_token" '{"username":"blocked-v5","password":"blocked123","nombre":"Blocked","apellido":"V5","rol":"OPERADOR"}')
[[ "$operator_create_user" == 403 ]]

super_users=$(request superadmin_users GET /usuarios "$super_token")
[[ "$super_users" == 200 ]]
reports=$(request reports_dashboard GET /reportes/dashboard "$super_token")
[[ "$reports" == 200 ]]
audit=$(request audit_list GET /auditoria?limit=5 "$super_token")
[[ "$audit" == 200 ]]
config=$(request config_list GET /configuracion "$super_token")
[[ "$config" == 200 ]]
deliveries=$(request deliveries_list GET /entregas "$super_token")
[[ "$deliveries" == 200 ]]

log "RESULT=PASS"

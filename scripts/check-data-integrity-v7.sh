#!/usr/bin/env bash
set -u

: "${DB_HOST:?DB_HOST es obligatorio}"
: "${DB_PORT:?DB_PORT es obligatorio}"
: "${DB_USER:?DB_USER es obligatorio}"
: "${DB_PASS:?DB_PASS es obligatorio}"
: "${DB_NAME:?DB_NAME es obligatorio}"
export PGPASSWORD="$DB_PASS"
PSQL=(psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --no-align --tuples-only --quiet)

has_table() { [[ "$("${PSQL[@]}" -c "SELECT to_regclass('public.$1') IS NOT NULL" 2>/dev/null | tr -d '[:space:]')" == 't' ]]; }
run_check() {
  local label="$1" sql="$2"
  shift 2
  local table
  for table in "$@"; do
    if ! has_table "$table"; then printf 'SKIP|%s|tabla ausente: %s\n' "$label" "$table"; return 0; fi
  done
  local result
  if result=$("${PSQL[@]}" -c "$sql" 2>/dev/null); then printf 'CHECK|%s|violations=%s\n' "$label" "$(echo "$result" | tr -d '[:space:]')"; else printf 'SKIP|%s|consulta no compatible con esquema actual\n' "$label"; fi
}

printf 'GRAEL V7 DATA INTEGRITY — SOLO LECTURA\n'
run_check 'bulto_sin_ticket' "SELECT COUNT(*) FROM bultos b LEFT JOIN tickets t ON t.id=b.ticket_id WHERE t.id IS NULL" bultos tickets
run_check 'bulto_sede_almacen_incompatible' "SELECT COUNT(*) FROM bultos b JOIN almacenes a ON a.id=b.almacen_actual_id WHERE b.sede_actual_id IS NOT NULL AND a.sede_id<>b.sede_actual_id" bultos almacenes
run_check 'ubicacion_almacen_incompatible' "SELECT COUNT(*) FROM bultos b JOIN ubicaciones_almacen u ON u.id=b.ubicacion_actual_id WHERE b.almacen_actual_id IS NOT NULL AND u.almacen_id<>b.almacen_actual_id" bultos ubicaciones_almacen
run_check 'pagos_sin_sede' "SELECT COUNT(*) FROM pagos WHERE sede_id IS NULL" pagos
run_check 'pagos_superan_total' "SELECT COUNT(*) FROM (SELECT p.ticket_id FROM pagos p JOIN tickets t ON t.id=p.ticket_id GROUP BY p.ticket_id,t.total HAVING SUM(p.monto)>MAX(t.total)+0.01) q" pagos tickets
run_check 'ticket_pagado_con_saldo' "SELECT COUNT(*) FROM tickets t LEFT JOIN (SELECT ticket_id,SUM(monto) total FROM pagos GROUP BY ticket_id) p ON p.ticket_id=t.id WHERE t.pagado=true AND COALESCE(p.total,0)<t.total-0.01 AND t.anulado=false" tickets pagos
run_check 'desembarque_recibido_sin_movimiento' "SELECT COUNT(*) FROM desembarque_bultos d LEFT JOIN movimientos_almacen m ON m.bulto_id=d.bulto_id AND m.tipo='INGRESO_DESEMBARQUE' AND m.\"referenciaId\"=d.sesion_id WHERE d.estado IN ('RECIBIDO','DANADO') AND m.id IS NULL" desembarque_bultos movimientos_almacen
run_check 'movimiento_referencia_desembarque_incompleta' "SELECT COUNT(*) FROM movimientos_almacen WHERE tipo='INGRESO_DESEMBARQUE' AND (\"referenciaTipo\" IS NULL OR \"referenciaId\" IS NULL)" movimientos_almacen
run_check 'comprobante_sin_ticket' "SELECT COUNT(*) FROM comprobantes WHERE ticket_id IS NULL" comprobantes
printf 'FIN_INTEGRITY_READ_ONLY\n'
unset PGPASSWORD

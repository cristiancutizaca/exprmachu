# VALIDACION_CONCURRENCIA_V6

Estado: **PENDIENTE** para prueba empírica. El código contiene transacciones en mutaciones críticas y advisory lock para correlativo CPE local, pero no se ejecutó una campaña concurrente.

## Protecciones existentes

| Área | Protección |
|---|---|
| CPE | `pg_advisory_xact_lock` por tipo/serie antes de calcular correlativo |
| Escaneo físico | Restricción única `(sesion_id, bulto_id)` e idempotencia de servicio |
| Cierre físico | Transacción que agrupa faltantes, estados, incidencias y tracking |
| Inventario | Validaciones de sede/ubicación y transacción de movimiento |
| Pagos | Flujo transaccional existente; requiere campaña de doble solicitud |

## Prueba requerida

Lanzar dos o más solicitudes simultáneas para el mismo CPE, bulto y cierre físico; comprobar ausencia de duplicados, serialización, estados finales, rollback ante error y trazabilidad. Guardar logs, IDs y consultas de verificación. No se asigna un resultado de carga o concurrencia hasta ejecutar esta prueba.

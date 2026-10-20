# PERMISOS_GRAEL_V7

El backend es la autoridad final. El Sidebar solo mejora la UX y nunca sustituye `RolesGuard`, JWT, DTOs ni validaciones de sede. `AUDITOR` es de solo lectura. `ADMIN_SEDE` no puede crear ni convertir usuarios en `AUDITOR`, `SUPERVISOR` o `SUPERADMIN`.

| Acción | SUPERADMIN | SUPERVISOR | ADMIN_SEDE | OPERADOR | ALMACEN | CAJERO | REPARTIDOR | AUDITOR |
|---|---|---|---|---|---|---|---|---|
| Leer dashboard/reportes | Global | Global | Sede | Sede permitida | Sede permitida | Sede permitida | Según permiso | Global |
| Recepción/comercial | Sí | Sí | Sede | Sede | No | No | No | Lectura |
| Inventario/movimiento físico | Sí | Sí | Sede | No | Sede actual | No | No | Lectura |
| Manifiesto/carguío | Sí | Sí | Sede/fase | No | Origen/fase | No | No | Lectura |
| Llegada/desembarque | Sí | Sí | Destino/fase | No | Destino/fase | No | No | Lectura |
| Transbordo | Sí | Sí | Sede | No | Sede/custodia | No | No | Lectura |
| Pago/caja | Sí | Sí | Sede | No | No | Sede | No | Lectura |
| Comprobante: listar | Sí | Sí | Sede | No | No | Sede | No | Global lectura |
| Comprobante: anular | Sí | Sí | Sede | No | No | Sede | No | No |
| Entrega/POD | Sí | Sí | Sede | No | No | No | Sede actual |
| Incidencias: resolver | Sí | Sí | Sede | No | Según operación | No | Según operación | No |
| Usuarios/roles | Todo | Roles no globales | Operativos permitidos | No | No | No | No | No |
| Auditoría | Global | Global | Sede | No | No | No | No | Global lectura |
| GRE MOCK | Política global | Política global | Dentro de scope | No | Según política | No | No | Lectura |

Toda mutación sensible registra usuario, sede cuando aplica, antes/después, metadata y `requestId` cuando el flujo lo proporciona. Los endpoints de desembarque legacy requieren `legacy=true` explícito y no son el flujo operacional V7.

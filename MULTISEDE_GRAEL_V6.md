# Multisede GRAEL V6

## Principio

Cada operación se evalúa contra una **sede efectiva**. Para usuarios locales, la sede proviene del JWT y no puede ser sustituida por un parámetro arbitrario. Para roles globales, `sedeId` puede seleccionar un alcance cuando el endpoint lo admite; sin selector se consulta el alcance global autorizado.

| Dominio | Regla V6 |
|---|---|
| Tickets | La sede se deriva del usuario de creación y se valida en operaciones posteriores |
| Inventario | El bulto, almacén y ubicación deben pertenecer a la sede efectiva |
| Reportes | Las consultas filtran por `tickets.usuario_creacion_id` hacia `usuarios.sede_id` |
| Transbordo | `transbordo.sede_id` define scope; flota debe pertenecer a esa sede |
| Desembarque | La sesión usa sede destino del manifiesto y destino físico de la misma sede |
| Incidencias | Sede del ticket/bulto o sede operacional explícita, con consulta scoped |
| Auditoría | Se filtra por sede cuando el rol no es global |

Los movimientos físicos directos entre sedes están prohibidos con `CROSS_SITE_MOVEMENT_FORBIDDEN`. La transferencia intersede requiere el flujo manifiesto/transbordo/llegada, que deja trazabilidad. Un parámetro `sedeId` que excede el alcance del usuario produce rechazo y no cambia la sede efectiva.

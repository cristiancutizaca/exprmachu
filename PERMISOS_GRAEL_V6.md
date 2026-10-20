# Permisos GRAEL V6

## Política general

El backend es la autoridad de autorización. El frontend solo oculta o muestra acciones; nunca sustituye `JwtAuthGuard`, `RolesGuard` ni las verificaciones de sede. `SUPERADMIN`, `SUPERVISOR` y `AUDITOR` son roles globales para lectura según el caso. `AUDITOR` es estrictamente de solo lectura.

| Rol | Alcance | Capacidades principales | Restricciones críticas |
|---|---|---|---|
| SUPERADMIN | Global | Administración, RBAC, catálogos, reportes, auditoría | SUNAT sigue externo |
| SUPERVISOR | Global | Supervisión, flujos operativos y asignación de roles de sede | No asigna SUPERADMIN |
| ADMIN_SEDE | Sede | Administración operativa, usuarios de sede, desembarque con diferencia | No asigna AUDITOR, SUPERVISOR ni SUPERADMIN |
| OPERADOR | Sede | Recepción y operación autorizada | No mueve físicamente inventario cross-site |
| ALMACEN | Sede | Inventario, carguío y desembarque | Sede efectiva obligatoria |
| CAJERO | Sede | Pagos y caja | No administra usuarios globales |
| REPARTIDOR | Sede | Reparto, intentos y entrega | Solo tickets elegibles |
| AUDITOR | Global lectura | Consulta de auditoría y reportes autorizados | Sin mutaciones |

Las mutaciones que cambian estado, dinero, ubicación o custodia exigen actor autenticado, DTO validado, ownership y, cuando corresponde, transacción y evento de tracking.

# GRAEL V10 — Operación, permisos y arquitectura

## Arquitectura

GRAEL conserva una arquitectura monolítica separada por módulos NestJS, con frontend Next.js y persistencia PostgreSQL. El backend es autoridad de autorización, sede, workflow, lock, auditoría y consistencia; el frontend consume `/api/v1`, presenta el estado de sesión y puede ocultar o deshabilitar controles, pero nunca reemplaza guards ni políticas de servicio.

| Dimensión | Fuente de verdad V10 |
|---|---|
| Recepción histórica | `Ticket.sedeRecepcionId` |
| Custodia actual | `Bulto.sedeActualId` |
| Almacén/ubicación | `Bulto.almacenActualId` y `ubicacionActualId` |
| Caja/cobro | `CajaSesion.sedeId`, `Pago.sedeId`, `MovimientoCaja` |
| Emisión documental | `Comprobante.sedeEmisionId`, `SerieDocumento.sedeId` |
| Auditoría | `AuditLog` con actor, sede, antes/después y requestId cuando aplica |

## Matriz resumida de permisos

| Rol | Lectura | Mutaciones principales | Restricciones |
|---|---|---|---|
| SUPERADMIN | Nacional | Configuración, tarifas, correcciones y operaciones autorizadas | Debe conservar trazabilidad |
| SUPERVISOR | Operativa amplia | Resolución de incidencias, anulaciones, documentos y supervisión | No elimina históricos |
| ADMIN_SEDE | Su sede | Recepción y operación permitida por sede | Configuración nacional read-only |
| OPERADOR | Su operación | Recepción y tareas asignadas | Sin anulación ni corrección administrativa |
| CAJERO | Caja/cobro de su sede | Apertura, movimiento, cierre y pagos con Caja abierta | No opera físicamente bultos fuera de scope |
| ALMACEN | Custodia | Movimientos e inventario autorizados | Sede/almacén coherentes |
| REPARTIDOR | Entregas asignadas | Entrega e intento fallido | Custodia y ticket deben coincidir |
| AUDITOR | Lectura | Ninguna mutación operacional | Verificación de auditoría únicamente |

## Workflows críticos

Recepción crea Ticket, Bulto y tracking inicial en la sede de recepción. Cada movimiento físico posterior actualiza `sedeActualId`, almacén y ubicación bajo la regla del módulo. Incidencias que cambian la realidad física requieren `disposicion`; `REINGRESADO_ALMACEN` sincroniza Bulto, Tracking y MovimientoAlmacen en una transacción. Entrega bloquea el Bulto, impide una segunda entrega activa o final y confirma POD solo después de validar la custodia.

Caja abre una sesión por usuario/sede, registra movimientos en `MovimientoCaja` y calcula el efectivo esperado desde el ledger; Yape, Plin, transferencia y tarjeta se conservan como métodos digitales y no se suman al efectivo contado. Un cierre concurrente deja un único cierre aceptado.

GRE/CPE usa `SerieDocumento` y correlativo por sede protegido por lock. El resultado actual es MOCK; el flujo productivo requiere proveedor, certificado, homologación, endpoint y CDR. La numeración local no constituye validez tributaria.

## Endpoints V10 relevantes

| Operación | Endpoint |
|---|---|
| Login/me/logout | `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout` |
| Caja | `GET /api/v1/pagos/caja/actual`, `POST /api/v1/pagos/caja/abrir`, `POST /api/v1/pagos/caja/:id/movimientos`, `POST /api/v1/pagos/caja/:id/cerrar` |
| Tickets/pago | `GET /api/v1/tickets`, `PATCH /api/v1/tickets/:id/pagar`, `PATCH /api/v1/tickets/:id/anular` |
| Bultos/tracking | `PATCH /api/v1/bultos/:id/estado`, `POST /api/v1/bultos/:id/correccion-estado`, `GET /api/v1/tracking/bulto/:bultoId` |
| Incidencias | `GET/POST /api/v1/incidencias`, `PATCH /api/v1/incidencias/:id/resolver` |
| Entrega | `GET/POST /api/v1/entregas`, `PATCH /api/v1/entregas/:id/entregar`, `PATCH /api/v1/entregas/:id/intento-fallido` |
| GRE/CPE | `POST /api/v1/gre/emitir`, `GET /api/v1/gre/:id` |
| Operación física | `/api/v1/manifiesto`, `/api/v1/desembarque`, `/api/v1/transbordo`, `/api/v1/inventario` |

## Pantallas validadas

Playwright cubre login, drawer overlay, logout, comprobantes, detracción, Búsqueda QR y Caja Diaria. Desembarque, búsqueda, configuración, inventario y transbordo tienen rutas y contratos API en el frontend; la cobertura E2E nacional multi-sede de todas ellas permanece pendiente.

## Checklist y pendientes

| Ítem | Estado |
|---|---|
| Build, Jest, lint, TypeScript y Next build | **IMPLEMENTADO Y PROBADO** |
| Caja ledger y doble cierre | **IMPLEMENTADO Y PROBADO** |
| Entrega única y POD | **IMPLEMENTADO Y PROBADO** |
| Incidencia con disposición | **IMPLEMENTADO Y PROBADO** |
| Series GRE/CPE y hash | **IMPLEMENTADO Y PROBADO / MOCK** |
| Concurrencia automática width 10 | **IMPLEMENTADO Y PROBADO** |
| Integridad y restore | **IMPLEMENTADO Y PROBADO** |
| Homologación SUNAT | **BLOQUEADO EXTERNO** |
| Viaje nacional integral Lima→Arequipa→Cusco | **PENDIENTE** |
| Performance bajo carga y dataset masivo | **PENDIENTE** |
| Catálogos empresariales avanzados | **PARCIAL** |
| Remediación completa de npm audit | **PENDIENTE** |

La condición de aceptación debe leerse junto con `VALIDACION_MANUS_V10.md`; cualquier resultado más fuerte que la evidencia indicada sería una sobredeclaración.

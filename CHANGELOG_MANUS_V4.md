# CHANGELOG_MANUS_V4

## Resumen

Esta entrega lleva GRAEL desde V3 hacia V4 operativo sobre el monorepo existente. Se conservaron las funciones útiles, el modo Demo explícito y la arquitectura Next.js 14 + Tailwind + Zustand en frontend con NestJS + TypeORM + PostgreSQL en backend.

## Seguridad y RBAC multisede

Se actualizó `JwtStrategy.validate` para propagar `sedeId` y se ampliaron los roles físicos de PostgreSQL mediante `rol_usuario_enum`: `SUPERADMIN`, `ALMACEN`, `REPARTIDOR` y `AUDITOR`. La política reusable `src/auth/sede-scope.ts` centraliza `assertSedeAccess`, `effectiveSedeId` e identificación de roles globales.

Se aplicó ownership multisede a bultos, tracking, tickets, catálogos, caja, egresos, reparto, entregas e incidencias. Los roles normales quedan limitados a su sede; Supervisor, Superadmin y Auditor tienen alcance global conforme a la política de lectura/operación definida. Se añadió la migración de vinculación de vehículos y conductores con sedes.

## DTOs, integridad y validación

Se creó `src/common/dto/secured-operations.dto.ts` para validar creación y cambios de bultos, apertura/movimientos/cierre de caja y tracking manual. Los DTOs se aplicaron a Bultos, Pagos y Tracking.

La función `assertTicketBultoIntegrity` de `src/domain-integrity.ts` se reutiliza en Tracking, Entregas e Incidencias. Esto evita registrar eventos, entregas o incidencias con un bulto perteneciente a otro ticket.

## Operaciones V4

La llegada de manifiesto quedó transaccional: cambia el estado, crea eventos `LLEGADA_SEDE`, actualiza bultos relacionados y expone resumen esperado, llegado, pendiente y descargado. Se añadieron `POST /manifiesto/:id/llegada` y `GET /manifiesto/:id/llegada/resumen`.

Se implementó `EgresosModule` con entidad, migración, solicitud, aprobación, rechazo, ownership, auditoría y movimiento `EGRESO` en caja. La política impide autoaprobación y exige caja abierta de la misma sede cuando `afectaCaja=true`.

Se implementó `RepartoModule` con planillas y detalles, elegibilidad de tickets, inicio transaccional, transición de bultos y tickets a reparto, intentos con historial, reprogramación y finalización. Solo son elegibles tickets `tipoEntrega=REPARTO` en `LISTO_REPARTO` o `DESEMBARQUE_EN_DESTINO` y con bultos aptos.

Se reforzó Caja para ownership, intervención autorizada, ajustes, cierre por otro usuario y auditoría. Se endureció Tracking para validar referencias de sede, almacén, ubicación y manifiesto y para producir códigos de dominio.

## Observabilidad

Se añadió middleware de `x-request-id`, filtro global JSON de excepciones y health check con verificación real de PostgreSQL mediante `SELECT 1`. Las respuestas de error incluyen `statusCode`, `requestId`, `timestamp`, `path`, `code`, `message` y `details` cuando la excepción los proporciona.

El tracking público se ajustó para no enviar valores alfanuméricos a la columna UUID. Un código inexistente devuelve 404 controlado en vez de 500.

## Frontend V4

Se ampliaron `lib/api.ts` con APIs para Egresos, Reparto, llegada y resumen de Manifiesto. Se añadieron las pantallas `/reparto` y `/egresos` con sesiones reales y Demo explícito. El Sidebar registra Reparto en Operaciones y Egresos en Administración.

La página de Manifiesto conserva sus datos Demo y conecta la acción **Marcar llegado** a la llegada transaccional real cuando existe JWT. El drawer de Operaciones continúa iniciando cerrado, funciona como overlay y se cierra al navegar, hacer clic fuera o pulsar Escape.

## Pruebas y validación

Se añadieron pruebas unitarias de EgresosService y RepartoService. La suite final contiene 7 suites y 18/18 pruebas aprobadas. Frontend y backend superan sus builds; Next.js genera 23 rutas.

Las migraciones V4 son:

| Migración | Propósito |
|---|---|
| `1710000009000-ExtendUserRolesV4.ts` | Roles V4 en `rol_usuario_enum` |
| `1710000010000-LinkFleetToSedesV4.ts` | Vinculación flota-sede |
| `1710000011000-CreateExpensesV4.ts` | Egresos, categorías, estados y auditoría |
| `1710000012000-CreateDeliverySheetsV4.ts` | Planillas de reparto y detalles |
| `1710000013000-ExtendTicketDeliveryStatesV4.ts` | Estados de reparto en `estado_ticket_enum` |

El smoke HTTP real quedó reproducible en `VALIDACION_HTTP_SMOKE_MANUS_V4.sh`, `VALIDACION_HTTP_SMOKE_V4_OPERATIVO.sh`, `VALIDACION_HTTP_SMOKE_MISMATCH.sh` y su evidencia `VALIDACION_HTTP_SMOKE_MANUS_V4.txt`.

## Estado por categoría

| Categoría | Estado | Detalle |
|---|---|---|
| Backend V4, migraciones y seed | Implementado | Compilado y ejecutado sobre PostgreSQL real |
| RBAC y multisede | Implementado | Guards, política reusable y ownership en módulos V4 |
| Llegada de manifiesto | Implementado | Transacción, eventos y resumen verificados por HTTP |
| Egresos | Implementado | Solicitud, no autoaprobación, caja y auditoría |
| Reparto | Implementado | Elegibilidad, planillas, inicio, intentos y finalización |
| Frontend Reparto/Egresos | Implementado | API real y Demo explícito |
| Pantallas históricas restantes | Parcial | Conservan funcionalidad previa; algunas aún tienen contratos o Demo parcial |
| E2E completo con navegador | Pendiente | Requiere campaña automatizada completa |
| Carga, concurrencia y recuperación | Pendiente | No se ejecutó benchmark ni caos operativo |
| SUNAT legal | Bloqueado por dependencias externas | Requiere credenciales, certificado, firma, homologación y endpoints |
| Producción | Pendiente | Requiere secretos rotados, respaldo, monitoreo y revisión operativa |

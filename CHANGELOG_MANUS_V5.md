# CHANGELOG MANUS V5

## Alcance

Esta entrega continúa directamente sobre `01_PROYECTO_BASE/grael-project/` y conserva la base V4. No se creó un proyecto paralelo ni se eliminaron módulos útiles. El objetivo de V5 es convertir los flujos críticos en un piloto operacional verificable contra PostgreSQL real, manteniendo la separación explícita entre API real y Demo.

## Cambios implementados

| Área | Cambio V5 | Estado |
|---|---|---|
| Reparto | Inicio dentro de transacción, validación de sede de vehículo/repartidor, prevención de asignación duplicada, recalculación de estado del ticket, retorno físico a almacén y estados `RETORNO_PENDIENTE`/`RETORNADO` | Implementado |
| Egresos | DTOs estrictos, mapeo explícito, caja ABIERTA obligatoria cuando corresponde, misma sede, no autoaprobación, rechazo y anulación auditables | Implementado |
| Manifiestos | Exclusividad de tickets en manifiestos activos, validación de ruta y flota por sede, carguío idempotente, scoping de operaciones, llegada transaccional y resúmenes | Implementado |
| Usuarios | DTOs de creación/actualización, hashing de contraseña, no exposición de password, scoping, protección contra escalamiento de rol desde sede | Implementado |
| Configuración | DTOs, actualización masiva validada, claves no editables protegidas, auditoría y autorización exclusiva de perfiles globales | Implementado |
| Desembarque | Roles por operación, DTO de entrega y observación, scoping por sede de bultos y mapeo explícito de receptor | Implementado |
| RBAC legacy | Roles explícitos para clientes, comprobantes, programaciones, transbordo, reportes y manifiestos | Implementado / parcial de servicio |
| Auditoría | Nuevo `AuditoriaModule`, consulta paginada y filtrada por sede, acción y entidad, más índice `(sede_id, fecha_hora)` | Implementado |
| Frontend Manifiesto | Alta real, destinos desde API, gestión de tickets, escaneo de bultos y mensajes Demo/API | Implementado |
| Frontend Entregas | Nueva ruta `/entregas` con listado, alta, POD, intento fallido y Demo explícito | Implementado |
| Frontend Reparto | Inicio, finalización, registro de intentos y retorno con almacén/ubicación UUID | Implementado |
| Frontend Dashboard | KPIs, resumen mensual, tickets recientes y pendientes de desembarque desde API en sesión real | Implementado |
| Frontend Reportes | Resumen mensual, comparativo y mercadería desde API; Demo mantiene datos locales | Implementado |
| Frontend Configuración | Lectura de claves y actualización masiva real, con Demo local | Implementado |
| Frontend Auditoría | Nueva ruta `/auditoria` de solo lectura con filtros y modo Demo | Implementado |
| API central | Métodos de retorno, anulación de egreso, reportes, configuración, auditoría y parámetros de sede | Implementado |
| PostgreSQL | Migraciones de retorno e índice de auditoría ejecutadas incrementalmente | Implementado |

## Reglas de negocio endurecidas

Los tickets no pueden pertenecer simultáneamente a manifiestos activos ni a planillas activas. Una planilla de reparto solo acepta `tipoEntrega=REPARTO` y estados `LISTO_REPARTO` o `DESEMBARQUE_EN_DESTINO`, con bultos aptos. Un bulto cargado no se vuelve a cargar. El vehículo y el conductor deben pertenecer a la sede del manifiesto cuando la información de sede está disponible.

Los egresos no pueden ser aprobados por su solicitante. Cuando `afectaCaja=true`, la aprobación exige una caja `ABIERTA` de la misma sede. Los usuarios normales operan únicamente en su sede; `SUPERADMIN`, `SUPERVISOR` y `AUDITOR` tienen lectura global según la política, mientras que `AUDITOR` permanece fuera de las mutaciones operativas.

## Cambios de esquema

| Migración | Descripción |
|---|---|
| `1710000014000-ExtendDeliveryReturnStatesV5.ts` | Extiende el enum físico de detalles de reparto con estados de retorno |
| `1710000015000-AddAuditSiteDateIndexV5.ts` | Agrega el índice de consulta de auditoría por sede y fecha |

El nombre físico del enum de retorno es `planillas_reparto_detalles_estado_enum`. Las migraciones V1–V4 se conservan.

## Validación y calidad

La última ejecución pasó **7 suites y 20/20 pruebas unitarias backend**, build NestJS, lint frontend, TypeScript, build Next.js de **25 rutas**, migraciones sin pendientes, seed idempotente y smoke HTTP real. El registro reproducible está en `VALIDACION_HTTP_SMOKE_V5.sh` y la evidencia saneada en `VALIDACION_HTTP_SMOKE_V5.txt`.

## Estado residual

| Clasificación | Elementos |
|---|---|
| Implementado | Flujos críticos de reparto, egresos, manifiesto, llegada, desembarque, entrega/POD, dashboard/reportes API, configuración, auditoría y RBAC de endpoints principales |
| Parcial | Cobertura visual completa de Transbordo e Inventario; ciertos módulos legacy todavía conservan DTOs amplios o pantallas Demo históricas |
| Pendiente | E2E automatizado de navegador, pruebas de carga/concurrencia, recuperación ante fallas, pruebas de restauración, retención formal de auditoría y revisión de aceptación por sede |
| Bloqueado por dependencia externa | Emisión legal SUNAT/GRE real: credenciales, certificado, firma XML, homologación, endpoints, numeración, CDR y configuración tributaria |

Las credenciales seed continúan siendo de desarrollo y deben rotarse antes de cualquier despliegue. La compilación y el smoke local no equivalen a certificación productiva.

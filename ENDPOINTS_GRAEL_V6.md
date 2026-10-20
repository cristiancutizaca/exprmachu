# Endpoints GRAEL V6

Prefijo de negocio: `/api/v1`. Autenticación: `Authorization: Bearer <JWT>` salvo health, Swagger y tracking público. Los guards del backend determinan RBAC y sede efectiva.

| Grupo | Endpoints V6 relevantes | Estado |
|---|---|---|
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` | **IMPLEMENTADO** |
| Inventario | `GET /inventario/bultos`, `GET /inventario/movimientos`, `POST /inventario/movimientos` | **IMPLEMENTADO** |
| Reportes | `/reportes/dashboard`, `/resumen-mes`, `/comparativo`, `/pendientes-cobro`, `/por-mercaderia` | **IMPLEMENTADO** |
| Transbordo | `GET/POST /transbordo`, detalle, tickets, estado, CSV, `PATCH /:id/flota` | **IMPLEMENTADO** |
| Desembarque | `POST /desembarque/sesiones`, `GET /sesiones/:id/resumen`, `POST /sesiones/:id/bultos`, `POST /sesiones/:id/cerrar` | **IMPLEMENTADO** |
| Incidencias | `GET /incidencias`, `POST /incidencias`, `PATCH /:id/resolver` | **IMPLEMENTADO** |
| Manifiesto | listado, alta, tickets, carguío, flota, despacho, llegada, resumen | **IMPLEMENTADO** |
| GRE/CPE | `POST /gre/emitir` | **MOCK** persistente |
| SUNAT | proveedor real | **BLOQUEADO EXTERNO** |

Las respuestas de error de reglas críticas incluyen mensaje en español y, cuando es necesario para UI/UAT, código de dominio como `BULTO_NOT_IN_MANIFEST`, `CROSS_SITE_MOVEMENT_FORBIDDEN` o `UNLOADING_DIFFERENCE_REQUIRES_AUTHORIZATION`.

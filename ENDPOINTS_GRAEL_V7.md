# ENDPOINTS_GRAEL_V7

Todas las rutas de negocio usan el prefijo `/api/v1` y requieren JWT salvo health y tracking público. Los DTOs se validan mediante `ValidationPipe` con whitelist; los UUID críticos usan `ParseUUIDPipe`.

| Método | Ruta | Roles | Scope | Errores relevantes |
|---|---|---|---|---|
| GET | `/health` | Público | N/A | 503 si DB no disponible |
| POST | `/auth/login` | Público | N/A | credenciales inválidas, rate limit |
| GET | `/auth/me` | JWT | Usuario | 401 |
| PATCH | `/auth/password` | JWT | Propio | password actual inválido, política |
| PATCH | `/auth/users/:id/reset-password` | Admin/Supervisor/Superadmin | Sede según política | 403, usuario no encontrado |
| GET | `/tickets` | Roles de lectura | recepción/destino/custodia | 400 DTO, 403 sede |
| PATCH | `/tickets/:id/pagar` | Admin/Cajero/Supervisor/Superadmin | sede de cobro/caja | 409 saldo, caja requerida, 403 |
| GET | `/inventario/bultos` | Admin/Supervisor/Almacén | `sedeActualId` | 403 cross-site |
| POST | `/inventario/movimientos` | Admin/Supervisor/Almacén | misma sede | almacén/ubicación incompatibles |
| GET | `/manifiesto` | Admin/Supervisor/Almacén/Auditor lectura | origen/destino según fase | 403 sede |
| POST | `/manifiesto` | Admin/Supervisor/Almacén | sede origen | DTO, flota/sede |
| POST | `/manifiesto/:id/cargar` | Operador autorizado de origen | origen | bulto ajeno/estado |
| POST | `/manifiesto/:id/despachar` | Admin/Supervisor/Almacén | origen | transición inválida |
| POST | `/manifiesto/:id/llegada` | Admin/Supervisor/Almacén | destino | transición inválida |
| GET | `/transbordo` | Admin/Supervisor/Almacén/Auditor lectura | sede de operación | 403 |
| POST | `/transbordo` | Admin/Supervisor/Almacén | sede transbordo | origen/destino/flota |
| POST | `/desembarque/sesiones` | Admin/Supervisor/Almacén | sede destino | manifiesto no LLEGADO |
| POST | `/desembarque/sesiones/:id/bultos` | Admin/Supervisor/Almacén | sesión/sede destino | not found, extra, estado |
| POST | `/desembarque/sesiones/:id/cerrar` | Admin/Supervisor/Admin sede | destino | diferencia/motivo |
| PATCH | `/desembarque/:id/verificar` | Legacy autorizado | Solo con `legacy=true` | bypass explícito requerido |
| GET | `/incidencias` | Roles de lectura | sede/global según rol | 403 |
| PATCH | `/incidencias/:id/resolver` | Roles autorizados | sede de incidencia | estado inválido |
| GET | `/comprobantes` | Admin/Cajero/Supervisor/Auditor lectura | recepción/custodia | paginación, 403 |
| PATCH | `/comprobantes/:id/anular` | Admin/Cajero/Supervisor/Superadmin | sede relevante | motivo, estado, cross-site |
| POST | `/gre/emitir` | Política GRE | ticket/manifiesto/sede | `SUNAT_NOT_CONFIGURED` si externo |
| GET | `/tracking/public/:codigo` | Público | Datos públicos mínimos | rate limit, not found |

La respuesta de errores incluye `statusCode`, `requestId`, `code`, `message` y `details` cuando aplica. Las operaciones financieras y físicas deben registrar sus movimientos y auditoría dentro de la transacción correspondiente.

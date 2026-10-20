# PANTALLAS_GRAEL_V7

| Ruta | Objetivo | Roles principales | Fuente | Estado |
|---|---|---|---|---|
| `/login` | Autenticación | Todos | Auth API o Demo explícito | Implementado y Playwright PASS |
| `/dashboard` | KPIs operacionales/financieros | Todos según RBAC | Reportes API; Demo separado | Implementado |
| `/recepcion` | Crear recepción/ticket | Operador/Admin/Supervisor | APIs de tickets, clientes, destinos, tarifas | Implementado; E2E de ticket nuevo pendiente |
| `/busqueda` | Buscar y operar ticket | Según rol | Tickets API | Implementado; QA completo pendiente |
| `/busqueda-qr` | Consultar QR/bulto | Operativos permitidos | Tracking/inventario API | Implementado; QA pendiente |
| `/manifiesto` | Tramos, flota, carguío, despacho/llegada | Almacén/Admin/Supervisor | Manifiesto API | Implementado; E2E pendiente |
| `/transbordo` | Cambio de tramo/flota | Almacén/Admin/Supervisor | Transbordo API | Parcial: UI de cadena completa pendiente |
| `/desembarque` | Sesión física por bulto | Almacén/Admin/Supervisor | Desembarque API | Implementado; E2E físico pendiente |
| `/inventario` | Custodia y movimientos | Almacén/Admin/Supervisor | Inventario API | Implementado; E2E pendiente |
| `/reparto` | Planilla y última milla | Repartidor/Admin | Reparto API o Demo explícito | Implementado; E2E pendiente |
| `/entregas` | POD y entrega | Repartidor/Admin | Entregas API o Demo explícito | Implementado; E2E pendiente |
| `/incidencias` | Consultar/resolver excepciones | Según RBAC | Incidencias API | Implementado |
| `/caja-diaria` | Apertura/cierre/movimientos | Cajero/Admin/Supervisor | Pagos/Caja API | Implementado; carrera de cierre pendiente |
| `/pago-sin-comprobante` | Cobro sin emitir CPE | Cajero/Admin/Supervisor | Tickets/Pagos/Caja API; Demo separado | Implementado; carrera pendiente |
| `/comprobantes` | Consulta/anulación local | Cajero/Admin/Supervisor/Auditor lectura | Comprobantes API | Implementado y smoke/unit PASS |
| `/detraccion` | Cálculo/registro local | Cajero/Admin/Supervisor | Demo; JWT muestra pendiente | Parcial |
| `/bolsa` | Agrupación operativa histórica | Admin/Supervisor | Demo/legacy | Pendiente de integración real |
| `/reportes` | Reportes scoped | Roles autorizados | Reportes API | Implementado |
| `/configuracion` | Parámetros, catálogos y seguridad | Admin/Supervisor | APIs según tab; fallback explícito | Parcial |
| `/auditoria` | Consulta de eventos | Auditor/Admin/Supervisor | Auditoría API | Implementado; QA visual pendiente |
| `/tracking` | Consulta pública | Público | Tracking público API | Implementado; QA móvil pendiente |

Todas las pantallas deben conservar estados loading, vacío, error, retry y no activar Demo si una API real falla. Los escenarios marcados pendientes no se cuentan como E2E PASS.

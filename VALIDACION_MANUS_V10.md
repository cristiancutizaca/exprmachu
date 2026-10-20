# VALIDACION_MANUS_V10

## 1. Alcance y principio de evidencia

Esta validación corresponde al worktree derivado de `GRAEL_MANUS_V9_FINAL.zip`. Los resultados de esta documentación provienen de ejecuciones locales reproducibles sobre PostgreSQL 16, API Nest real y frontend Next real. No se presentan smokes HTTP como E2E nacional, ni GRE/CPE MOCK como SUNAT, ni mediciones locales como carga productiva.

## 2. Baseline técnico

| Prueba | Comando/alcance | Resultado |
|---|---|---|
| Backend build | `cd grael-backend && npm run build` | **PASS** |
| Backend unitario | `npm run test:unit` | **17 suites, 64 tests PASS** |
| Frontend lint | `npm run lint` | **PASS** |
| Frontend TypeScript | `npx tsc --noEmit` | **PASS** |
| Frontend build | `npm run build` | **PASS** |
| Migraciones | `npm run seed:fresh` | **26 migraciones aplicadas** |
| Health | `GET /health` | **HTTP 200, DB ok** |

Los logs se encuentran en `validation/v10/`.

## 3. Smoke operacional V10

`node scripts/smoke-core-v10.mjs` terminó con código 0. La corrida verificó Caja con apertura 201, movimiento de efectivo 201, movimiento Yape 201, resumen HTTP 200 con efectivo esperado 120 y total digital 50, y cierre 201 en estado CERRADA. También verificó incidencia derivada de custodia, AUDITOR bloqueado con 403 `ROLE_FORBIDDEN`, resolución de Supervisor con disposición `REINGRESADO_ALMACEN`, Entrega creada y confirmada, duplicado bloqueado con 409 `DELIVERY_ALREADY_CLOSED`, GRE MOCK aceptado con hash de 64 caracteres y CPE MOCK aceptado con contrato de numeración compartido.

## 4. Concurrencia automática

`CONCURRENCY_WIDTH=10 node scripts/test-concurrency-v10.js` terminó con código 0. El fixture selecciona usuarios, sedes, tickets y bultos desde el seed/API; no depende de IDs codificados. El resultado fue el siguiente:

| Escenario | Solicitudes | Aceptadas | Rechazadas | HTTP 5xx | Unicidad |
|---|---:|---:|---:|---:|---:|
| Apertura de Caja del mismo cajero | 10 | 1 | 9 | 0 | N/A |
| Cierre de la misma sesión | 10 | 1 | 9 | 0 | N/A |
| Pago concurrente del mismo ticket | 10 | 1 | 9 | 0 | N/A |
| GRE en la misma sede | 10 | 10 | 0 | 0 | 10 números únicos |
| CPE en la misma sede | 10 | 10 | 0 | 0 | 10 números únicos |
| Entrega duplicada del mismo bulto | 10 | 1 | 9 | 0 | N/A |

Esta cobertura demuestra las carreras implementadas, pero no equivale a una certificación de concurrencia bajo carga nacional o infraestructura distribuida.

## 5. E2E de interfaz

Playwright ejecutó 4 tests con un navegador Chromium real y frontend servido por Next: login real, drawer overlay y logout; navegación a comprobantes y detracción sin fallback silencioso; Búsqueda QR y popup real; y Caja Diaria con apertura, movimiento y cierre. Resultado observado: `4 passed`.

No se ejecutó como aprobado un viaje nacional integral con rutas Lima→Arequipa→Cusco, transbordos físicos multi-tramo y POD en sedes separadas. Ese alcance permanece pendiente.

## 6. Integridad de datos

`validation/v10/integrity-v10-final.log` terminó con cero violaciones en los checks ejecutables: bulto sin ticket, sede/almacén incompatible, ubicación incompatible, pago sin sede, pagos superiores al total, ticket pagado con saldo, desembarque sin movimiento, referencias incompletas, comprobante sin ticket, movimiento de Caja sin sesión, movimiento de Caja con sede inválida, bulto final sin Entrega, incidencia resuelta sin disposición y series documentales duplicadas.

El script es de solo lectura. La base seed fue corregida para que los bultos que nacen ENTREGADO tengan POD histórico asociado, evitando una inconsistencia de fixture.

## 7. Backup y restore

Se ejecutó `pg_dump` en formato custom y `pg_restore` a `grael_v10_restore_db`. Los conteos coincidieron: 6 tickets, 24 bultos, 4 pagos, 2 movimientos de Caja, 3 Entregas, 2 series documentales y 26 migraciones. El dump temporal fue eliminado y no forma parte del paquete.

## 8. Performance local

`PERF_REQUESTS=30 node scripts/performance-v10.js` se ejecutó con Supervisor y sin errores HTTP. La corrida mide solicitudes secuenciales sobre health, dashboard, inventario y transbordo. Es evidencia de funcionamiento local, no una prueba de dataset grande ni de concurrencia 25/50/100 usuarios.

## 9. Seguridad y dependencias

Nest respondió con Helmet, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, HSTS y `X-Request-Id`. La preflight desde `http://127.0.0.1:3003` devolvió 204 y `Access-Control-Allow-Origin` explícito. Login conserva rate limiting en memoria para control local.

`npm audit` observó 27 vulnerabilidades backend —3 low, 16 moderate y 8 high— y 8 frontend —7 high y 1 critical—. Los JSON completos están en `validation/v10/security/`. No se ejecutó `npm audit fix --force`; se requiere revisión de la cadena de dependencias antes de exposición externa.

## 10. Funciones externas y pendientes

GRE/CPE continúan **MOCK** porque el entorno no aporta credenciales, certificado, homologación, endpoint productivo ni CDR. Detracción queda limitada al cálculo y mensaje de integración pendiente. Catálogos empresariales avanzados, despliegue productivo, monitoreo persistente y el E2E nacional multi-sede integral requieren una nueva ronda.

## 11. Archivos de evidencia

| Evidencia | Archivo |
|---|---|
| Build/Jest backend | `validation/v10/backend-build-final.log`, `backend-jest.log` |
| Build/lint/TS frontend | `validation/v10/frontend-build.log`, `frontend-lint.log`, `frontend-tsc.log` |
| Smoke | `validation/v10/smoke-core-v10-final.log` |
| Concurrencia | `validation/v10/concurrency-v10-final.log` |
| Integridad | `validation/v10/integrity-v10-final.log` |
| Performance | `validation/v10/performance-v10-final.log` |
| Playwright | `validation/v10/playwright-v10-final-clean.log` |
| Backup/restore | `validation/v10/backup-restore/` |
| Seguridad/audit | `validation/v10/security/` |

## 12. Aceptación

NO PREPARADO PARA UAT OPERACIONAL INTEGRAL CONTROLADO

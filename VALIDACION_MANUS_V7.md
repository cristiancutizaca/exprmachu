# VALIDACION_MANUS_V7

## Resumen ejecutivo

GRAEL V7 fue trabajado directamente sobre la copia oficial V6 en un worktree independiente. El stack se conservó. Se implementaron correcciones de modelo nacional multisede, comprobantes, pagos, desembarque físico, protección legacy, seguridad básica, separación Demo/real y herramientas de validación.

## Resultados medidos

| Área | Resultado |
|---|---|
| Backend build | PASS |
| Backend Jest completo | 15 suites, 43 tests PASS, 0 FAIL, 0 SKIP |
| Frontend lint | PASS |
| Frontend TypeScript | PASS |
| Frontend build | PASS; 26 rutas |
| Migraciones | PASS local; 22 filas en `migrations` |
| Seed doble | PASS local; sin duplicaciones observadas |
| HTTP smoke V7 | PASS en endpoints implementados por el script |
| Playwright | 2 tests PASS |
| Integridad | Todos los checks ejecutados con violations=0 |
| Backup | Dump custom PASS |
| Restore drill | PASS en `grael_v7_restore`; conteos 7/25/4/22 conservados |
| Concurrencia | Login concurrente 20/20 PASS; negocio financiero/documental pendiente |
| Performance | Baseline local p50/p95 medido; no benchmark productivo |

## Cambios críticos

La recepción, custodia, destino y cobro ahora se modelan como dimensiones separadas. `TicketAccessPolicy` evita repetir reglas de acceso. El pago transaccional bloquea ticket/caja y rechaza sobrepago. El desembarque registra movimiento físico, incidencias, tracking y auditoría. Comprobantes tienen scope, DTO, paginación y anulación local `ANULADO_MOCK`. Las rutas legacy no funcionan sin `legacy=true` explícito. Detracción y Bolsa no presentan simulaciones como operación real en JWT.

## Estados de entrega

**IMPLEMENTADO Y PROBADO:** builds, tests descubiertos, migraciones/seed local, smoke definido, login/drawer/logout Playwright, integridad y restore drill. **IMPLEMENTADO:** core nacional multisede, locks de pago, desembarque físico, comprobantes, password, security headers y scripts. **PARCIAL:** E2E nacional completo, transbordo UI de cadena completa, carreras financieras/documentales, detracción local, Bolsa, QA visual de todas las rutas y dataset grande. **MOCK:** GRE/CPE persistente local. **PENDIENTE:** aceptación humana UAT, carga 1000/3000, pruebas de carrera de negocio y operación productiva. **BLOQUEADO EXTERNO:** SUNAT real.

## Veredicto

El sistema queda **PARCIAL** respecto del objetivo de preparación integral para UAT. No se declara producción nacional ni UAT integral porque todavía faltan escenarios nacionales nuevos de extremo a extremo, fixtures para carreras financieras/documentales y aceptación humana en sede. Todos los resultados marcados PASS corresponden a comandos ejecutados y no a una inferencia visual.

# ACCEPTANCE_GRAEL_V7

## Criterio de decisión

GRAEL V7 debe considerarse preparado para UAT únicamente si el core, el esquema, la seguridad, los flujos nacionales, las pruebas de navegador, las carreras financieras y el restore están verificadas con evidencia real. Un build exitoso no sustituye las demás comprobaciones.

| Criterio | Evidencia actual | Estado |
|---|---|---|
| Backend build | `npm run build` | PASS |
| Frontend lint/tsc/build | Ejecutado con 26 rutas | PASS |
| Tests unitarios descubiertos | 15/15 suites, 43/43 tests | PASS |
| Migraciones limpias/upgrade | 22 migraciones en DB local | PASS local |
| Seed doble | Ejecutado | PASS local |
| Smoke principal | Script V7 ejecutado | PASS definido |
| Login/drawer/logout E2E | 2 casos Playwright | PASS |
| Flujo nacional completo | Sin fixture nuevo completo | PENDIENTE |
| Pago concurrente real | Sin race fixture | PENDIENTE |
| Correlativos concurrentes | Sin corrida dedicada | PENDIENTE |
| Backup/restore aislado | Conteos 7/25/4/22 comparados | PASS local |
| Integración SUNAT | Sin credenciales/endpoint/certificado | BLOQUEADO EXTERNO |

## Veredicto

**NO PREPARADO PARA UAT INTEGRAL NACIONAL.** Técnicamente existe una base V7 funcional para continuar pruebas controladas de módulos y ejecutar una UAT acotada, pero no se puede declarar “PREPARADO PARA UAT CONTROLADO” según los mínimos del prompt mientras falten el escenario nacional completo con datos nuevos, las carreras financieras/documentales y la validación humana de todos los actores.

# CHANGELOG_MANUS_V7

## Resumen

GRAEL V7 continúa la base oficial GRAEL V6 y concentra el cierre del core nacional multisede, la protección de operaciones reales y la preparación de validaciones reproducibles. No se cambió el stack ni se creó un proyecto nuevo.

## Cambios de backend

Se formalizaron las dimensiones de sede de recepción, destino operativo y cobro mediante migración TypeORM incremental y backfill seguro. `TicketAccessPolicy` centraliza lectura por recepción, destino y custodia. Inventario, manifiesto y transbordo aplican semánticas diferentes según la fase operacional; el transbordo valida la sede actual del bulto y no la sede histórica del creador.

El desembarque físico registra sesión y bulto, movimiento `INGRESO_DESEMBARQUE`, actualización física, tracking, auditoría e incidencias para faltantes, extras y dañados. Los endpoints legacy requieren `legacy=true` explícito. Pagos usan locks pesimistas sobre ticket/caja, sede de cobro persistida y rechazo de sobrepago. Comprobantes ahora usan DTO, UUID, paginación, scope y anulación local `ANULADO_MOCK` con motivo y AuditLog. Se agregaron Helmet y rate limiting básico para login/tracking público.

Auth V7 incorpora cambio y reset administrativo de contraseña con bcrypt, política mínima y auditoría. GRE mantiene proveedor MOCK persistente con correlativo documental local; SUNAT no se presenta como integrado.

## Cambios de frontend

El Sidebar filtra por rol y conserva badges mock solo en Demo. La pantalla Pago sin comprobante consulta tickets/caja reales en JWT y reserva la simulación a Demo. Detracción deja de fingir declaración SUNAT: en JWT real muestra integración pendiente y no usa `TICKETS_DB`. Comprobantes usan consulta server-side, CSV de página, representación HTML descargable, impresión y anulación real al API. Se añadieron pruebas Playwright para login, drawer, logout y navegación real.

## Validación

La última ejecución backend terminó con 15 suites y 43 tests PASS. Frontend terminó con lint, TypeScript y build PASS y 26 rutas. Smoke HTTP V7, integridad, restore drill local y baseline de rendimiento se ejecutaron y están descritos en los archivos de validación. Playwright final terminó con 2 tests PASS. La concurrencia financiera/documental integral permanece parcial porque requiere fixtures de mutación aislados.

## Estados

**IMPLEMENTADO Y PROBADO:** build/test backend, build frontend, login/drawer/logout E2E, smoke HTTP definido, integridad local y restore drill aislado. **IMPLEMENTADO:** dimensiones multisede, scope, pagos con locks, desembarque físico, comprobantes y APIs de contraseña. **PARCIAL:** flujo nacional completo E2E, UI completa de transbordo, detracción local, carreras financieras/documentales y QA visual de todas las rutas. **MOCK:** GRE/CPE local persistente. **PENDIENTE:** carga 1000/3000, concurrencia de negocio con fixtures, aceptación UAT humana. **BLOQUEADO EXTERNO:** SUNAT real.

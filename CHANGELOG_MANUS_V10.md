# CHANGELOG_MANUS_V10

## Base y alcance

V10 se construyó directamente desde `GRAEL_MANUS_V9_FINAL.zip`, preservando Next.js 14.2.3, NestJS 10, TypeORM 0.3, PostgreSQL y la arquitectura monolítica existente. No se creó un proyecto nuevo, no se cambió el stack y no se incorporó infraestructura distribuida.

## Implementado

| Área | Cambio V10 | Estado |
|---|---|---|
| Caja y pagos | `MovimientoCaja` queda como ledger de la sesión; pagos digitales no inflan efectivo; pagos usan sede persistida y Caja concreta; locks pesimistas en apertura/cierre/movimiento | **IMPLEMENTADO Y PROBADO** |
| Egresos | Locks y orden transaccional Egreso→Caja, estados idempotentes y reverso condicionado a impacto financiero | **IMPLEMENTADO** |
| Bultos | `sedeActualId` se inicializa desde recepción; corrección administrativa no crea tracking físico falso | **IMPLEMENTADO Y PROBADO** |
| Tracking | Consulta y escritura consideran custodia, sede, almacén, ubicación y manifiesto compatibles | **IMPLEMENTADO** |
| Entrega | Una entrega activa/final por bulto; máquina de estados, lock de bulto y rechazo HTTP 409 de duplicados | **IMPLEMENTADO Y PROBADO** |
| Incidencias | Campo `disposicion`, migración aditiva, resolución física transaccional y auditoría | **IMPLEMENTADO Y PROBADO** |
| Seed | Los bultos seed que nacen ENTREGADO tienen Entrega/POD ENTREGADA asociada | **IMPLEMENTADO Y PROBADO** |
| GRE/CPE | `SerieDocumento` persistida por sede, correlativo bloqueado, hash SHA-256 y continuidad de emisión MOCK | **IMPLEMENTADO Y PROBADO / MOCK** |
| Frontend | CORS local IPv4 permitido; Configuración no ofrece edición real a roles sin autorización; build y E2E UI corregidos | **IMPLEMENTADO Y PROBADO** |
| Concurrencia | Runner automático V10 con fixture descubierto desde seed y diez solicitudes por escenario | **IMPLEMENTADO Y PROBADO** |
| Integridad | Chequeos V10 de ledger, POD, disposición y series añadidos al script de solo lectura | **IMPLEMENTADO Y PROBADO** |

## Evidencia destacada

La suite backend terminó con 17 suites y 64 tests PASS. Frontend terminó lint, TypeScript y build PASS. Playwright terminó 4 tests PASS sobre login real, drawer, navegación, QR y ciclo de Caja. El smoke V10 verificó apertura/movimiento/cierre de Caja, efectivo esperado 120, digital 50, incidencia con disposición, AUDITOR bloqueado, Entrega y duplicado HTTP 409, GRE MOCK con hash de 64 caracteres y CPE MOCK con contrato de numeración.

La concurrencia automática con ancho 10 observó un único ganador y nueve rechazos en apertura de Caja, cierre de Caja, pago del mismo ticket y creación duplicada de Entrega. GRE y CPE aceptaron diez emisiones con diez números únicos por escenario. Integridad final observó cero violaciones en los checks ejecutables. El restore comparó 6 tickets, 24 bultos, 4 pagos, 2 movimientos de Caja, 3 Entregas, 2 series y 26 migraciones.

## Pendientes o límites

La emisión GRE/CPE permanece **MOCK** y no es homologación SUNAT. No se ejecutó un E2E nacional integral con tránsito físico Lima→Arequipa→Cusco. Performance fue una medición local de 30 solicitudes secuenciales por endpoint, no una prueba de carga representativa. La auditoría de dependencias conserva 27 vulnerabilidades backend —3 low, 16 moderate y 8 high— y 8 frontend —7 high y 1 critical—; no se aplicó `npm audit fix --force`. La configuración empresarial conserva catálogos avanzados pendientes de una ronda posterior.

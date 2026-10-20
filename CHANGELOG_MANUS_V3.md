# CHANGELOG_MANUS_V3

## Resumen

GRAEL V3 convierte la base V2 en una base instalable y verificable sobre PostgreSQL real. Se conserva el código útil de V1/V2 y se agregan migraciones de instalación limpia, compatibilidad incremental, inventario persistente, endurecimiento de dominio, conexión de pantallas operativas y evidencias reproducibles.

## Cambios implementados

### 1. Persistencia y migraciones

Se creó `1709999999000-CreateBaseSchemaV1.ts` como base compatible para PostgreSQL vacío. Incluye extensión `uuid-ossp`, enums, tablas V1 necesarias, relaciones posteriores y compatibilidad para tickets, clientes, usuarios, destinos, programaciones, comprobantes, pagos y desembarques.

Se corrigió la doble responsabilidad de `audit_logs`: la migración núcleo ya no crea la tabla y `1710000003000-CreateAuditLogs.ts` es su único propietario. Las migraciones de incidencias, entregas y caja usan bloques PL/pgSQL seguros para crear enums y constraints sin `CREATE TYPE IF NOT EXISTS` inválido.

Se añadieron `1710000005000-LinkUsersToSedes.ts`, `1710000006000-NormalizePaymentMethodEnum.ts`, `1710000007000-NormalizeTypeOrmColumnNames.ts` y `1710000008000-CreateWarehouseMovements.ts`. Estas migraciones enlazan usuarios a sedes, normalizan métodos de pago, corrigen nombres físicos camelCase de TypeORM y crean movimientos persistentes de almacén.

La configuración TypeORM deja `DB_SYNC=false` como valor predeterminado. La sincronización automática solo puede habilitarse de forma explícita y no sustituye migraciones revisadas.

### 2. Seguridad y autenticación

`JWT_SECRET` ya no tiene fallback silencioso en `AuthModule` ni `JwtStrategy`. El backend rechaza valores ausentes o `CAMBIAR_ESTO`. El JWT y `/auth/me` incluyen `sedeId` cuando está disponible, conservando el campo `sede` legacy durante la transición.

Se corrigió el seed para enlazar usuarios a sedes reales. Pagos y caja sanitizan relaciones de usuario para no devolver hashes de contraseña. La apertura de caja valida que el usuario opere su propia sede, salvo Supervisor. Se reforzaron guards de roles en tickets y bultos.

### 3. Tickets, tarifas y pagos

TicketsService usa advisory lock transaccional para correlativos por serie, devuelve la entidad creada con el mismo EntityManager y registra auditoría de recepción. La tarifa vigente de ruta/configuración es obligatoria; la tarifa manual exige rol `ADMIN_SEDE` o `SUPERVISOR`, precio positivo, motivo y registro de auditoría.

La actualización genérica de tickets dejó de aceptar mass assignment. Campos económicos, pago, anulación y estado se modifican solamente por endpoints específicos. La anulación calcula pagos reales dentro de transacción y rechaza tickets con dinero registrado en lugar de basarse solo en un booleano.

El pago parcial valida método y monto, exige caja abierta para efectivo/Yape/Plin y crea `Pago`, `MovimientoCaja`, actualización de saldo y auditoría de forma atómica.

### 4. Bultos, inventario y tracking

La creación de bultos ya no copia el body completo sobre la entidad. Solo admite campos físicos/documentales permitidos y fuerza estado inicial `RECEPCIONADO`. Los estados siguen un workflow validado y cada transición crea un evento append-only.

Se creó `MovimientoAlmacen` y `InventarioModule` con listado de bultos, historial de movimientos y movimiento transaccional a almacén/ubicación. El movimiento actualiza estado, sede, almacén, ubicación y tracking dentro de la misma transacción.

### 5. Manifiestos y despacho

ManifiestoService valida que los tickets compartan origen/destino con el manifiesto. Se añadió resumen de carga y endpoint de escaneo de bulto. El despacho rechaza manifiestos con bultos pendientes, exige vehículo/conductor activos y transfiere únicamente bultos cargados a `EN_TRANSITO` dentro de transacción.

El cierre normal de manifiesto bloquea cargas incompletas. Los correlativos de manifiesto y CPE usan advisory locks.

### 6. GRE/CPE

GreService conserva proveedor `MOCK` explícito, rechaza tickets anulados, genera XML local escapado y persiste CPE mock. La numeración CPE se obtiene bajo advisory lock y transacción. Si `GRE_PROVIDER=SUNAT`, responde dependencia no disponible porque la integración legal requiere credenciales, certificado, firma, homologación, CDR y endpoints configurados.

### 7. Frontend

Se conectaron al API real, conservando Demo explícito, las pantallas de Manifiesto, Búsqueda QR, Inventario, Desembarque y Comprobantes. Caja Diaria y Tracking ya contaban con conexión real. Se añadieron contratos Axios para inventario, desembarque, comprobantes y carguío de manifiesto.

Las pantallas real/Demo muestran el modo operativo de forma explícita y no sustituyen un error de API por datos mock cuando existe JWT real.

### 8. Pruebas y verificación

Se añadió `gre.service.spec.ts`. La suite unitaria final cubre workflow de tickets, creación/transición de bultos, pagos/caja y GRE/CPE: **4 suites y 11 tests PASS**.

Se validaron migraciones sobre PostgreSQL 16 real en base limpia y base incremental. El seed se ejecutó dos veces sin errores. También se realizaron smoke tests HTTP de health/login/JWT, recepción transaccional, pago parcial con movimiento de caja, CPE mock e itinerario manifiesto → almacén → carguío → despacho.

## Estados de alcance

| Área | Estado | Evidencia o límite |
|---|---|---|
| Instalación limpia PostgreSQL | Implementado y validado | 10 migraciones y seed en `grael_v3_clean` |
| Actualización incremental V2→V3 | Implementado y validado | Migraciones 5000–8000 sobre `grael_db` |
| Recepción, bultos y tracking | Implementado y probado | Smoke HTTP y transacciones backend |
| Inventario de almacén | Implementado y probado | Movimiento persistente y tracking |
| Manifiesto/carguío/despacho | Implementado y probado | Rechazo incompleto y despacho cargado |
| Pagos parciales/caja | Implementado y probado | Pago parcial, saldo y movimiento |
| GRE/CPE mock | Implementado y probado | XML y CPE persistido |
| SUNAT legal | Pendiente/bloqueado por dependencia externa | Credenciales, certificado, homologación y endpoint |
| E2E automatizado de navegador | Parcial | Smoke HTTP y builds; falta campaña Playwright/Cypress |
| Concurrencia/carga | Parcial | Advisory locks implementados; falta prueba multiproceso/load test |
| Producción | Pendiente | Secrets, backups, observabilidad, despliegue y revisión operativa |

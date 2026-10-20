# CHANGELOG_MANUS_V2

## Resumen

Esta entrega convierte la base V1 estabilizada de GRAEL en una base operativa V2 orientada a transporte nacional por sedes. Se conservaron las funciones útiles existentes, se mantuvo el modo Demo explícito y se añadieron controles de estado, trazabilidad, roles, auditoría y operaciones de caja.

## Cambios funcionales

| Área | Cambios V2 | Estado |
|---|---|---|
| Base de datos | Entidades `Sede`, `Almacen`, `UbicacionAlmacen`, `Vehiculo`, `Conductor`, `Tarifa`, `Bulto`, `TrackingEvento`, `AuditLog`, `Incidencia`, `Entrega`, `CajaSesion` y `MovimientoCaja` | Implementado |
| Recepción | Creación transaccional de ticket y bultos, cálculo backend por tarifas vigentes, IGV configurable, GRR y QR local | Implementado |
| Bultos | Alta, estados con transiciones válidas, etiqueta HTML imprimible y payload QR local | Implementado |
| Tracking | Historial append-only, eventos por cambio operativo y endpoint público sanitizado por código | Implementado |
| Manifiesto | Correlativo protegido con advisory lock, validación de flota activa, asociación de tickets y despacho transaccional | Implementado |
| Transbordo | Flota V2, correlativo seguro, workflow y eventos de tracking al cambiar estado | Implementado |
| Desembarque | Actualización transaccional de bultos y tracking de llegada/desembarque | Implementado |
| Incidencias | Nuevo módulo para creación, listado y resolución | Implementado |
| Entregas | Nuevo módulo para confirmar entrega e intento fallido, actualizar bultos y cerrar ticket | Implementado |
| Pagos | Pagos parciales, saldo pendiente, auditoría de alta/anulación/pago | Implementado |
| Caja | Apertura, consulta de sesión actual, ingreso/egreso, saldo esperado, arqueo y cierre observado/cerrado | Implementado |
| RBAC | `RolesGuard` y `@Roles()` aplicados en manifiesto, caja y GRE/CPE | Implementado |
| GRE/CPE | `GreModule`, `GreService` y `POST /gre/emitir`; XML local mock y persistencia de CPE mock | Mock implementado; SUNAT pendiente |
| Frontend | Cliente Axios V2, tracking público, APIs de manifiesto/incidencias/entregas/caja, Caja Diaria con API real y Demo explícito | Implementado/parcial por pantalla |

## Cambios técnicos

Se mantuvo el prefijo global `/api/v1`, la autenticación Bearer JWT, el interceptor Axios y la limpieza de sesión ante `401`. Se añadió la configuración de caja al cliente frontend mediante `cajaApi.actual`, `cajaApi.abrir`, `cajaApi.movimiento`, `cajaApi.cerrar` y `cajaApi.delDia`.

La emisión GRE/CPE usa `GRE_PROVIDER=MOCK` por defecto. El modo SUNAT no se presenta como funcional: responde con una dependencia explícita de credenciales, certificado, homologación, firma XML, numeración oficial y CDR.

## Migraciones

Se incluyen cinco migraciones V2 en `grael-backend/src/database/migrations/` para núcleo, flota-operaciones, incidencias-entregas, auditoría y caja. La aplicación automática no pudo verificarse en este sandbox porque PostgreSQL no estaba disponible en `localhost:5432`.

## Pruebas añadidas

Se añadieron pruebas de `BultosService` para creación transaccional, rechazo de ticket inexistente/anulado y validación de transiciones. También se añadieron pruebas de `PagosService` para actualización del saldo esperado, rechazo de monto no positivo y cierre observado por diferencia.

La suite final ejecutó tres suites, nueve pruebas y obtuvo **9/9 PASS**.

## Documentos de entrega

| Archivo | Propósito |
|---|---|
| `README.md` | Instalación, flujo V2, endpoints, migraciones, seed y limitaciones |
| `CHANGELOG_MANUS_V2.md` | Registro de cambios de esta evolución |
| `VALIDACION_MANUS_V2.md` | Evidencia de builds, pruebas y dependencia PostgreSQL |
| `VALIDACION_RUNS_MANUS_V2.txt` | Salida reproducible de los comandos de validación |
| `GRAEL_MANUS_V2_FINAL.zip` | Paquete final sin artefactos pesados ni secretos |
| `GRAEL_MANUS_V2_FINAL.zip.sha256` | Hash SHA-256 del paquete final |

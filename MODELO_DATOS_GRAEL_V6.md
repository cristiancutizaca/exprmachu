# Modelo de datos GRAEL V6

## Entidades nuevas y ampliadas

| Entidad | Tabla | Propósito |
|---|---|---|
| `DesembarqueSesion` | `desembarque_sesiones` | Sesión física por manifiesto, sede y destino de almacén |
| `DesembarqueBulto` | `desembarque_bultos` | Resultado por bulto: RECIBIDO, DANADO, EXTRA o FALTANTE |
| `Incidencia` | `incidencias` | Registro operativo de faltantes, daños y diferencias |
| `GreDocumento` | `gre_documentos` | XML, estado y proveedor del documento GRE/CPE |
| `Manifiesto` | `manifiestos` | Custodia de carga, origen/destino, flota y estados |
| `Bulto` | `bultos` | Estado y ubicación física actual |

`desembarque_bultos` tiene restricción única `(sesion_id, bulto_id)` para garantizar idempotencia de escaneo. Al cerrar con diferencia autorizada, cada pendiente recibe un registro FALTANTE, el bulto pasa a FALTANTE cuando corresponde, se crea una Incidencia ABIERTA y se agrega Tracking OBSERVADO.

`gre_documentos.codigo` es único. Para CPE se relaciona opcionalmente con `comprobantes`, y para todos los documentos se guardan ticket, usuario, proveedor, XML, serie/número y estado. El correlativo CPE se calcula dentro de transacción con advisory lock local.

## Migraciones

`1710000016000-CreatePhysicalUnloadingV6.ts` crea tablas, enums, FKs e índices físicos. `1710000017000-CreateGreDocumentsV6.ts` crea la tabla GRE, enum de estados, FKs e índice por ticket/tipo/fecha.

## Integridad

Las claves foráneas protegen ticket, bulto, usuario, sede, almacén y ubicación. Las transiciones críticas se ejecutan mediante `DataSource.transaction`. El modelo no intenta representar aceptación legal SUNAT; el proveedor MOCK es explícito.

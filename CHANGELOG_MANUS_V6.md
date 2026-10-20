# CHANGELOG_MANUS_V6

## Alcance

GRAEL V6 se construyó sobre la copia de trabajo extraída de `GRAEL_MANUS_V5_FINAL.zip`, sin modificar el ZIP oficial ni cambiar el stack. El objetivo fue convertir los controles V5 en un piloto operacional multisede verificable.

## Implementado

Se reforzó el alcance multisede de Inventario, Reportes y Transbordo. Inventario valida sede efectiva, almacén, ubicación y evita movimientos directos cross-site. Reportes aplica sede por `ticket.usuario_creacion_id` con SQL parametrizado. Transbordo exige actor autenticado, sede, compatibilidad de tickets, flota perteneciente a sede y agrega actualización de flota.

Se centralizó la política de roles. `ADMIN_SEDE` puede administrar roles operativos, pero no escalar a `AUDITOR`, `SUPERVISOR` o `SUPERADMIN`. Se añadieron pruebas unitarias para esta regla.

Se endureció Manifiesto: carguío idempotente, llegada separada de desembarque físico y cierre condicionado por bultos desembarcados, observados o faltantes. Se generó QR PNG estable para etiquetas de bulto con payload `GRAEL:BULTO:<codigo>` y escape de valores para impresión.

Se implementó desembarque físico V6 con sesión por manifiesto, destino físico, escaneo idempotente, estados por bulto, movimiento a sede/almacén/ubicación destino, tracking, cierre con motivo y autorización, registro automático FALTANTE e Incidencia por cada pendiente.

Se incorporó persistencia `gre_documentos` para GRE/CPE MOCK, XML, proveedor, estado, correlativo y vínculos al ticket, comprobante y usuario. CPE usa advisory lock para proteger el correlativo local. SUNAT real permanece bloqueado de forma explícita.

El frontend recibió APIs V6 para sede, inventario, reportes y transbordo; Dashboard consume desglose real diario de pagos en sesión JWT; se añadió `/incidencias` y enlace de Sidebar; los badges derivados de datos mock solo aparecen en Demo.

## Validación ejecutada

Backend: build exitoso; **12 suites y 33 pruebas unitarias PASS**. Frontend: lint sin errores, TypeScript sin errores y build Next.js exitoso con **26 rutas**. Base local: migraciones hasta la 19, tablas `desembarque_sesiones`, `desembarque_bultos`, `gre_documentos` y enum GRE verificados. Seed ejecutado dos veces consecutivas con éxito.

## No declarado como completado

No se declara E2E Playwright, prueba de carga, concurrencia, backup/restore, certificación de producción ni homologación SUNAT. La emisión GRE/CPE es **MOCK**, aunque ahora persiste sus documentos y usa correlativo local protegido.

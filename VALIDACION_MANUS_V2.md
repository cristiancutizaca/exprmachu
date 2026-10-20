# VALIDACION_MANUS_V2

## Alcance

Este informe valida la entrega GRAEL V2 sobre la base existente. La validación distingue entre código compilable, pruebas unitarias, integración con base de datos y operación end-to-end. **No se declara que el sistema sea operativo en producción solo por compilar.**

## Resultados ejecutados

| Validación | Resultado | Evidencia |
|---|---:|---|
| Frontend `npm run lint` | PASS, sin warnings ni errores | Registro, sección Frontend Lint |
| Frontend `npx tsc --noEmit` | PASS | Registro, sección Frontend TSC |
| Frontend `npm run build` | PASS, 21 rutas generadas | Registro, sección Frontend Build |
| Backend `npm run build` | PASS | Registro, sección Backend Build |
| Backend `npm run test:unit` | PASS, 3 suites y 9 tests | Registro, sección Unit Tests |
| TypeORM `npm run migration:run` | BLOQUEADO | `ECONNREFUSED` en `::1:5432` y `127.0.0.1:5432` |

El detalle completo y reproducible de la ejecución se conserva en `VALIDACION_RUNS_MANUS_V2.txt`.

## Clasificación del estado

| Categoría | Elementos |
|---|---|
| Implementado | Entidades V2, recepción transaccional, bultos, tracking, manifiesto, despacho, transbordo, desembarque, incidencias, entregas, pagos parciales, caja, RBAC, auditoría, APIs frontend principales, tracking público y GRE/CPE mock |
| Parcial | Conexión API de algunas pantallas secundarias; cierre de caja desde UI todavía conserva el modal visual y debe conectarse a `cajaApi.cerrar` con una sesión real; pruebas E2E y de concurrencia |
| Pendiente | Proveedor SUNAT real, firma XML, CDR, credenciales, certificado digital, homologación, numeración oficial y observabilidad de integración externa |
| Bloqueado por dependencia externa | Aplicación de migraciones, seed real, pruebas de integración y flujo end-to-end, porque el sandbox no tiene PostgreSQL escuchando en el puerto 5432 |

## Cobertura operativa

El backend contiene el flujo objetivo **Login → Recepción → Ticket → Bultos → Almacén → Manifiesto → Vehículo/Conductor → Despacho → Tracking → Transbordo o llegada → Desembarque → Entrega → Pago/Caja** con validaciones de estado y transacciones en las operaciones críticas. El frontend conserva modo Demo explícito para poder revisar las pantallas sin base de datos.

La página pública `/tracking` no exige login y consume el endpoint sanitizado de tracking cuando existe JWT público/consulta permitida. Las mutaciones reales permanecen protegidas por JWT y, en rutas sensibles, por roles.

## Pruebas unitarias

Las pruebas unitarias ejecutadas fueron:

1. `TicketWorkflowService`: transiciones válidas e inválidas del ticket.
2. `BultosService`: creación transaccional con evento, rechazo de ticket inexistente/anulado y transición de estado.
3. `PagosService`: ingreso de caja, validación de monto y cierre observado por diferencia.

El resultado fue **9/9 tests PASS**. Estas pruebas usan mocks y no prueban restricciones reales de PostgreSQL, advisory locks, índices únicos ni aislamiento transaccional entre procesos.

## Limitaciones de integración

El comando de migración fue ejecutado y falló de forma controlada con `ECONNREFUSED`, lo que confirma que la limitación es ambiental y no un error de compilación. Para completar la validación real se debe iniciar PostgreSQL, revisar variables de entorno, ejecutar migraciones, ejecutar el seed y repetir la suite contra una base limpia.

También se requiere validar concurrencia sobre correlativos de manifiestos/transbordos, rollback ante fallos intermedios, permisos por cada rol, carga de archivos/etiquetas si se incorpora impresión real y el flujo completo de pago parcial más cierre de caja.

## GRE/CPE

El endpoint `POST /api/v1/gre/emitir` está implementado con roles `ADMIN_SEDE` y `SUPERVISOR`. En modo `MOCK` genera XML local, devuelve estado `ACEPTADO_MOCK` y registra un CPE mock cuando corresponde. Esto no constituye comprobante legal ni guía electrónica aceptada por SUNAT.

El proveedor real queda bloqueado hasta disponer de credenciales SUNAT, certificado digital, firma XML, ambientes de homologación/producción, numeración autorizada, envío, consulta de CDR, reintentos y monitoreo. El código responde explícitamente como servicio no disponible cuando se selecciona `GRE_PROVIDER=SUNAT` sin esa implementación.

## Conclusión

La entrega V2 queda **lista para revisión técnica y despliegue controlado en un entorno con PostgreSQL**, no para declarar producción nacional sin completar la configuración externa. Los builds y tests son reproducibles y pasan; la base de datos, E2E, concurrencia y SUNAT real permanecen como pasos de puesta en operación.

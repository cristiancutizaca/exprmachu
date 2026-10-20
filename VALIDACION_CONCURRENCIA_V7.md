# Validación de concurrencia V7

## Alcance

La implementación V7 incorpora lock pesimista para el pago de tickets y protección de idempotencia en el escaneo de desembarque. El script `scripts/test-concurrency-v7.js` utiliza requests HTTP simultáneos y no modifica datos salvo que se le entreguen fixtures explícitos mediante variables de entorno.

| Escenario | Requests | Éxitos | Rechazos esperados | Fallos inesperados | Duplicados | Estado |
|---|---:|---:|---:|---:|---:|---|
| Login concurrente | 20 | 20 | 0 | 0 | 0 | **IMPLEMENTADO Y PROBADO** |
| Carrera de pago | No ejecutado | — | — | — | — | **PENDIENTE** |
| Doble escaneo físico | No ejecutado | — | — | — | — | **PENDIENTE** |
| Doble despacho | No ejecutado | — | — | — | — | **PENDIENTE** |
| Doble cierre de caja | No ejecutado | — | — | — | — | **PENDIENTE** |
| Correlativo Ticket/Manifiesto/CPE/GRE | No ejecutado | — | — | — | — | **PENDIENTE** |

La ejecución observada del login concurrente terminó en 20 respuestas HTTP 200, sin errores 5xx ni duplicados identificables. Este resultado prueba la ejecución simultánea del runner, pero no prueba por sí mismo las carreras financieras ni la unicidad de correlativos. Esas pruebas requieren fixtures de mutación dedicados y una base aislada.

## Protecciones implementadas

`TicketsService.pagar` abre una transacción, bloquea el Ticket y la sesión de caja cuando corresponde, recalcula el saldo bajo lock, rechaza montos superiores al saldo con `PAYMENT_EXCEEDS_BALANCE`, valida sede/caja y persiste el pago, movimiento de caja y auditoría dentro de la unidad transaccional. El desembarque físico evita el doble registro mediante la combinación de sesión y bulto y devuelve una respuesta idempotente cuando el registro ya existe.

## Conclusión

La concurrencia fue **PARCIAL**: existen controles de código y se ejecutó un caso HTTP concurrente de login, pero no se declara PASS integral para pagos, caja, entregas, despacho, carguío ni correlativos documentales hasta ejecutar requests simultáneos sobre fixtures aislados.

# Performance GRAEL V6

## Mejoras implementadas

Se agregaron índices para sede/fecha en auditoría, sesión/sede y bulto/fecha en desembarque físico, y ticket/tipo/fecha en GRE. Las consultas de reportes usan parámetros y filtros por sede en SQL, sin interpolar inputs. El correlativo CPE usa advisory lock transaccional para evitar duplicación local.

| Área | Estado |
|---|---|
| Índices V6 | **IMPLEMENTADO Y PROBADO** al aplicar migraciones |
| Consultas SQL parametrizadas | **IMPLEMENTADO** |
| Prueba de carga | **PENDIENTE** |
| Benchmark con datos productivos | **PENDIENTE** |
| Concurrencia de pagos y cierres | **PENDIENTE**; requiere campaña dedicada |
| SLO/SLA productivo | **PENDIENTE** |

No se presenta un número de throughput, latencia p95 ni capacidad de usuarios porque no se ejecutó una medición reproducible de carga en esta entrega.

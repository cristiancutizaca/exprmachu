# Validación de rendimiento V7

## Medición ejecutada

Se ejecutó `scripts/performance-v7.js` contra el backend local con 30 requests secuenciales por endpoint y autenticación real para las rutas protegidas. La medición consume la base PostgreSQL local y no representa infraestructura productiva.

| Endpoint | Requests | Errores | p50 | p95 | Estado |
|---|---:|---:|---:|---:|---|
| `GET /health` | 30 | 0 | 1 ms | 1 ms | **PASS — baseline local** |
| `GET /api/v1/reportes/dashboard` | 30 | 0 | 2 ms | 2 ms | **PASS — baseline local** |
| `GET /api/v1/inventario/bultos?page=1&limit=20` | 30 | 0 | 7 ms | 10 ms | **PASS — baseline local** |
| `GET /api/v1/transbordo?page=1&limit=20` | 30 | 0 | 2 ms | 3 ms | **PASS — baseline local** |

## Medidas de código

Los listados principales usan paginación con límite máximo de 100 en los DTO V6/V7 relevantes. Las búsquedas emplean parámetros SQL y se añadieron índices para las dimensiones nacionales y movimientos físicos donde el modelo lo permite. El frontend conserva tablas compactas y no carga miles de filas en el DOM en los listados revisados.

## Límites

No se ejecutó una prueba de carga con 1000 tickets y 3000 bultos, ni una medición distribuida, ni una prueba de estrés de PostgreSQL, ni un perfilado de N+1 completo sobre dataset grande. Por ello, el rendimiento queda **IMPLEMENTADO Y MEDIDO COMO BASELINE LOCAL**, pero no se declara optimización productiva.

# Plan UAT GRAEL V6

## Objetivo

Validar el piloto con una sede operativa, usuarios reales de prueba y datos controlados, verificando que la interfaz, API, base, RBAC, tracking y auditoría formen una cadena consistente.

| Caso | Actor | Resultado esperado |
|---|---|---|
| Login/me/logout | Todos los roles | JWT válido, sede correcta, logout limpio |
| Crear recepción | OPERADOR | Ticket, bultos, tarifa, tracking y auditoría |
| Cargar manifiesto | ALMACEN | No duplica bulto; estado y tracking coherentes |
| Despachar/llegar | SUPERVISOR/ALMACEN | Estados válidos y sede destino |
| Abrir sesión física | ALMACEN | Solo manifiesto LLEGADO y almacén de sede |
| Escanear bulto | ALMACEN | Idempotencia y movimiento físico al destino |
| Cerrar con faltantes | ADMIN_SEDE/SUPERVISOR | Motivo obligatorio, incidencia y tracking |
| Intento no autorizado | OPERADOR/AUDITOR | 403 o error de regla, sin mutación |
| Reportes por sede | ADMIN_SEDE/SUPERVISOR | No mezcla datos fuera de alcance |
| Pago/caja | CAJERO | Monto, caja, auditoría y cierre observado |
| Reparto/entrega | REPARTIDOR | POD o intento fallido con tracking |

Cada caso debe guardar request/response sanitizado, usuario, sede, hora, IDs de prueba, captura de pantalla y resultado. UAT debe ejecutarse después de backup verificable y con credenciales de prueba rotadas.

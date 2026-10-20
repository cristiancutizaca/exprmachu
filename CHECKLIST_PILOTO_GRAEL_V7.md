# CHECKLIST_PILOTO_GRAEL_V7

## Antes de iniciar

| Control | Evidencia requerida | Estado actual |
|---|---|---|
| Secretos y JWT cambiados | `.env` seguro y fuera del ZIP | Pendiente de entorno piloto |
| Usuarios/roles reales | Nómina aprobada y mínimo privilegio | Pendiente |
| Sedes y destino verificados | Catálogo real con correspondencias | Parcial |
| Almacenes/ubicaciones | CRUD y pertenencia de sede | Implementado; validar datos piloto |
| Tarifas nacionales | Entidad Tarifa vigente | Parcial |
| Vehículos/conductores | Documentos y vencimientos | Pendiente de carga real |
| Impresora/scanner | Prueba física | Pendiente |
| Caja | Apertura, pagos, cierre y diferencias | Unit/smoke; UAT pendiente |
| Backup y restore | Drill aislado PASS | PASS local; política productiva pendiente |
| Demo deshabilitado | No usar token `demo-*` | Validar en piloto |
| GRE | Banner/configuración MOCK visible | PASS local |
| SUNAT | Bloqueado y no fingido | PASS |

## Pruebas go/no-go

No iniciar operación piloto si falla login/JWT, scope cross-site, RBAC, creación de ticket, integridad de bultos, pago sobre saldo, cierre con faltantes, auditoría, backup o restore. La UAT debe registrar evidencia de cada actor y cada bulto; no basta con verificar que una pantalla cargue.

## Durante el piloto

Usar datos nuevos, un responsable por operación, scanner USB probado y control diario de caja. Registrar incidencias reales, diferencias, reintentos, tiempos y cualquier error de consola o red. No editar la base manualmente para corregir una operación.

## Cierre

Exportar evidencia, ejecutar integridad solo lectura, revisar auditoría y respaldar la base. Toda discrepancia debe quedar como incidencia o pendiente, nunca ocultarse cambiando el estado visual.

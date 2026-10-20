# Checklist piloto GRAEL V6

| Control | Criterio | Estado de esta entrega |
|---|---|---|
| Base y migraciones | PostgreSQL accesible, 19 migraciones aplicadas | **PASS local** |
| Seed | Ejecutar dos veces sin duplicados | **PASS local** |
| Backend/frontend | Build, lint, TypeScript sin errores | **PASS local** |
| Login y RBAC | JWT, sede efectiva, AUDITOR lectura | **PASS unitario / smoke heredado** |
| Recepción | Ticket, bultos, tarifa y tracking | **IMPLEMENTADO** |
| Inventario | Scope y no cross-site | **PASS unitario** |
| Manifiesto | Flota, carguío, despacho, llegada | **IMPLEMENTADO** |
| Desembarque | Escanear por bulto y destino real | **PASS unitario; manual pendiente** |
| Faltantes | Motivo, incidencia, tracking y estado | **PASS unitario; manual pendiente** |
| Caja/pagos | Caja de sede y cierre | **IMPLEMENTADO; concurrencia pendiente** |
| Backup/restore | Restauración comprobada | **PENDIENTE** |
| E2E navegador | Recorrido completo con usuario de piloto | **PENDIENTE** |
| SUNAT | Homologación y CDR | **BLOQUEADO EXTERNO** |

El piloto no debe iniciar si faltan secretos rotados, usuarios asignados, datos de sede, plan de soporte o evidencia de restauración.

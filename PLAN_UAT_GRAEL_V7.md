# PLAN_UAT_GRAEL_V7

## Objetivo

Validar con operadores reales que la cadena de custodia nacional respeta sede, rol, estado, trazabilidad, caja y auditoría. La UAT debe ejecutarse con datos nuevos y una sede piloto definida; no debe reutilizar únicamente tickets históricos.

| Caso | Actor | Resultado esperado |
|---|---|---|
| Recepción Lima→Cusco | Operador Lima | Ticket, tarifa, 3 bultos, QR y tracking |
| Inventario origen | Almacén Lima | Custodia y MovimientoAlmacen |
| Manifiesto y carguío | Almacén/Admin Lima | Flota, 3/3 escaneados, cierre y despacho |
| Llegada | Usuario Cusco | Manifiesto visible, llegada autorizada |
| Desembarque completo | Almacén Cusco | Sesión, 3/3 escaneados, ingreso destino |
| Faltante | Supervisor | 5 esperados/4 recibidos, bulto FALTANTE, incidencia y motivo |
| Extra | Almacén | Bulto GRAEL de otro manifiesto como EXTRA, incidencia, sin mezcla |
| Dañado | Almacén | Estado DANADO, observación e incidencia |
| Transbordo | Almacén Arequipa | Bulto por custodia actual, nueva flota, historial de ambos tramos |
| Reparto/entrega | Repartidor | Planilla, intento, POD, entrega parcial/final |
| Pago/caja | Cajero | Caja, sede de cobro, saldo, movimiento y auditoría |
| Egreso | Cajero/Admin | Solicitud, aprobación separada, caja abierta y sede |
| Comprobante | Cajero/Auditor | Consulta scoped, anulación con motivo y estado MOCK |
| RBAC | Admin/Auditor/Almacén | ADMIN no crea AUDITOR; Auditor muta 403; Almacén no ve Usuarios |

## Evidencia

Por caso se debe conservar usuario/rol, sede, timestamp, número de ticket, códigos de bulto, requestId, captura o export, incidencia y resultado esperado/observado. Un caso no pasa si la UI parece correcta pero la API devuelve datos mezclados, no existe movimiento físico/financiero o falta auditoría.

## Criterio de salida

La UAT puede pasar a corrección de casos reales solo cuando todos los casos críticos tengan evidencia humana y los pendientes estén clasificados. SUNAT no es requisito de UAT local si GRE permanece visible como MOCK y no se presenta aceptación legal.

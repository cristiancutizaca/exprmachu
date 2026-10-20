# MODELO_DATOS_GRAEL_V7

| Entidad | Responsabilidad V7 | Dimensiones/relaciones clave |
|---|---|---|
| Ticket | Agrupador comercial y operacional | `sedeRecepcionId`, origen, destino, bultos, pagos |
| Bulto | Unidad principal de custodia física | `sedeActualId`, almacén, ubicación, ticket, tracking |
| Pago | Unidad financiera | ticket, usuario, `sedeId`, monto, método |
| CajaSesion | Caja de una sede | sede, usuario apertura/cierre, saldo esperado/declarado |
| MovimientoCaja | Movimiento financiero | caja, pago, sede, usuario, método |
| MovimientoAlmacen | Movimiento físico | bulto, sede, origen/destino, `INGRESO_DESEMBARQUE`, referencia estructurada |
| TrackingEvento | Historia operacional | ticket, bulto, sede, almacén, usuario, evento |
| AuditLog | Historia de acciones | actor, sede, entidad, antes, después, metadata |
| Manifiesto | Tramo de transporte | sede origen/destino, flota, tickets, estado |
| Transbordo | Cambio físico de tramo/flota | sede operativa, tickets/bultos por custodia actual |
| DesembarqueSesion | Sesión de recepción física | manifiesto, sede destino, almacén/ubicación, apertura/cierre |
| DesembarqueBulto | Resultado por bulto | RECIBIDO, DANADO, EXTRA, FALTANTE |
| Incidencia | Excepción operativa | faltante, extra, dañado, ticket/bulto, sede, evidencia |
| GreDocumento | Documento GRE/CPE local | provider, serie/número, XML, estado, ticket/manifiesto, actor |
| Comprobante | Documento comercial/fiscal local | ticket, cliente, estado `ANULADO_MOCK` cuando aplica |

La regla central es que Ticket no sustituye la custodia de Bulto. Una misma carga puede tener bultos en sedes distintas por incidencias o entregas parciales. Todo cambio importante debe preservar relación con actor, sede, operación, tracking y auditoría cuando corresponda.

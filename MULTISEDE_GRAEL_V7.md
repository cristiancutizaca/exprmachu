# MULTISEDE_GRAEL_V7

GRAEL V7 no usa la sede del usuario creador como sustituto de la ubicación física. La operación distingue cuatro dimensiones.

| Dimensión | Fuente principal | Uso |
|---|---|---|
| Sede de recepción | `Ticket.sedeRecepcionId` | Venta, recepción y edición comercial |
| Sede actual | `Bulto.sedeActualId` | Custodia, inventario, transbordo y operación física |
| Sede destino | `Destino.sedeId` / sede operativa del manifiesto | Llegada, desembarque y entrega |
| Sede de cobro | `Pago.sedeId`, derivada de caja cuando aplica | Recaudación y reportes financieros |

La lectura de un ticket puede permitirse por recepción, destino o custodia según política. Las mutaciones no heredan esa amplitud: carguío y despacho exigen origen del tramo; llegada y desembarque exigen destino; inventario exige custodia actual; pago exige rol financiero y caja/sede correspondiente.

Los movimientos directos entre sedes están bloqueados en Inventario. El cambio físico de sede ocurre por manifiesto, llegada, desembarque o transbordo autorizado. En un caso Lima→Arequipa→Cusco, el ticket conserva recepción Lima mientras cada bulto cambia `sedeActualId` conforme a la cadena de custodia.

El reporte comercial se interpreta por sede de recepción; el reporte de recaudación por sede de cobro; inventario por sede actual; tránsito por manifiesto y ruta. Los roles globales pueden solicitar un selector de sede cuando el endpoint lo permite. ADMIN_SEDE, OPERADOR, ALMACEN, CAJERO y REPARTIDOR no pueden cambiar arbitrariamente a otra sede.

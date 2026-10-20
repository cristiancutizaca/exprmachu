# PENDIENTES_GRAEL_V7

## Prioridad alta

El escenario nacional completo con datos nuevos Lima→Cusco, la cadena Lima→Arequipa→Cusco y sus flujos de llegada, transbordo y desembarque requieren fixtures dedicados y una corrida E2E completa. También deben ejecutarse races simultáneas de pago 2×80 sobre saldo 100, doble cierre de caja, doble entrega, doble despacho, doble carguío y correlativos Ticket/Manifiesto/CPE/GRE.

## Prioridad media

Debe completarse la UI de Transbordo para descarga, nueva carga, selección de flota, incidencias y manifiesto. Detracción necesita API local persistente si se desea operar fuera de Demo. Bolsa debe definirse e integrarse o permanecer bloqueada en JWT. Configuración necesita terminar tabs CRUD de sedes, almacenes, ubicaciones, flota, conductores, tarifas, usuarios y documentos.

## Validación y operación

Quedan pendientes QA visual de todas las rutas en tres resoluciones, tracking móvil, dataset de rendimiento de 1000 tickets/3000 bultos, política productiva de rate limit, retención/cifrado de backups, monitoreo, RPO/RTO, clean install automatizada en una segunda base y aceptación humana en sede.

## Externo

SUNAT real está **BLOQUEADO EXTERNO** hasta disponer de credenciales, certificado, firma, homologación, endpoint, CDR y configuración segura. GRE MOCK no debe presentarse como documento legal. No se agregan crédito, reclamos, devoluciones ni reenvíos hasta cerrar el core.

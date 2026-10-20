# Validación E2E V7

## Runner y configuración

Playwright quedó instalado en `grael-frontend` con script `npm run test:e2e`. El runner utiliza Chromium del sistema mediante `launchOptions`, viewport 1366×768, trazas y screenshots únicamente en caso de fallo. Los artefactos pesados no deben incorporarse al ZIP final.

| Caso | Resultado |
|---|---|
| Login real con JWT | **PASS** |
| Redirección a Recepción | **PASS** |
| Drawer cerrado por defecto | **PASS** |
| Apertura por hamburguesa | **PASS** |
| Cierre por Escape | **PASS** |
| Logout | **PASS** |
| Navegación real a Comprobantes | **PASS** |
| Detracción sin fallback silencioso en JWT | **PASS** |
| Recepción nueva con 3 bultos | **PENDIENTE** |
| QR/etiquetas | **PENDIENTE** |
| Inventario origen | **PENDIENTE** |
| Manifiesto/flota/carguío/despacho | **PENDIENTE** |
| Login destino/llegada/desembarque físico | **PENDIENTE** |
| Faltante/extra/dañado | **PENDIENTE** |
| Entrega/pago/caja/auditoría | **PENDIENTE** |
| Transbordo Lima→Arequipa→Cusco | **PENDIENTE** |

La última ejecución Playwright tuvo 2 tests, 2 PASS, 0 FAIL y 0 SKIP. Antes de ese resultado se corrigieron dos problemas verificables: la configuración del ejecutable Chromium y un caché `.next` corrupto que provocaba submit HTML nativo. También se añadió espera de hidratación para evitar falsos negativos.

## Conclusión

La cobertura E2E es **PARCIAL**. El login, el control del drawer, el logout y dos navegaciones reales están probados con navegador automatizado. El escenario principal nacional completo todavía requiere fixtures de datos nuevos y se mantiene pendiente sin presentarlo como validado.

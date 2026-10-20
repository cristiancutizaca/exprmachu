# ARQUITECTURA_GRAEL_V7

GRAEL V7 conserva un monorepo con frontend Next.js y backend NestJS. La secuencia de una operación crítica es UI → API → DTO → validación → JWT → RBAC → scope de sede → regla de workflow → transacción TypeORM/PostgreSQL → tracking → auditoría → respuesta → actualización UI.

El frontend no es autoridad de seguridad ni de estado. Un error de API se muestra al usuario y no activa un fallback Demo. Demo se identifica por token `demo-*`, no escribe PostgreSQL y sus toasts están etiquetados. GRE/CPE MOCK persiste datos locales para pruebas, pero no representa aceptación legal SUNAT. El proveedor SUNAT real responde como no configurado y queda bloqueado externamente.

PostgreSQL usa migraciones TypeORM y `DB_SYNC=false`. JWT contiene usuario, rol y sede; `RolesGuard` limita acciones y los servicios validan la semántica de sede. `x-request-id`, filtro global de errores, health y AuditLog proporcionan trazabilidad básica. Helmet y CORS whitelist se configuran en el bootstrap; login y tracking público tienen rate limiting básico en memoria.

El paquete final excluye secretos y artefactos generados. Los scripts de backup/restore y los resultados de validación se incluyen; los dumps reales, trazas y reports pesados permanecen fuera del ZIP.

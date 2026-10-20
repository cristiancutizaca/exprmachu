# OPERACION_PRODUCCION_GRAEL_V7

GRAEL V7 no debe desplegarse como producción nacional con la evidencia actual. Antes de producción se requiere infraestructura PostgreSQL administrada, secretos rotados, TLS, usuarios reales, monitoreo, logs sin datos sensibles, backup cifrado con retención, restore periódico, RPO/RTO aprobado, rate limiting distribuido y aceptación humana.

Debe ejecutarse una clean install y upgrade reproducibles en infraestructura objetivo, pruebas E2E nacionales, carreras financieras/documentales, dataset de carga y verificación de permisos. La configuración `GRE_PROVIDER=MOCK` debe permanecer visible si SUNAT no está configurado. Nunca debe publicarse una respuesta de éxito SUNAT ficticia.

El seed de desarrollo no debe ejecutarse sobre producción. Las migraciones se ejecutan con un usuario controlado y `DB_SYNC=false`. Las operaciones financieras requieren caja, sede, usuario y auditoría. Las operaciones físicas requieren bulto, custodia, almacén, ubicación, tracking y movimiento de almacén. Todo rollback debe preservarse mediante transacción y evidencia de error.

El estado actual es **PENDIENTE** para producción nacional y **PARCIAL** para un piloto UAT controlado hasta completar los casos humanos y las pruebas de carrera indicadas en `PLAN_UAT_GRAEL_V7.md`.

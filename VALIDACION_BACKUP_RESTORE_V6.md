# VALIDACION_BACKUP_RESTORE_V6

Estado: **PENDIENTE**. No se ejecutó una restauración verificable durante esta entrega.

## Procedimiento previsto

1. Crear un dump lógico de PostgreSQL con `pg_dump` en formato custom, excluyendo secretos y verificando tamaño/hash.
2. Restaurar en una base aislada, aplicar permisos y comprobar que las 19 migraciones y tablas V6 existen.
3. Ejecutar consultas de integridad para tickets, bultos, manifiestos, incidencias, pagos, tracking y `gre_documentos`.
4. Iniciar backend contra la base restaurada y repetir health, login y un recorrido de lectura.
5. Registrar comandos, tiempos, hash, errores y conteos antes/después.

No se afirma RPO/RTO ni capacidad de recuperación hasta completar el procedimiento con evidencia.

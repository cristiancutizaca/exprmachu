# Validación de backup y restore V7

## Scripts

Se crearon `scripts/backup-db.sh` y `scripts/restore-db.sh`. Ambos usan `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS` y `DB_NAME`; el restore exige además `ALLOW_DB_RESTORE=YES` para evitar una eliminación accidental. El formato utilizado es `pg_dump --format=custom`, con `--no-owner` y `--no-privileges`. El archivo de backup de la validación se mantuvo fuera del worktree final.

| Control | Resultado |
|---|---|
| Script de backup creado | **PASS — IMPLEMENTADO Y PROBADO** |
| Dump custom generado | **PASS** |
| Restore en base aislada | **PASS** |
| Comparación de conteos | **PASS** |
| Restore sobre base productiva | No ejecutado; correctamente evitado |

## Restore drill observado

Se creó `grael_v7_restore`, se restauró el dump y se compararon los conteos con `grael_db`. Los valores fueron tickets 7 frente a 7, bultos 25 frente a 25, pagos 4 frente a 4 y migraciones 22 frente a 22. La base aislada fue eliminada después de la comparación.

## Conclusión

Backup/restore queda **IMPLEMENTADO Y PROBADO** para el drill local aislado. No constituye un procedimiento operativo productivo: aún deben definirse retención, cifrado, almacenamiento externo, permisos, monitoreo, RPO/RTO y una prueba con infraestructura definitiva.

# VALIDACION_MANUS_V6

## Resumen ejecutivo

La copia GRAEL V6 compila y pasa la suite unitaria ampliada. La base PostgreSQL local tiene las migraciones V6 aplicadas y el seed es repetible. La validación confirma una base técnica adecuada para pruebas controladas en una sede; no equivale a certificación productiva.

## Resultados

| Verificación | Resultado | Evidencia |
|---|---|---|
| Backend build | **IMPLEMENTADO Y PROBADO** | `npm run build`, código 0 |
| Backend unit tests | **IMPLEMENTADO Y PROBADO** | 12 suites, 33 tests PASS |
| Migraciones | **IMPLEMENTADO Y PROBADO** | 19 registros en `migrations`; tablas V6 presentes |
| Seed idempotente | **IMPLEMENTADO Y PROBADO** | `npm run seed && npm run seed`, ambos exitosos |
| Frontend lint | **IMPLEMENTADO Y PROBADO** | `npm run lint`, sin errores |
| Frontend TypeScript | **IMPLEMENTADO Y PROBADO** | `npx tsc --noEmit`, código 0 |
| Frontend build | **IMPLEMENTADO Y PROBADO** | Next.js 26 rutas |
| Desembarque físico unitario | **IMPLEMENTADO Y PROBADO** | apertura, bulto ajeno, idempotencia, faltante |
| Reportes multisede unitario | **IMPLEMENTADO Y PROBADO** | Cusco=5 frente a global=7 en prueba parametrizada |
| HTTP smoke integral V6 | **PARCIAL** | endpoints base V5 disponen de scripts; smoke V6 completo debe ejecutarse por separado |
| E2E de navegador | **PENDIENTE** | no ejecutado |
| Concurrencia/carga | **PENDIENTE** | no ejecutado |
| Backup/restore | **PENDIENTE** | no ejecutado |
| SUNAT | **BLOQUEADO EXTERNO** | proveedor real requiere credenciales y homologación |

## Comandos reproducibles

```bash
cd grael-backend
npm run build
npm run test:unit
npm run migration:run
npm run seed

cd ../grael-frontend
npm run lint
npx tsc --noEmit
npm run build
```

## Observación

El entorno de validación local utilizó PostgreSQL accesible por el DataSource del backend. No se incluyeron `.env`, `node_modules`, `dist`, `.next`, `coverage`, logs ni backups en el paquete final.

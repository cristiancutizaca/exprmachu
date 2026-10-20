# VALIDACION_MANUS_V4

## Alcance y criterio de aceptación

La validación se realizó sobre el proyecto existente en `01_PROYECTO_BASE/grael-project/`, sin crear un proyecto nuevo ni eliminar código útil. Se verificaron frontend, backend, PostgreSQL real, migraciones, seed idempotente, pruebas unitarias y smoke HTTP. La compilación se considera necesaria, pero no suficiente: por eso se incluyó una campaña HTTP real contra el API en ejecución.

## Entorno

| Componente | Valor observado |
|---|---|
| Backend | NestJS 10, puerto 3001 |
| Frontend | Next.js 14.2.3, puerto 3000 |
| Base de datos | PostgreSQL 16, `grael_db` |
| Prefijo API | `/api/v1` |
| Health | `/health`, con `SELECT 1` |
| Fecha de validación | 21 de agosto de 2026, UTC observado por el entorno |

## Backend

El comando `npm run build` terminó con código 0 después de integrar el filtro global, request ID, scoping de Entregas e Incidencias, tracking público endurecido y pruebas nuevas.

El comando `npm run test:unit` terminó con código 0 con 7 suites y 18/18 pruebas aprobadas. La cobertura funcional incluye workflow de tickets, pagos/caja, bultos, GRE, JWT, integridad, Egresos y Reparto.

| Verificación | Resultado | Evidencia |
|---|---:|---|
| Compilación backend | PASS | `npm run build` → exit 0 |
| Suite unitaria | PASS | 7 suites, 18 tests |
| JWT propaga `sedeId` | PASS | `src/auth/jwt.strategy.spec.ts` |
| Integridad ticket↔bulto | PASS | `src/domain-integrity.spec.ts` |
| Autoaprobación de egreso | PASS | `src/egresos/egresos.service.spec.ts` |
| Caja requerida para egreso | PASS | `src/egresos/egresos.service.spec.ts` |
| Elegibilidad de reparto | PASS | `src/reparto/reparto.service.spec.ts` |
| Inicio transaccional de reparto | PASS | `src/reparto/reparto.service.spec.ts` |

## Frontend

Los tres comandos siguientes terminaron con código 0:

```bash
cd grael-frontend
npm run lint
npx tsc --noEmit
npm run build
```

El lint terminó sin warnings ni errores, TypeScript no reportó errores y Next.js generó 23 rutas estáticas, incluyendo `/reparto` y `/egresos`. El aviso de compatibilidad de `@typescript-eslint` con TypeScript 5.9.3 fue informativo y no produjo warnings ESLint ni fallo de build.

## PostgreSQL, migraciones y seed

`npm run migration:run` terminó con código 0 y reportó **No migrations are pending**. Se verificaron las cinco migraciones V4 de roles, flota-sede, egresos, reparto y estados de reparto.

`npm run seed` terminó con código 0. El seed creó o confirmó destinos, sedes, almacenes, usuarios, programaciones, clientes, tickets, pagos, desembarques, configuración, flota, tarifas, bultos y tracking inicial. Las ejecuciones previas repetidas confirmaron idempotencia.

## Smoke HTTP real

La evidencia completa está en `VALIDACION_HTTP_SMOKE_MANUS_V4.txt`. Los scripts reproducibles son:

```bash
./VALIDACION_HTTP_SMOKE_MANUS_V4.sh
./VALIDACION_HTTP_SMOKE_V4_OPERATIVO.sh
./VALIDACION_HTTP_SMOKE_MISMATCH.sh
```

La campaña se ejecutó con el backend real en `localhost:3001` y PostgreSQL conectado. Los resultados principales fueron:

| Caso | Resultado observado |
|---|---|
| `GET /health` | HTTP 200, `status=ok`, `db=ok`, requestId presente |
| Login `jesus.cutisaca` | HTTP 200, JWT real y `sedeId` Cusco |
| Login `superadmin` | HTTP 200 |
| `GET /auth/me` | HTTP 200, usuario saneado sin password |
| `GET /egresos` como ADMIN_SEDE | HTTP 200, datos filtrados por sede |
| Crear egreso `afectaCaja=false` | HTTP 201 |
| Aprobar egreso con usuario distinto y SUPERADMIN | HTTP 200, estado `APROBADO` |
| `GET /reparto` | HTTP 200 |
| Crear planilla sin tickets elegibles | HTTP 400, mensaje de elegibilidad |
| Llegada transaccional de manifiesto | HTTP 201, manifiesto `LLEGADO` |
| Resumen de llegada | HTTP 200, `expected=1`, `arrived=1`, `pending=0` |
| Tracking manual ticket↔bulto válido | HTTP 201, evento `LLEGADA_SEDE` |
| Tracking público con código inexistente | HTTP 404 controlado, no 500 |
| Tracking mismatch con bulto real de otro ticket | HTTP 400, código `BULTO_TICKET_MISMATCH` |
| `GET /tickets` | HTTP 200 |

El smoke también detectó y corrigió un defecto de observabilidad: un código alfanumérico desconocido se estaba intentando comparar con una columna UUID y producía 500. La corrección condiciona la búsqueda UUID a un formato UUID válido y devuelve 404 de dominio.

## Validación visual y Demo

El drawer de Operaciones fue revisado en el código de layout para asegurar inicio cerrado, apertura por hamburguesa, overlay, cierre por navegación, clic externo y Escape. Las páginas V4 nuevas mantienen el indicador visible de **Modo Demo** cuando no existe JWT o el token empieza por `demo-`; no se ocultan fallos del API convirtiéndolos en mocks silenciosos.

## Estado final

| Estado | Elementos |
|---|---|
| Implementado | Backend V4, migraciones, seed, RBAC, scoping, egresos, reparto, llegada, tracking, auditoría, frontend nuevo y validaciones ejecutadas |
| Parcial | Algunas pantallas históricas aún conservan contratos o Demo parcial; falta campaña E2E completa de navegador |
| Pendiente | Pruebas de carga, concurrencia, recuperación, revisión operativa por sede, rotación de credenciales y respaldo antes de producción |
| Bloqueado por dependencia externa | SUNAT legal, certificado digital, firma XML, homologación, credenciales, CDR y endpoints externos |

La entrega no declara certificación de producción. El sistema está validado como **V4 operativo en entorno local de integración**, con los límites anteriores explícitamente registrados.

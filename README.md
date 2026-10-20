# GRAEL — V10

GRAEL es un sistema de gestión logística multisede para recepción, custodia, almacén, despacho, transbordo, desembarque, entrega, caja y documentos electrónicos. Esta versión evoluciona directamente desde `GRAEL_MANUS_V9_FINAL.zip`; no crea un proyecto nuevo, no cambia el stack y no introduce Redis, Kafka, RabbitMQ, Kubernetes, microservicios ni borrado histórico.

## Estado de V10

V10 incorpora hardening ejecutado del ledger financiero de Caja, aislamiento de pagos por sede, locks pesimistas, disposición estructurada de Incidencias, Entrega/POD idempotente, tracking por custodia, seed coherente con POD histórico, series documentales por sede para GRE/CPE MOCK, CORS local explícito, UX read-only por rol en Configuración, fixture automático de concurrencia y validación ampliada de integridad.

> La evidencia disponible no permite declarar UAT operacional integral ni producción. GRE/CPE siguen siendo MOCK hasta contar con credenciales, certificado, homologación y CDR externos.

## Stack inmutable

| Capa | Tecnología | Versión/nota |
|---|---|---|
| Frontend | Next.js, React, TypeScript, TailwindCSS, Zustand, Axios | Next.js 14.2.3 |
| Backend | NestJS, TypeORM, Passport JWT, Swagger | NestJS 10 / TypeORM 0.3 |
| Persistencia | PostgreSQL | Validación local con PostgreSQL 16 |
| Pruebas | Jest y Playwright | Unitarias y E2E UI real |

## Puesta en marcha local

```bash
cd grael-backend
npm ci
export DB_HOST=127.0.0.1 DB_PORT=5432 DB_USER=grael_user DB_PASS=grael_pass_2026 DB_NAME=grael_v10_db
npm run migration:run
npm run seed
JWT_SECRET=change-me PORT=3002 npm run start:prod
```

En otra terminal:

```bash
cd grael-frontend
npm ci
NEXT_PUBLIC_API_URL=http://127.0.0.1:3002/api/v1 npm run dev -- -p 3003
```

La API utiliza `/api/v1`; el health check está en `/health`. Los secretos anteriores son únicamente ejemplos locales de validación y no deben reutilizarse en ambientes reales.

## Validación reproducible

Los alias V10 se encuentran en `grael-backend/package.json`:

```bash
npm run build
npm run test:unit
npm run test:concurrency
npm run test:integrity
npm run test:performance
```

Desde `grael-frontend`:

```bash
npm run lint
npx tsc --noEmit
npm run build
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 npm run test:e2e
```

La evidencia final está en `validation/v10/`. La documentación principal se encuentra en `VALIDACION_MANUS_V10.md`, `VALIDACION_RUNS_MANUS_V10.txt` y `CHANGELOG_MANUS_V10.md`.

## Usuarios seed de validación

| Usuario | Contraseña local | Rol | Sede |
|---|---|---|---|
| `jesus.cutisaca` | `admin123` | ADMIN_SEDE | Cusco |
| `maria.garcia` | `caj123` | CAJERO | Cusco |
| `supervisor` | `super123` | SUPERVISOR | Cusco |
| `repartidor.cusco` | `reparto123` | REPARTIDOR | Cusco |
| `auditor` | `auditor123` | AUDITOR | Lima |

Estos usuarios son fixtures de desarrollo. No son credenciales de producción.

## Cambios operativos V10

El ledger de `MovimientoCaja` es la fuente de verdad para la sesión de Caja y los pagos digitales no se suman al efectivo físico. Caja y pagos usan sede persistida y locks transaccionales. Una carrera de diez aperturas o diez cierres sobre la misma sesión produce un único ganador. Entrega impide crear una segunda entrega para un bulto con disposición final y la resolución de Incidencias exige una disposición estructurada cuando cambia la realidad física. El seed crea un POD histórico para los bultos que nacen entregados.

GRE y CPE utilizan series persistidas por sede y correlativos protegidos por lock; su emisión continua siendo MOCK. El backend mantiene la autorización, el frontend solo oculta o deshabilita controles sin permiso. Configuración muestra read-only a los roles que no pueden escribir y no envía mutaciones prohibidas.

## Entrega y límites

El paquete final debe contener código fuente, migraciones, seeds, pruebas, scripts, lockfiles y evidencia textual segura. Se excluyen `.git`, `node_modules`, `dist`, `.next`, coverage, `.env`, secretos, certificados, dumps, logs temporales y reportes Playwright pesados. La aceptación se mantiene deliberadamente conservadora: se validaron escenarios locales y races concretas, pero no un viaje nacional integral Lima→Arequipa→Cusco ni homologación SUNAT.

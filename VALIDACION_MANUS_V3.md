# VALIDACION_MANUS_V3

## 1. Criterio de validación

Esta validación distingue entre **compilación**, **pruebas unitarias**, **persistencia real**, **smoke tests HTTP** y **operación productiva**. Un build exitoso no se interpreta como certificación end-to-end. Las evidencias reproducibles están en `VALIDACION_RUNS_MANUS_V3.txt`.

## 2. Resultado ejecutivo

| Área | Resultado | Estado |
|---|---:|---|
| Frontend lint | 0 warnings/errors | PASS |
| Frontend TypeScript | exit 0 | PASS |
| Frontend production build | 21 rutas generadas | PASS |
| Backend build | exit 0 | PASS |
| Tests unitarios | 4 suites / 11 tests | PASS |
| PostgreSQL instalación limpia | 10 migraciones + seed | PASS |
| PostgreSQL incremental | migración y seed idempotentes | PASS |
| Health/login/JWT HTTP | 200; JWT con `sedeId` | PASS |
| Recepción HTTP | ticket, bulto y tracking creados | PASS |
| Pago parcial/caja HTTP | saldo y movimiento de caja | PASS |
| CPE mock HTTP | XML y comprobante persistido | PASS |
| Manifiesto/carguío/despacho HTTP | incompleto rechazado; cargado despachado | PASS |
| SUNAT real | no ejecutado | BLOQUEADO por credenciales externas |
| E2E navegador automatizado | no ejecutado como campaña completa | PARCIAL |
| Prueba de carga/concurrencia multiproceso | no ejecutada como campaña completa | PENDIENTE |

## 3. Comandos y resultados reproducibles

### Frontend

```text
cd grael-frontend
npm run lint          -> exit 0; No ESLint warnings or errors
npx tsc --noEmit      -> exit 0
npm run build         -> exit 0; Next.js 14.2.3; 21/21 páginas estáticas
```

Rutas incluidas en el build: `/`, `/login`, `/dashboard`, `/recepcion`, `/busqueda`, `/busqueda-qr`, `/inventario`, `/manifiesto`, `/transbordo`, `/desembarque`, `/caja-diaria`, `/comprobantes`, `/tracking`, `/reportes`, `/configuracion`, `/detraccion`, `/pago-sin-comprobante` y rutas auxiliares.

### Backend

```text
cd grael-backend
npm run build        -> exit 0
npm run test:unit    -> exit 0
```

Resultado de Jest:

```text
Test Suites: 4 passed, 4 total
Tests:       11 passed, 11 total
```

Suites: `ticket-workflow.service.spec.ts`, `bultos.service.spec.ts`, `pagos.service.spec.ts` y `gre.service.spec.ts`.

## 4. PostgreSQL real

Se instaló PostgreSQL 16 localmente en el sandbox solo para validación. Se ejecutaron migraciones sobre una base limpia `grael_v3_clean`:

```text
migrations=10
usuarios=5
tickets=6
movimientos_almacen=0
```

Se ejecutaron migraciones y seed sobre una base incremental `grael_db`. `npm run migration:run` terminó con `No migrations are pending` y `npm run seed` terminó con `Seeds completados exitosamente` en una segunda ejecución.

Conteos incrementales finales observados:

```text
migrations=10
usuarios=5
tickets=7
bultos=25
tracking=29
movimientos_almacen=2
comprobantes=1
```

La primera ejecución del seed detectó un desajuste de nombres físicos (`capacidad_opcional` frente a `capacidadOpcional`). Se corrigió la migración base y se añadió `1710000007000-NormalizeTypeOrmColumnNames.ts` para instalaciones V2 incrementales. Después de la corrección, instalación limpia, migración incremental y seed idempotente pasaron.

## 5. Smoke tests HTTP

Con PostgreSQL migrado/sembrado y backend NestJS escuchando en `localhost:3001` se observaron los siguientes resultados:

| Flujo | Resultado observado |
|---|---|
| `GET /health` | HTTP 200, `status: ok` |
| `POST /api/v1/auth/login` | HTTP 200; JWT válido con rol y `sedeId` |
| `GET /api/v1/auth/me` | HTTP 200; no expone password |
| `GET /api/v1/tickets` | HTTP 200 con tickets sembrados |
| Recepción `POST /api/v1/tickets` | HTTP 201; ticket `301-0631202`, subtotal/IGV/total calculados por backend |
| Bultos/tracking posterior a recepción | bulto creado y evento append-only registrado |
| `POST /api/v1/pagos/caja/abrir` | HTTP 201; caja con saldo inicial |
| `PATCH /api/v1/tickets/:id/pagar` | HTTP 200; pago parcial 20.00, saldo persistente y movimiento de caja |
| `POST /api/v1/gre/emitir` CPE | HTTP 201; `ACEPTADO_MOCK`, XML y comprobante `B001-00000001` |
| Despacho de manifiesto incompleto | HTTP 400 con código `MANIFEST_INCOMPLETE` |
| Movimiento a almacén | HTTP 201; bulto `EN_ALMACEN`, ubicación y movimiento persistidos |
| Carguío por código de bulto | HTTP 201; bulto `CARGADO` |
| Despacho cargado | HTTP 201; manifiesto/ticket/bulto en ruta/transporte |

Un intento inicial de pago con `POST /tickets/:id/pagar` devolvió HTTP 404 porque el contrato backend correcto es `PATCH`; el cliente frontend ya utiliza `PATCH`. El retry correcto pasó HTTP 200.

## 6. Seguridad y reglas verificadas

Se verificó que `JWT_SECRET` no tenga fallback silencioso. Se verificó que el endpoint de caja actual no exponga hashes de contraseña después del saneamiento de relaciones. La creación de bultos ya no acepta mass assignment, la anulación consulta pagos reales y el despacho bloquea bultos no cargados.

La tarifa manual requiere rol autorizado, precio positivo, motivo y auditoría. Los pagos en efectivo, Yape y Plin requieren sesión de caja abierta. La apertura de caja se limita a la sede del usuario salvo Supervisor.

## 7. Implementado, parcial, pendiente y bloqueado

### Implementado y validado

Migraciones en base limpia e incremental, seed idempotente, JWT real, prefijo `/api/v1`, recepción transaccional, bultos, tracking, inventario de almacén, caja/pago parcial, GRE/CPE mock, manifiesto con carguío y despacho, frontend conectado en módulos prioritarios y 11 pruebas unitarias.

### Parcial

Existe modo Demo explícito en las pantallas. Varias pantallas secundarias conservan UI y datos locales, aunque los módulos prioritarios de Manifiesto, Búsqueda QR, Inventario, Desembarque, Comprobantes, Caja y Tracking ya tienen contratos reales. Falta una campaña E2E automatizada con navegador y una validación de concurrencia multi-proceso formal.

### Pendiente

Pruebas E2E de navegador, pruebas de carga, observabilidad centralizada, backups/restauración operativa, gestión de secretos de producción, políticas de retención de auditoría, despliegue y revisión operativa por sedes.

### Bloqueado por dependencias externas

SUNAT real no está implementado legalmente. Requiere credenciales de servicio, certificado digital, firma XML, homologación, endpoints por ambiente, CDR, reintentos e idempotencia. El backend responde explícitamente como no disponible cuando se selecciona `GRE_PROVIDER=SUNAT`.

## 8. Conclusión

La base GRAEL V3 queda **instalable y operable en entorno local con PostgreSQL real**, con evidencias de persistencia y flujo HTTP principal. No debe presentarse aún como despliegue productivo nacional certificado: las campañas E2E/load, controles operativos, infraestructura, secretos y SUNAT real continúan siendo tareas separadas.

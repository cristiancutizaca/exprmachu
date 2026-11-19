# Auditoría operativa de Expreso Machupicchu

18 de noviembre de 2026, hora de Perú. Base revisada `acf6f36b3c3e87046ea40a8f88479a545ee72c0d`. La entrega hacia `main` y el SHA final se registran en el [pull request #2](https://github.com/cristiancutizaca/exprmachu/pull/2).

## Hallazgos y correcciones

| Hallazgo | Causa | Corrección |
|---|---|---|
| El dashboard se caía al mostrar `ticket.total` | PostgreSQL entregaba `NUMERIC` como texto en algunas lecturas y el componente lo trataba como número | Conversión centralizada en TypeORM y consultas agregadas. Aritmética decimal en el backend y formateo tolerante a contratos anteriores en la interfaz |
| React perdía la identidad de las filas de desembarque | La transformación del dashboard descartaba el ID y dejaba filas con la misma clave | La tabla conserva el ID persistido. Una prueba verifica que cada fila conserva su nodo DOM al cambiar el orden |
| El fallo de la API podía parecer una operación válida | Algunas páginas se inicializaban con datos de demostración o los usaban como respaldo | Sesión de demostración explícita en desarrollo, desactivada por defecto. Las sesiones reales muestran carga, resultados, vacío o error según la consulta |
| Cotización, pagos y caja podían diferir | La recepción y el backend usaban reglas distintas. Algunas comparaciones toleraban un céntimo de diferencia y la caja mezclaba totales diarios y de sesión | Un cálculo de tarifa para cotizar y guardar, redondeo a dos decimales, cobros y saldos basados en pagos registrados, total diario calculado sobre todas las páginas y efectivo separado de medios digitales |
| El costo por kilo histórico perdía precisión | Las tarifas admitían cuatro decimales y el detalle del ticket almacenaba dos | La migración `1710000027000` amplía la columna a cuatro decimales y rechaza una reversión que perdería precisión |
| La planilla de reparto fallaba con HTTP 500 o dejaba un bulto entregado sin comprobante | La entidad buscaba columnas que no existían con ese nombre. El intento de reparto actualizaba su propia fila y el estado del bulto en un flujo distinto del POD | Corrige el mapeo de columnas, valida la custodia, serializa la asignación y usa el servicio común para persistir el comprobante de entrega y el tracking en la transacción |
| Cambiar de estado un transbordo podía fallar con HTTP 500 | TypeORM añadía relaciones automáticas al aplicar el bloqueo de PostgreSQL | El bloqueo lee el registro principal y la validación usa una lectura separada de sus relaciones. El mismo ajuste protege la anulación de tickets |
| Guardar una sede podía actualizar tarifas y otras configuraciones | La pantalla escribía todos los formularios en conjunto y elegía automáticamente la primera sede devuelta | Selector de sede y guardado por sección. Solo se envían las tarifas editadas |

## Cobertura y evidencia

| Componente | Estado | Resultado en entorno aislado |
|---|---|---|
| PostgreSQL y migraciones | CORREGIDO Y PROBADO | PostgreSQL 16.15. Se aplicaron las 28 migraciones de la rama base en una base vacía. Se restauró una copia de pruebas y se aplicó la migración 29 con respaldo previo. Se conservaron las siete líneas de la muestra, el costo de S/ 40.00 pasó a S/ 40.0000 y el subtotal agregado conservó S/ 18,852.27. Las 36 entidades coincidieron en nombres de columnas con el esquema. Los 14 controles SQL devolvieron cero incidencias |
| Backend NestJS | CORREGIDO Y PROBADO | `npm ci` y compilación en Node.js 24.22.3. Jest pasó 73 pruebas en 19 suites. `GET /health` respondió `status: ok` y `db: ok` |
| Frontend Next.js | CORREGIDO Y PROBADO | `npm ci`, compilación de producción y TypeScript sin errores. ESLint informó 0 errores y 25 advertencias. Playwright pasó 11 pruebas en Chromium, con recorrido de las 21 pantallas de operación y revisión de errores de consola y API |
| Sesión, dashboard, recepción, búsqueda, configuración de sede y caja | CORREGIDO Y PROBADO | Login y logout. Regresiones de montos de texto, identidad de filas y estados de error. Un ticket guardado desde el formulario se recuperó con el mismo ID y número. Se comprobó QR, impresión y apertura, movimiento y cierre de caja. Guardar una sede desde el navegador actualizó solo esa sede |
| Pagos, egresos y reportes | CORREGIDO Y PROBADO | Cotización, venta, dos abonos y saldo de S/ 0.01 comprobados contra PostgreSQL. La aprobación de egresos rechazó al autor y aceptó a un supervisor distinto. Se verificaron los indicadores reales y el reporte de pendientes |
| Despacho, almacén, transbordo y desembarque | CORREGIDO Y PROBADO | Viaje aislado Lima–Cusco por API con ticket, ingreso a almacén, manifiesto, carga, despacho, llegada y conciliación física por bulto. Otro ticket pasó por el flujo de estados de transbordo y apareció en su CSV. Programación vinculada a vehículo y conductor |
| POD, tracking e incidencias | CORREGIDO Y PROBADO | Reparto creado, iniciado y concluido por API. Comprobante de entrega persistido y estado consultado en tracking público. Chromium comprobó la creación de planilla, la entrega de un bulto y el retorno a una ubicación de almacén. Se volvió a asignar únicamente el bulto pendiente. Incidencia registrada, resuelta con disposición y recuperada. Entrega duplicada rechazada |
| Usuarios, sedes, auditoría y concurrencia | CORREGIDO Y PROBADO | Creación y login de un operador de pruebas, lectura de sede asignada y auditoría. Se bloquearon la lectura de usuarios y la consulta de recursos de otra sede para ese operador. Seis carreras de 10 solicitudes sin HTTP 5xx. Hubo un ganador por apertura, cierre, cobro y entrega duplicada. Las dos emisiones de prueba generaron 10 correlativos distintos cada una |
| GRE, CPE, padrón y flota | CORREGIDO Y PROBADO | GRE remitente y transportista, firma con certificado de prueba, XSD, ZIP y CDR del proveedor local, rechazo del CDR de otro correlativo y recuperación tras una conexión cortada. Factura y boleta SOAP local, PDF, idempotencia, detracción, importación de padrón RUC de prueba y verificación interna de flota |
| Operaciones históricas de desembarque desde la interfaz | IMPLEMENTADO SIN PRUEBA COMPLETA | Se comprobó la navegación y el recorrido vigente de desembarque físico. Queda pendiente probar cada acción histórica por ticket desde la interfaz |
| Base empresarial y Windows | PENDIENTE | El acceso disponible fue a un entorno aislado. El estado de la base empresarial y la instalación de Windows requieren verificación local. Si existen registros de demostración introducidos en el pasado, falta identificarlos con la empresa antes de cualquier depuración |
| Emisión tributaria y verificaciones externas | BLOQUEADO POR DEPENDENCIA EXTERNA | Para la emisión productiva se necesitan habilitación y credenciales autorizadas, certificado digital, establecimiento y series configurados y un CDR oficial. El padrón local necesita su actualización oficial. La consulta DNI y la verificación oficial de vehículos y conductores requieren un proveedor autorizado |

La medición local de 30 solicitudes consecutivas por ruta devolvió cero fallos en `/health`, dashboard, inventario y transbordo. El resultado corresponde a la base de pruebas, con poco volumen y sin tráfico empresarial.

La bolsa de despacho conserva su módulo histórico. El flujo de despacho que registra bultos en PostgreSQL se opera desde **Manifiestos**. En desembarque, las acciones antiguas por ticket requieren habilitar la opción de compatibilidad histórica. La operación actual usa sesiones físicas y escaneo por bulto.

## Puesta en marcha en Windows

Abra Docker Desktop. Use Node.js 24.9 o posterior. Estos comandos de respaldo apuntan a la base local `grael_db` y al usuario `grael_user` del servicio `postgres` de Compose. Si el `.env` existente apunta a otra instancia, haga el respaldo recuperable de esa instancia antes de migrar.

Si su carpeta es un clon Git en `main`, compruebe que está limpio y actualice por avance rápido.

```powershell
$proyecto = 'C:\Users\zecsoneitor\Videos\AREPOSITORIO\GRAEL_MANUS_V10_FINAL'
Set-Location $proyecto
git status --short --branch
if ((git branch --show-current) -ne 'main') { throw 'La carpeta debe estar en la rama main.' }
if (git status --porcelain) { throw 'Revise sus cambios locales antes de actualizar.' }
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw 'La actualización de Git no terminó.' }
```

Si descargó un ZIP, clone `main` en otra carpeta. Copie el archivo local de configuración existente solo a la carpeta nueva y use esa ruta en ambas terminales.

```powershell
$anterior = 'C:\Users\zecsoneitor\Videos\AREPOSITORIO\GRAEL_MANUS_V10_FINAL'
$proyecto = 'C:\Users\zecsoneitor\Videos\AREPOSITORIO\GRAEL_MANUS_V10_FINAL-main'
git clone --branch main https://github.com/cristiancutizaca/exprmachu.git $proyecto
if ($LASTEXITCODE -ne 0) { throw 'El clon no terminó.' }
$envAnterior = Join-Path $anterior 'grael-backend\.env'
$envNuevo = Join-Path $proyecto 'grael-backend\.env'
if ((Test-Path -LiteralPath $envAnterior) -and !(Test-Path -LiteralPath $envNuevo)) {
    Copy-Item -LiteralPath $envAnterior -Destination $envNuevo
}
```

En la primera terminal, verifique el respaldo antes de ejecutar las migraciones y deje el backend en ejecución.

```powershell
Set-Location (Join-Path $proyecto 'grael-backend')
npm ci
if ($LASTEXITCODE -ne 0) { throw 'Falló npm ci en el backend.' }
docker compose up -d postgres
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL no pudo iniciarse.' }
docker compose exec -T postgres pg_isready -U grael_user -d grael_db
if ($LASTEXITCODE -ne 0) { throw 'Espere que PostgreSQL esté listo y repita la comprobación.' }

$fecha = Get-Date -Format 'yyyyMMdd-HHmmss'
$nombre = "grael-$fecha.dump"
$rutaContenedor = "/tmp/$nombre"
$rutaRespaldo = Join-Path ([Environment]::GetFolderPath('MyDocuments')) $nombre
docker compose exec -T postgres pg_dump -U grael_user -d grael_db -Fc -f $rutaContenedor
if ($LASTEXITCODE -ne 0) { throw 'Falló el respaldo. No ejecute la migración.' }
docker compose exec -T postgres pg_restore --list $rutaContenedor | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'El archivo de respaldo no se pudo leer.' }
docker compose cp "postgres:$rutaContenedor" $rutaRespaldo
if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $rutaRespaldo)) { throw 'No se pudo copiar el respaldo.' }

npm run typeorm -- migration:show
if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer el estado de las migraciones.' }
npm run migration:run
if ($LASTEXITCODE -ne 0) { throw 'La migración no terminó.' }
$env:PORT = '3002'
$env:FRONTEND_URL = 'http://localhost:3003'
npm run dev
```

En otra terminal, use la ruta de su clon.

```powershell
$proyecto = 'C:\Users\zecsoneitor\Videos\AREPOSITORIO\GRAEL_MANUS_V10_FINAL'
Set-Location (Join-Path $proyecto 'grael-frontend')
npm ci
if ($LASTEXITCODE -ne 0) { throw 'Falló npm ci en el frontend.' }
$env:NEXT_PUBLIC_API_URL = 'http://localhost:3002/api/v1'
$env:NEXT_PUBLIC_ENABLE_DEMO = 'false'
.\node_modules\.bin\next.cmd dev -p 3003
```

En una tercera terminal, confirme la conexión y abra el inicio de sesión.

```powershell
Invoke-RestMethod 'http://localhost:3002/health'
Start-Process 'http://localhost:3003/login'
```

La respuesta de salud debe devolver `status = ok` y `db = ok`. Swagger está en `http://localhost:3002/api` en desarrollo. Use los usuarios de la base existente. El seed de demostración se habilita únicamente en una base descartable cuyo nombre comience por `exprmachu_test_`.

## Reproducción de la validación

- Ejecute `npm ci`, `npm run build` y `npm test` en `grael-backend`. Prepare una base PostgreSQL local de pruebas, configure `NODE_ENV=test`, un `JWT_SECRET` local y `DB_*`, aplique las migraciones y ejecute `npm run seed` con `ALLOW_DEMO_SEED=true` para cargar los fixtures.
- Ejecute `node scripts/test-operacion-aislada.mjs` desde la raíz con la API iniciada, `API_BASE_URL=http://127.0.0.1:3002/api/v1` y las variables `GRAEL_TEST_USER`, `GRAEL_TEST_PASSWORD` y `GRAEL_SUPERVISOR_PASSWORD` correspondientes al juego de pruebas. Use copias distintas de la base inicial para `smoke-core-v10.mjs`, `test-concurrency-v10.js` y `test-sunat-integracion.mjs`. El control SQL `scripts/check-data-integrity-v10.sh` es de solo lectura.
- En `grael-frontend`, ejecute `npm ci`, `npm run lint`, `npm run build` y `npx tsc --noEmit`. Con API y frontend iniciados y Chromium instalado mediante `npx playwright install chromium`, ejecute `npm run test:e2e` con las credenciales de la base de pruebas y `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003`. Las pruebas de regresión del dashboard interceptan respuestas deliberadamente para comprobar el caso de texto y el reordenamiento.
- Para reproducir la firma, emisión y conciliación de documentos, prepare los certificados de pruebas y XSD conforme a la [guía de operación tributaria](SUNAT_OPERACION.md).

## Archivos modificados

```text
M	README.md
A	docs/AUDITORIA_OPERATIVA_2026-11-18.md
M	docs/SUNAT_OPERACION.md
M	grael-backend/package-lock.json
M	grael-backend/package.json
A	grael-backend/src/common/decimal.spec.ts
A	grael-backend/src/common/decimal.ts
M	grael-backend/src/common/dto/egresos.dto.ts
M	grael-backend/src/common/dto/reparto.dto.ts
M	grael-backend/src/common/dto/secured-operations.dto.ts
M	grael-backend/src/common/peru-time.ts
M	grael-backend/src/database/entities/bulto.entity.ts
M	grael-backend/src/database/entities/caja.entity.ts
M	grael-backend/src/database/entities/egreso.entity.ts
M	grael-backend/src/database/entities/entrega.entity.ts
M	grael-backend/src/database/entities/flota.entity.ts
M	grael-backend/src/database/entities/mercaderia-item.entity.ts
M	grael-backend/src/database/entities/operaciones.entity.ts
M	grael-backend/src/database/entities/reparto.entity.ts
M	grael-backend/src/database/entities/sede.entity.ts
M	grael-backend/src/database/entities/tarifa.entity.ts
M	grael-backend/src/database/entities/ticket.entity.ts
A	grael-backend/src/database/migrations/1710000027000-PreserveCargoRateScale.ts
M	grael-backend/src/database/seeds/run-seeds.ts
M	grael-backend/src/desembarque/desembarque.service.ts
M	grael-backend/src/egresos/egresos.service.ts
M	grael-backend/src/entregas/entregas.service.ts
A	grael-backend/src/mercaderia/cotizacion.ts
M	grael-backend/src/mercaderia/mercaderia.controller.ts
M	grael-backend/src/mercaderia/mercaderia.service.ts
M	grael-backend/src/pagos/pagos.service.spec.ts
M	grael-backend/src/pagos/pagos.service.ts
M	grael-backend/src/reparto/reparto.controller.ts
M	grael-backend/src/reparto/reparto.module.ts
M	grael-backend/src/reparto/reparto.service.spec.ts
M	grael-backend/src/reparto/reparto.service.ts
M	grael-backend/src/reportes/reportes.service.ts
M	grael-backend/src/tickets/dto/ticket.dto.ts
M	grael-backend/src/tickets/tickets.service.ts
M	grael-backend/src/tracking/tracking.service.ts
M	grael-backend/src/transbordo/transbordo.service.ts
M	grael-frontend/app/(dashboard)/auditoria/page.tsx
M	grael-frontend/app/(dashboard)/bolsa/page.tsx
M	grael-frontend/app/(dashboard)/busqueda-qr/page.tsx
M	grael-frontend/app/(dashboard)/busqueda/page.tsx
M	grael-frontend/app/(dashboard)/caja-diaria/page.tsx
M	grael-frontend/app/(dashboard)/comprobantes/page.tsx
M	grael-frontend/app/(dashboard)/configuracion/page.tsx
M	grael-frontend/app/(dashboard)/dashboard/page.tsx
M	grael-frontend/app/(dashboard)/desembarque/page.tsx
M	grael-frontend/app/(dashboard)/detraccion/page.tsx
M	grael-frontend/app/(dashboard)/egresos/page.tsx
M	grael-frontend/app/(dashboard)/entregas/page.tsx
M	grael-frontend/app/(dashboard)/guias/page.tsx
M	grael-frontend/app/(dashboard)/incidencias/page.tsx
M	grael-frontend/app/(dashboard)/inventario/page.tsx
M	grael-frontend/app/(dashboard)/layout.tsx
M	grael-frontend/app/(dashboard)/manifiesto/page.tsx
M	grael-frontend/app/(dashboard)/pago-sin-comprobante/page.tsx
M	grael-frontend/app/(dashboard)/recepcion/page.tsx
A	grael-frontend/app/(dashboard)/reparto/NuevaPlanilla.tsx
A	grael-frontend/app/(dashboard)/reparto/RetornoPlanilla.tsx
M	grael-frontend/app/(dashboard)/reparto/page.tsx
M	grael-frontend/app/(dashboard)/reportes/page.tsx
M	grael-frontend/app/(dashboard)/transbordo/page.tsx
M	grael-frontend/app/login/page.tsx
M	grael-frontend/app/tracking/page.tsx
M	grael-frontend/components/layout/FloatBar.tsx
M	grael-frontend/components/layout/Sidebar.tsx
M	grael-frontend/components/layout/Topbar.tsx
A	grael-frontend/e2e/dashboard-regresion.spec.ts
A	grael-frontend/e2e/operacion-real.spec.ts
M	grael-frontend/lib/api.ts
A	grael-frontend/lib/demo-session.ts
R093	grael-frontend/lib/data.ts	grael-frontend/lib/demo/data.ts
M	grael-frontend/lib/utils.ts
M	grael-frontend/store/index.ts
M	grael-frontend/types/index.ts
M	scripts/check-data-integrity-v10.sh
M	scripts/test-concurrency-v10.js
A	scripts/test-operacion-aislada.mjs
```

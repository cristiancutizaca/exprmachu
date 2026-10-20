# VALIDACIÓN MANUS V5

## 1. Alcance y criterio

La validación se ejecutó sobre el proyecto existente en `01_PROYECTO_BASE/grael-project/`, con PostgreSQL local `grael_db`, backend en el puerto `3001` y frontend en el puerto `3000`. Se validó que la operación crítica no dependa solamente de compilación: además de builds y pruebas, se verificaron rutas HTTP reales con JWT y respuestas de autorización.

La evidencia HTTP saneada se encuentra en `VALIDACION_HTTP_SMOKE_V5.txt`. El script reproducible es `VALIDACION_HTTP_SMOKE_V5.sh`; no guarda tokens, contraseñas de respuesta ni secretos en el archivo de evidencia.

## 2. Resultado ejecutivo

| Control | Resultado |
|---|---:|
| Backend `npm run build` | PASS |
| Backend `npm run test:unit` | PASS — 7 suites, 20/20 tests |
| Frontend `npm run lint` | PASS — sin warnings ni errores |
| Frontend `npx tsc --noEmit` | PASS |
| Frontend `npm run build` | PASS — 25 rutas generadas |
| `npm run migration:run` | PASS — `No migrations are pending` |
| `npm run seed` | PASS — destinos, sedes, usuarios, tickets y catálogos cargados |
| Health con PostgreSQL real | PASS — `200`, `status=ok`, `db=ok` |
| Login SUPERADMIN y `/auth/me` | PASS — `200`, rol y `sedeId` propagados |
| Ruta protegida sin token | PASS — `401` |
| RBAC ALMACEN en Usuarios | PASS — `403` |
| RBAC ALMACEN en Configuración | PASS — `403` |
| Alta de usuario por ALMACEN | PASS — `403` |
| Reportes dashboard real | PASS — `200` |
| Auditoría real paginada | PASS — `200` |
| Configuración real | PASS — `200` |
| Entregas real | PASS — `200` |

## 3. Comandos reproducibles

```bash
cd grael-backend
npm run migration:run
npm run seed
npm run build
npm run test:unit

cd ../grael-frontend
npm run lint
npx tsc --noEmit
npm run build

cd ..
./VALIDACION_HTTP_SMOKE_V5.sh VALIDACION_HTTP_SMOKE_V5.txt
```

Las variables de base de datos se toman del `.env` local del backend y no se incluyen en la evidencia ni en el paquete final.

## 4. Pruebas unitarias

La suite Jest se ejecutó con `--runInBand`. Las suites verificadas fueron `jwt.strategy`, `bultos.service`, `egresos.service`, `gre.service`, `pagos.service`, `reparto.service` y `ticket-workflow.service`.

| Cobertura | Resultado |
|---|---|
| Propagación de `sedeId` en JWT | PASS |
| Reglas de bultos | PASS |
| Egresos: no autoaprobación, caja y sede | PASS |
| Reparto: elegibilidad e inicio transaccional | PASS |
| Flujo de tickets | PASS |
| Caja y pagos | PASS |
| Emisión GRE mock | PASS |

## 5. Smoke HTTP real

El smoke confirmó `GET /health` en la raíz pública, no bajo `/api/v1`, y validó `POST /api/v1/auth/login` con el usuario `superadmin`. La respuesta de `GET /api/v1/auth/me` incluyó rol `SUPERADMIN` y `sedeId` válido.

Se confirmó que `GET /api/v1/usuarios` sin token devuelve `401`. El usuario `almacen.cusco` recibió `403` al consultar usuarios, consultar configuración y crear usuarios, demostrando que un perfil operativo no obtiene privilegios administrativos por el simple hecho de estar autenticado.

Con SUPERADMIN se verificaron `GET /api/v1/usuarios`, `GET /api/v1/reportes/dashboard`, `GET /api/v1/auditoria?limit=5`, `GET /api/v1/configuracion` y `GET /api/v1/entregas`, todos con respuesta satisfactoria. Los cuerpos completos saneados se conservan en `VALIDACION_HTTP_SMOKE_V5.txt`.

## 6. Base de datos y migraciones

La base `grael_db` quedó alineada con el código mediante **17 migraciones ejecutadas**. La migración de retorno extendió el enum físico `planillas_reparto_detalles_estado_enum` con `RETORNO_PENDIENTE` y `RETORNADO`. La migración de auditoría agregó `IDX_audit_logs_sede_fecha` sobre `(sede_id, fecha_hora)`.

El seed terminó correctamente y fue diseñado para repetirse sin duplicar los datos de catálogo ni usuarios V5. Las credenciales seed se consideran exclusivamente de desarrollo.

## 7. Frontend y API

Las pantallas `/manifiesto`, `/desembarque`, `/reparto`, `/entregas`, `/egresos`, `/dashboard`, `/reportes`, `/configuracion` y `/auditoria` muestran explícitamente si trabajan en Demo o con API real. En sesión JWT, las pantallas principales usan el cliente Axios centralizado y el prefijo `/api/v1`; en Demo no se escriben datos en PostgreSQL.

El build generó 25 rutas, incluyendo `/auditoria` y `/entregas`. El drawer de Operaciones conserva su comportamiento overlay, inicia cerrado, cierra al navegar, al hacer clic externo y con Escape.

## 8. Clasificación de cobertura

| Clasificación | Evidencia |
|---|---|
| Implementado y probado localmente | Auth, RBAC principal, scoping de operaciones endurecidas, manifiesto, llegada, reparto, retorno, egresos, desembarque, entregas/POD, auditoría, reportes y configuración |
| Implementado con alcance parcial | Transbordo e Inventario mantienen partes de UI histórica que todavía deben conectarse de extremo a extremo |
| Pendiente | E2E de navegador automatizado, carga/concurrencia, recuperación ante fallas, restauración de backups, retención de auditoría y revisión formal de aceptación por sede |
| Bloqueado por dependencia externa | GRE/SUNAT legal real, certificado, firma XML, CDR, homologación, numeración oficial y credenciales tributarias |

## 9. Conclusión

El sistema V5 es un **piloto operacional local verificable**, no una certificación productiva. Los resultados PASS documentados incluyen pruebas automatizadas, migraciones, seed, build y smoke HTTP real. Antes de un despliegue se deben rotar credenciales, configurar secretos de producción, establecer respaldos, probar restauración, ejecutar pruebas de carga y completar las dependencias externas de SUNAT.

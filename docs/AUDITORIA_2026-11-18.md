# Auditoría de Expreso Machupicchu · 18/11/2026

La rama `feat/grael-auditoria-sunat-integral` parte de `b5f5929553b8a57e4c7f5154ec9334b79c6c6052`. Al iniciar, GitHub tenía una sola rama visible, siete commits y 243 archivos versionados. Se verificaron Next.js 14.2.3 con React 18, NestJS 10, TypeORM 0.3, 26 migraciones, 18 suites Jest y cuatro escenarios Playwright. El proyecto sigue usando los módulos de logística y caja de GRAEL V10 sobre PostgreSQL.

## Hallazgos y cambios

| Severidad | Ubicación | Causa e impacto | Corrección y comprobación |
| --- | --- | --- | --- |
| Crítico | `gre/gre.service.ts`, `emitir` | Solo había emisión simulada. El proveedor real se detenía y la ruta podía registrar un comprobante simulado como emitido. | Simulador V10 acotado a pruebas. REST GRE y SOAP CPE con estado separado por evidencia y ambiente. Prueba local de ambas transmisiones y de los estados persistidos. |
| Crítico | `gre/gre.service.ts`, `buildXml` | `GRAELDocumento` era un formato interno. | Construcción UBL 2.1, firma XMLDSig, XSD oficial, ZIP y CDR. Prueba con certificado de uso local y verificación criptográfica del XML resultante. |
| Crítico | `database/database.module.ts` y `database/data-source.ts` | Conexión sin verificación del servidor en producción y CLI con configuración distinta. | Opciones compartidas, TLS verificado, CA opcional y credenciales explícitas. Compilación y migraciones locales ejecutadas. |
| Crítico | `package-lock.json` del backend y frontend | Líneas base con 39 y 15 avisos respectivamente, incluidas dependencias directas críticas. | Actualización a Next.js 16.4.6, React 19, NestJS 12 y TypeScript 6 en backend. TypeORM 0.3.31 con glob corregido. `npm audit` reportó 0 avisos en ambos proyectos. |
| Alto | `auth/jwt.strategy.ts`, `auth/auth.service.ts`, `usuario.entity.ts` | Los permisos del JWT quedaban congelados, la relación de usuario podía incluir el hash y el restablecimiento privilegiado no reutilizaba la jerarquía de roles. | Rol y sede vigentes desde PostgreSQL, hash de contraseña excluido de las relaciones y política de asignación aplicada al restablecimiento. Jest de sesión y autenticación HTTP local. |
| Alto | `configuracion/configuracion.service.ts`, `auditoria/auditoria.service.ts` | La configuración operativa se leía y auditaba con sus valores. | Credenciales fuera del catálogo HTTP, claves reservadas bloqueadas y valores de configuración históricos omitidos en las respuestas de auditoría. Verificación por compilación y revisión de las rutas. |
| Alto | `gre/gre-fiscal.service.ts`, `serie_documento` histórico | El formato y contador de pruebas no equivalían a una serie tributaria por RUC. Un corte de red podía dejar incertidumbre. | Series activas por RUC, ambiente, sede y tipo. Bloqueos transaccionales, ZIP inmutable, conciliación y validación de identidad del CDR. Pruebas concurrentes y corte de conexión con recuperación. |
| Alto | `comprobantes/comprobantes.service.ts`, `listar` | Se calculaba «Total cobrado» a partir de los documentos de una sola página. | Agregación desde `pagos` de tickets distintos y totales fiscales desde el estado respaldado por CDR de producción. Prueba con dos pagos, página de tamaño uno y filtro histórico vacío. |
| Alto | `comprobantes/page.tsx`, `manifiesto/page.tsx` | `comprobantes` descargaba HTML y la impresión del manifiesto ejecutaba un aviso. | PDF de verdaderos bytes PDF, descarga y apertura en visor para impresión. Verificación de cabecera PDF en API. |
| Alto | `app/(dashboard)/comprobantes/page.tsx`, representación | Datos empresariales de ejemplo estaban escritos en la vista. | Los documentos internos usan configuración de entorno. Los fiscales conservan la identidad configurada en su instantánea. |
| Alto | `app/(dashboard)/detraccion/page.tsx` | Registros y cálculos de demostración podían confundirse con operaciones SPOT. | Estimación con importe, valor referencial y condiciones explícitas. Prueba de S/ 400 frente a S/ 500 referenciales. |
| Alto | `manifiesto/manifiesto.service.ts`, `crear` y `agregarTickets` | La UI proponía la sede de origen como sede de destino. La asignación concurrente podía evaluar la elegibilidad del mismo ticket. | Ruta con sedes reales, selección automática con custodia y bloqueos. Manejo manual preservado. |
| Alto | `tickets/tickets.service.ts`, `imprimir` | La plantilla HTML solo escapaba los ítems. Los nombres de clientes y rutas iban sin escape. | Todos los campos de texto dinámicos de la impresión pasan por escape HTML. La ruta de impresión se conserva. |
| Medio | `comprobantes/page.tsx`, filtros de fecha | Las entradas de fecha no cambiaban la consulta. | Parámetros de fechas civiles de Perú con límite final exclusivo. Prueba de paginación y rango histórico. |
| Medio | `recepcion/page.tsx`, `transbordo/page.tsx`, `manifiesto/page.tsx` | Algunos catálogos de ejemplo se cargaban incluso en pantallas operativas. | Destinos y programaciones provienen de la API en la sesión real. Se mantuvieron los datos de prueba para la sesión demo. |
| Medio | `clientes/clientes.service.ts`, consulta de RUC | El buscador solo devolvía coincidencias de la ficha interna. | Padrón reducido SUNAT importable atómicamente y consulta con fecha de fuente. La búsqueda interna de DNI sigue identificada como tal. |
| Medio | `manifiesto/manifiesto.service.ts`, `validarFlota` | Solo se revisaba vigencia de licencia contra el instante del servidor. | Verificación por fecha civil y alertas de licencia, habilitación, SOAT e inspección técnica según el registro interno. |
| Medio | `main.ts`, CORS, rutas públicas y Swagger | Los orígenes locales se ofrecían en producción y los contadores de peticiones expirados acumulaban memoria. | Origen configurado en producción, purga de contadores y Swagger habilitable según entorno. Smoke del servidor local aprobado. |
| Bajo | `entregas/entregas.service.spec.ts` | Dos dobles de prueba no implementaban el bloqueo que ejecuta el servicio. | Doble actualizado sin retirar el bloqueo. Se repitieron las pruebas y la carrera de entregas duplicadas. |
| Bajo | `playwright.config.ts`, Chromium | La ruta fija `/usr/bin/chromium` hacía que la suite dependiera de Linux. | Chromium administrado por Playwright como opción por defecto e instalación alternativa configurable. |

Las referencias de backend omiten el prefijo `grael-backend/src/`. Las referencias a páginas corresponden a `grael-frontend/app/(dashboard)/`.

## Alternativas open source revisadas

| Proyecto y revisión | Código evaluado | Decisión |
| --- | --- | --- |
| [Greenter](https://github.com/thegreenter/greenter) · `7f45e7f` · MIT | Plantillas 2022, firma, clientes SUNAT y pruebas de documentos. Actualización reciente de georreferencias y datos de bienes. | Referencia madura. Su uso como dependencia añade PHP y Composer. |
| [Lycet](https://github.com/giansalex/lycet) · `a751e84` · MIT | Controlador Despatch, serializadores, configuración e integración de Greenter. Pruebas Symfony de facturas y configuración. | Referencia de API y manejo de emisor. Usarlo como servicio agrega PHP, despliegue y gestión de datos por empresa. |
| [sunat-service](https://github.com/carlosvidal/sunat-service) · `2f85b49` · MIT | Ruta Despatch, builder TS, clientes REST y SOAP, CDR, ZIP, firma, certificados, PDF/QR y pruebas de idempotencia. | Referencia TypeScript. Su cliente inspeccionado usa `client_credentials` en GRE. El manual SUNAT consultado documenta `password` con RUC y usuario SOL. Se evitó incorporar otro emisor completo. |
| [GasperSoft.SUNAT](https://github.com/GasperSoft/GasperSoft.SUNAT) · `474a37a` · MIT | `ClientGRE.cs`, prueba `GRETransportista1.cs`, casos de remitente, builders UBL y CPE. | Referencia para transportista y remitente. Su uso agrega .NET. El árbol de pruebas incluye material PFX de ejemplo, que quedó fuera de la integración. |
| [SIS-Facturador](https://github.com/userDKX/SIS-Facturador) · `be1d4da` · MIT | Rutas FastAPI, SOAP CPE, GRE REST, template 09, manejo de CDR y pruebas unitarias e integradas. | Referencia técnica. La prueba pública revisada y el repositorio no permiten confirmar la aceptación de un envío empresarial propio en producción. Usarlo agrega Python y un servicio adicional. |
| [CPEForge](https://github.com/alvarez25leo/cpeforge) · `32d05a6` · MIT | Crates XML, firma, REST GRE y WS. Pruebas de transportista con XSD y manejo de archivos. | Referencia para estructura 31, validación de tamaño de archivos y CDR. Como biblioteca supone agregar Rust o mantener un servicio. |
| [Greenter Node](https://github.com/dzhjose/greenter-node) · `1107a53` · MIT | Port NestJS, plantillas CPE, GRE 2022, cliente REST y pruebas XML, CDR y PDF. | Referencia. Revisión de un commit inicial y ejemplos con verificación TLS opcional. No se añadió como dependencia. |

La revisión de repositorios externos fue estática a los SHA indicados. No se ejecutaron sus scripts de producción ni se certificaron sus dependencias. La implementación conserva TypeScript y reutiliza librerías pequeñas de XMLDSig, XML, ZIP, validación XSD y PDF.

## Fuentes y costos

- GRE por SEE del Contribuyente combina REST, credenciales API, usuario SOL, certificado y consulta de CDR. SUNAT exige la constancia aceptada antes del traslado en el supuesto aplicable. SEE-SOL ofrece emisión por el portal. SEE-OSE no es el canal de GRE. [Sistemas de emisión GRE](https://cpe.sunat.gob.pe/node/116).
- Para CPE se verificó el servicio SOAP SEE del Contribuyente, el servicio de consulta y el beta de factura. El RUC determina la obligación de usar OSE cuando corresponde. Verificar esa obligación sigue pendiente porque el RUC tributario de la empresa no se verificó. [SEE del Contribuyente](https://cpe.sunat.gob.pe/sistema_emision/see_contribuyente) · [Listado de contribuyentes](https://cpe.sunat.gob.pe/listado-de-contribuyentes).
- Se confirmaron el SFS gratuito para validación y la opción de certificado CDT gratuito sujeta a elegibilidad. El envío implementado usa endpoints directos. Los costos de OSE, certificado comercial, infraestructura y RENIEC dependen de los servicios aplicables. [Certificado Digital Tributario](https://cpe.sunat.gob.pe/certificado-digital-tributario) · [Sistemas de emisión GRE](https://cpe.sunat.gob.pe/node/116).
- Se leyó el libro GRE `ValidacionesGREv20261106_publicacion_v1.0.xlsx` y se verificó el XSD oficial. SHA-256 del libro `5e1aed6df969afafca284e1cda228d36336ebf1ac31ea84f877f8170f584ec01`. Los XSL 2.0.1 referencian utilidades del entorno SFS. La suite valida XSD y reglas de los casos implementados.

## Evidencia

Las pruebas de APIs, firma y persistencia se ejecutaron con PostgreSQL aislado, archivos XSD oficiales, certificado local y un proveedor de contrato local. Consulte [Operación tributaria](SUNAT_OPERACION.md) para reproducir la configuración. Quedan pendientes la integración externa RENIEC y MTC, la homologación con el RUC de la empresa, los flujos especializados y una prueba operativa multisede antes de despliegue.

| Validación | Resultado observado |
| --- | --- |
| Versiones de prueba | Node 24.22, PostgreSQL 16.15 y Chromium 156 Headless Shell |
| Compilaciones | NestJS y Next.js aprobadas |
| Jest | 18 suites y 70 pruebas aprobadas |
| Playwright | 4 escenarios aprobados. Inicio y cierre de sesión, navegación y detracción, búsqueda QR y caja con apertura, movimiento y cierre. |
| ESLint | 0 errores y 21 avisos de frontend tras la actualización de reglas |
| Migración desde cero | 28 migraciones aplicadas |
| Actualización desde V10 | Base sembrada con 26 migraciones. Se conservaron los 6 tickets, 9 usuarios y 3 pagos. El CPE de prueba ya existente conservó su identificador y pasó a `SIMULADO`. |
| Integración de APIs | GRE 31 y 09, XMLDSig verificada, XSD, CDR, conciliación, factura y boleta, PDF, cobros, detracción, padrón y manifiesto aprobados |
| Concurrencia | Seis casos de diez solicitudes. Sin errores de servidor. Diez correlativos distintos en cada caso GRE/CPE simulado. Un ganador en apertura, cierre, cobro y entrega duplicada. |
| Integridad | 14 comprobaciones con cero infracciones |
| Rendimiento local | 120 solicitudes sin errores. p95 de una ejecución de referencia en milisegundos para health 4, dashboard 6, inventario 21 y transbordo 12. |
| Dependencias | Backend 39 → 0 y frontend 15 → 0 avisos en `npm audit` |

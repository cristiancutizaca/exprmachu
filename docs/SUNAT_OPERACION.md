# Operación tributaria de Expreso Machupicchu

## Instalación de pruebas

Use Node.js 24.9 o posterior y PostgreSQL 16 o posterior. Instale ambos proyectos con `npm ci`. Configure los valores en `grael-backend/.env.example` y ejecute las migraciones. `npm run seed` instala datos de prueba y requiere un entorno de desarrollo o pruebas.

SUNAT publica los [XSD CPE UBL 2.1](https://cpe.sunat.gob.pe/guias-y-manuales) y el [XSD específico GRE](https://cpe.sunat.gob.pe/node/116). Extraiga los directorios `common` y `maindoc` del paquete CPE 2.1, coloque el XSD GRE en `maindoc/UBL-DespatchAdvice-2.1.xsd` y configure `SUNAT_XSD_DIR` al directorio padre. La validación utiliza los archivos locales. El libro GRE del 06/11/2026 y los XSL 2.0.1 se revisaron como fuentes de reglas. La validación local implementa reglas para los casos nacionales cubiertos. Las reglas del padrón, los catálogos completos y otras consultas de SUNAT se resuelven con el servicio externo y su CDR.

### Perfiles

| Perfil | GRE | CPE |
| --- | --- | --- |
| Pruebas locales | `SUNAT_GRE_ENV=TEST` con servidor en `127.0.0.1` | `SUNAT_CPE_ENV=TEST` con servidor local o beta oficial de factura cuando se deja la URL de pruebas vacía |
| Producción | REST GRE, OAuth con usuario SOL y credenciales de API | SOAP SEE del Contribuyente con usuario SOL |
| Simulación histórica | `NODE_ENV=test GRE_PROVIDER=MOCK` en el endpoint V10 | Comprobante interno con estado `SIMULADO` |

Los perfiles usan `SUNAT_GRE_TEST_*`, `SUNAT_CPE_TEST_*`, `SUNAT_GRE_PRODUCTION_*` o `SUNAT_CPE_PRODUCTION_*`. Comparten los nombres de configuración `RUC`, `RAZON_SOCIAL`, `DIRECCION`, `CERT_FILE`, `KEY_FILE` y `KEY_PASSWORD` si corresponde. GRE además usa `CLIENT_ID`, `CLIENT_SECRET`, `SOL_USER`, `SOL_PASSWORD` y opcionalmente `REGISTRO_MTC`. CPE usa `SOL_USER`, `SOL_PASSWORD`, `UBIGEO` y `CUENTA_DETRACCION` para el flujo SPOT. Los archivos de certificado y clave deben ser PEM y residir fuera del repositorio.

En producción configure `NODE_ENV=production`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `JWT_SECRET` y `FRONTEND_URL`. PostgreSQL exige verificación TLS. Indique `DB_CA_FILE` si el servidor utiliza una autoridad de certificación privada.

La transmisión productiva requiere autorización empresarial para usar el RUC, el certificado y las credenciales. Confirme la calidad de emisor y el régimen CPE aplicable en el [listado oficial](https://cpe.sunat.gob.pe/listado-de-contribuyentes). Habilite `SUNAT_GRE_PRODUCTION_ENABLED=true` o `SUNAT_CPE_PRODUCTION_ENABLED=true` tras esa verificación. Para el envío SOAP directo, `SUNAT_CPE_PRODUCTION_REGIMEN=SEE_CONTRIBUYENTE` representa la confirmación del régimen. Un contribuyente obligado a SEE-OSE requiere el canal autorizado del operador.

## Flujos

- **GRE.** Registre la serie T o V con la sede y el último correlativo ya utilizado. El borrador se vincula a un ticket y, opcionalmente, su manifiesto. Valide el XML firmado y envíe. Consulte el ticket para descargar la constancia. La GRE transportista admite el pagador del flete, el subcontratador y la referencia a GRE remitente que sustenta los bienes. La GRE remitente usa el RUC emisor configurado y contempla las modalidades pública y privada del flujo nacional.
- **Conciliación GRE.** Un envío con pérdida de respuesta conserva su correlativo y ZIP. Cuando se recupera el ticket, un supervisor o superadmin puede vincularlo presentando un CDR que coincida con el documento. Los rechazos de autorización 401 y 403 permiten reintentar con el archivo original.
- **CPE.** Registre una serie F o B con su sede, el último correlativo y su establecimiento SUNAT. La emisión usa importes del ticket en PEN, con IGV de 18%. La factura admite contado o crédito de una cuota. La boleta de este flujo usa contado. El estado de aceptación de pruebas no forma parte del facturado tributario.
- **Detracción.** La tasa para el caso implementado es 4% sobre el mayor de los valores pertinentes cuando supera S/ 400. El operador confirma las condiciones y el importe referencial aplicable. El resultado es una estimación y el depósito permanece sujeto a su constancia. [Orientación SUNAT](https://orientacion.sunat.gob.pe/como-se-aplican-las-detracciones-en-el-transporte-de-bienes-por-via-terrestre).
- **Recaudación.** La pantalla de comprobantes agrega los pagos registrados de los tickets que cumplen los filtros. La fecha de los documentos y los pagos del período usan el día civil de Lima. El saldo usa las cobranzas del ticket y el importe tributario aceptado.
- **Padrón RUC.** Obtenga el [padrón reducido de SUNAT](https://orientacion.sunat.gob.pe/7-padron-reducido-del-ruc). Extraiga el TXT, confirme la fecha de publicación y ejecute `node scripts/importar-padron-ruc.mjs /ruta/padron_reducido_ruc.txt AAAA-MM-DD`. El importador usa la conexión PostgreSQL de entorno. Recepción indica el día del padrón consultado.
- **Manifiesto y flota.** El manifiesto puede reunir automáticamente los tickets elegibles por ruta, sede y fecha. Su PDF usa la información operativa registrada. La verificación local indica el estado documentado de habilitación, SOAT, inspección técnica y licencia. Para confirmación oficial consulte el MTC.
- **DNI.** Recepción conserva la búsqueda de clientes propios y la captura manual. La [consulta externa RENIEC](https://www.gob.pe/10907-solicitar-acceso-al-servicio-de-verificacion-de-identidad-de-personas-en-reniec) requiere el canal y convenio autorizados.

## Repetir las pruebas

- Backend. Ejecute `npm run build` y `npm run test:unit` desde `grael-backend`.
- PostgreSQL. Use una base de pruebas local cuyo nombre empiece por `exprmachu_test_`. Ejecute `npm run migration:run` y habilite `ALLOW_DEMO_SEED=true` al ejecutar `npm run seed`. Levante el backend con `NODE_ENV=test`.
- Integración SUNAT. Use un `DB_NAME` que comience con `exprmachu_test_`, un certificado de pruebas y los XSD indicados arriba. Configure las dos variables `SUNAT_*_ENV=TEST` y las dos URL base a la misma dirección `http://127.0.0.1:puerto` libre. El script levanta el proveedor local y prueba las rutas ya iniciadas del backend. Exporte las variables al ejecutar `npm run test:sunat`.
- Navegador. En el frontend, ejecute `npx playwright install chromium`, compile con `NEXT_PUBLIC_API_URL=http://127.0.0.1:3002/api/v1`, levante Next.js en el puerto 3003 y ejecute `npm run test:e2e` con `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003`. `PLAYWRIGHT_CHROMIUM_PATH` admite un Chromium instalado por el operador.
- Validaciones históricas. Con el backend y PostgreSQL de pruebas disponibles, ejecute `node scripts/smoke-core-v10.mjs` desde la raíz, y `npm run test:concurrency` y `npm run test:integrity` desde el backend. Para `npm run test:performance`, configure `API_BASE_URL` con el origen HTTP y `GRAEL_PERF_USER` y `GRAEL_PERF_PASSWORD` con un usuario de pruebas.

## Alcance de la validación

El proveedor local sirve para pruebas de contrato, firma, estados y concurrencia. SUNAT informa que GRE REST carece de beta oficial y ofrece su validador SFS. La autorización del RUC, la presentación en SUNAT con el certificado empresarial y la aceptación operativa de producción requieren una siguiente validación. Los flujos de notas, comunicaciones de baja, anulaciones tributarias, guías por evento y casos especiales aduaneros quedan pendientes. [FAQ GRE](https://cpe.sunat.gob.pe/node/122).

Fuente de reglas GRE con fecha 06/11/2026: [Sistemas de emisión GRE](https://cpe.sunat.gob.pe/node/116). Fuentes para el contrato: [manuales técnicos GRE](https://cpe.sunat.gob.pe/landing/guia-de-remision-electronica-gre) y [SEE del Contribuyente](https://cpe.sunat.gob.pe/sistema_emision/see_contribuyente).

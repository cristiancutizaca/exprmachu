# Validación visual y login V7

- Frontend probado en `http://localhost:3003` con backend aislado en `http://localhost:3002`.
- El primer intento mostró `Credenciales incorrectas` por CORS: el navegador no podía llamar al backend en 3002.
- Se corrigió `grael-backend/src/main.ts` para permitir explícitamente `http://localhost:3003` además de `FRONTEND_URL`, 3000 y 3001.
- Tras recompilar/reiniciar backend, login real de `jesus.cutisaca` redirigió correctamente a `/recepcion` y mostró `ADM DE SEDE`, `CUSCO`, Sidebar V7 y toast de bienvenida.
- La pantalla de Recepción de Carga cargó destinos, programaciones y formulario operativo; la evidencia visual fue capturada durante la navegación.
- Demo no se activó silenciosamente: la sesión observada utilizó JWT real del endpoint `/api/v1/auth/login`.
- La instancia temporal fue levantada solo para validación local; no representa despliegue productivo.


# Arquitectura GRAEL V6

GRAEL V6 conserva un monorepo de dos aplicaciones. Next.js presenta pantallas y modo Demo explícito; Axios comunica con `/api/v1` y adjunta el JWT. NestJS concentra guards, DTOs, servicios y transacciones. TypeORM mantiene migraciones como fuente de verdad y PostgreSQL 16 persiste estados, relaciones e índices.

```text
Usuario
  ↓ JWT / UI Demo explícito
Next.js + Zustand + Axios
  ↓ /api/v1
NestJS: Guards → DTOs → Servicios → Transacciones
  ↓
PostgreSQL 16: tickets, bultos, sedes, manifests, desembarque físico,
incidencias, pagos, auditoría, tracking y GRE MOCK persistente
```

El backend es la única autoridad para permisos, sede efectiva, estados, caja, importes y movimientos físicos. Tracking registra eventos de custodia; auditoría registra cambios relevantes y queda consultable con scope. Los errores de dominio se devuelven con mensajes en español y códigos cuando el flujo necesita distinguir una regla.

El proveedor GRE está desacoplado por configuración. MOCK genera XML simulado y persiste el resultado; SUNAT no tiene credenciales, firma, homologación ni endpoints configurados y responde como dependencia externa bloqueada.

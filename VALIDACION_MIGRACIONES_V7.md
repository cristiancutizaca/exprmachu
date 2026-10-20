# VALIDACION_MIGRACIONES_V7

Las nuevas columnas, enums y entidades se agregaron mediante migraciones TypeORM incrementales. La base de trabajo fue actualizada desde V6 y terminó con 22 registros en la tabla `migrations`.

| Validación | Resultado |
|---|---|
| Upgrade sobre DB V6 existente | **PASS local** |
| Migraciones V7 aplicadas | **PASS local** |
| Seed primera ejecución | **PASS local** |
| Seed segunda ejecución | **PASS local; sin duplicación observada** |
| Conteo final de migraciones | 22 |
| Clean install V1→V7 | Debe repetirse en una DB totalmente nueva antes de UAT integral |

Las migraciones relevantes incluyen dimensiones nacionales de Ticket/Pago/Destino, movimiento `INGRESO_DESEMBARQUE` e incidencia `BULTO_EXTRA`. No se utilizó sincronización automática de esquema. El restore drill confirmó que la tabla de migraciones y los datos principales se preservan.

El estado es **IMPLEMENTADO Y PROBADO localmente** para upgrade y aplicación en la base disponible; la clean install separada y automatizada queda **PENDIENTE** si se requiere una segunda instancia PostgreSQL dedicada.

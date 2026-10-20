import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Bootstrap del esquema legacy que las migraciones V2 y el seed ya utilizaban.
 * La migración es idempotente en tablas/índices/constraints y no elimina datos.
 */
export class CreateBaseSchemaV11709999999000 implements MigrationInterface {
  name = 'CreateBaseSchemaV11709999999000'

  private async enum(queryRunner: QueryRunner, name: string, values: string[]) {
    const literals = values.map(value => `'${value.replace(/'/g, "''")}'`).join(',')
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."${name}" AS ENUM (${literals}); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  }

  private async constraint(queryRunner: QueryRunner, table: string, name: string, sql: string) {
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN ${sql}; END IF; END $$`)
  }

  private async index(queryRunner: QueryRunner, sql: string) {
    await queryRunner.query(sql)
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)

    await this.enum(queryRunner, 'rol_usuario_enum', ['ADMIN_SEDE', 'OPERADOR', 'SUPERVISOR', 'CAJERO'])
    await this.enum(queryRunner, 'tipo_cliente_enum', ['NATURAL', 'JURIDICO'])
    await this.enum(queryRunner, 'estado_ticket_enum', ['PENDIENTE', 'EN_TRANSITO', 'DESEMBARQUE_EN_DESTINO', 'ENTREGADO', 'ANULADO'])
    await this.enum(queryRunner, 'tipo_entrega_enum', ['AGENCIA', 'REPARTO'])
    await this.enum(queryRunner, 'tipo_pago_enum', ['ORIGEN', 'DESTINO'])
    await this.enum(queryRunner, 'estado_manifiesto_enum', ['ABIERTO', 'EN_RUTA', 'LLEGADO', 'CERRADO'])
    await this.enum(queryRunner, 'estado_transbordo_enum', ['ABIERTO', 'EN_TRANSITO', 'LLEGADO', 'CERRADO'])
    await this.enum(queryRunner, 'metodo_pago_enum', ['EFECTIVO', 'TRANSFERENCIA', 'YAPE', 'PLIN', 'TARJETA'])
    await this.enum(queryRunner, 'tipo_comprobante_enum', ['BOLETA', 'FACTURA', 'NOTA_CREDITO'])
    await this.enum(queryRunner, 'estado_desembarque_enum', ['PENDIENTE_VERIFICACION', 'VERIFICADO', 'ENTREGADO', 'OBSERVADO'])

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "usuarios" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" varchar(60) NOT NULL,
      "password" varchar(120) NOT NULL, "nombre" varchar(80) NOT NULL, "apellido" varchar(100) NOT NULL,
      "email" varchar(80), "telefono" varchar(20), "rol" "public"."rol_usuario_enum" NOT NULL DEFAULT 'OPERADOR',
      "sede" varchar(60) NOT NULL DEFAULT 'CUSCO', "activo" boolean NOT NULL DEFAULT true,
      "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_usuarios_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_usuarios_username" UNIQUE ("username"))`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "destinos" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" varchar(120) NOT NULL, "codigo" varchar(20) NOT NULL,
      "departamento" varchar(80), "provincia" varchar(80), "activo" boolean NOT NULL DEFAULT true,
      "created_at" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_destinos_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_destinos_codigo" UNIQUE ("codigo"))`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "clientes" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tipo" "public"."tipo_cliente_enum" NOT NULL DEFAULT 'NATURAL',
      "razon_social" varchar(160) NOT NULL, "ruc" varchar(11), "dni" varchar(8), "telefono" varchar(20),
      "email" varchar(100), "direccion" varchar(200), "activo" boolean NOT NULL DEFAULT true,
      "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_clientes_id" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "configuracion" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "clave" varchar(80) NOT NULL, "valor" text NOT NULL,
      "descripcion" varchar(220), "tipo" varchar(30) NOT NULL DEFAULT 'STRING', "editable" boolean NOT NULL DEFAULT true,
      "updated_at" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_configuracion_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_configuracion_clave" UNIQUE ("clave"))`)

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "tickets" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "numero_ticket" varchar(20) NOT NULL,
      "fecha_emision" timestamp NOT NULL DEFAULT now(), "fecha_viaje" date NOT NULL,
      "estado" "public"."estado_ticket_enum" NOT NULL DEFAULT 'PENDIENTE',
      "tipo_entrega" "public"."tipo_entrega_enum" NOT NULL DEFAULT 'AGENCIA',
      "tipo_pago" "public"."tipo_pago_enum" NOT NULL DEFAULT 'DESTINO',
      "origen_id" uuid NOT NULL, "destino_id" uuid NOT NULL, "remitente_id" uuid NOT NULL, "destinatario_id" uuid NOT NULL,
      "programacion_id" uuid, "atencion1" varchar(100), "atencion2" varchar(100),
      "sub_total" numeric(12,2) NOT NULL DEFAULT 0, "igv" numeric(12,2) NOT NULL DEFAULT 0, "total" numeric(12,2) NOT NULL DEFAULT 0,
      "pagado" boolean NOT NULL DEFAULT false, "fecha_pago" timestamp, "metodo_pago" varchar(30), "monto_pagado" numeric(12,2),
      "anulado" boolean NOT NULL DEFAULT false, "motivo_anulacion" varchar(200), "fecha_anulacion" timestamp,
      "usuario_creacion_id" uuid, "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_tickets_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_tickets_numero" UNIQUE ("numero_ticket"))`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "programaciones" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "codigo" varchar(40) NOT NULL, "origen_id" uuid NOT NULL,
      "destino_id" uuid NOT NULL, "hora_salida" time NOT NULL, "bus" varchar(20), "activo" boolean NOT NULL DEFAULT true,
      "created_at" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_programaciones_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_programaciones_codigo" UNIQUE ("codigo"))`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "guias_remision" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "codigo" varchar(60) NOT NULL, "ticket_id" uuid NOT NULL,
      CONSTRAINT "PK_guias_remision_id" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "mercaderia_items" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tipo" varchar(60) NOT NULL, "descripcion" varchar(200),
      "peso_total" numeric(10,3) NOT NULL DEFAULT 0, "costo_kg" numeric(10,2) NOT NULL DEFAULT 5.5,
      "cantidad" integer NOT NULL DEFAULT 1, "es_peso_volumen" boolean NOT NULL DEFAULT false,
      "sub_total" numeric(12,2) NOT NULL DEFAULT 0, "igv" numeric(12,2) NOT NULL DEFAULT 0, "total" numeric(12,2) NOT NULL DEFAULT 0,
      "ticket_id" uuid NOT NULL, CONSTRAINT "PK_mercaderia_items_id" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "pagos" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticket_id" uuid NOT NULL, "monto" numeric(12,2) NOT NULL,
      "metodo_pago" "public"."metodo_pago_enum" NOT NULL, "referencia_banco" varchar(60), "numero_operacion" varchar(60),
      "usuario_id" uuid, "created_at" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_pagos_id" PRIMARY KEY ("id"))`)

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "manifiestos" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "codigo" varchar(30) NOT NULL, "programacion_id" uuid,
      "origen_id" uuid NOT NULL, "destino_id" uuid NOT NULL, "fecha_viaje" date NOT NULL, "chofer" varchar(120), "placa" varchar(20),
      "estado" "public"."estado_manifiesto_enum" NOT NULL DEFAULT 'ABIERTO', "usuario_id" uuid,
      "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_manifiestos_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_manifiestos_codigo" UNIQUE ("codigo"))`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "transbordos" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "codigo" varchar(30) NOT NULL, "origen_id" uuid NOT NULL,
      "destino_id" uuid NOT NULL, "desembarque_id" uuid, "estado" "public"."estado_transbordo_enum" NOT NULL DEFAULT 'ABIERTO',
      "usuario_id" uuid, "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_transbordos_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_transbordos_codigo" UNIQUE ("codigo"))`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "manifiesto_tickets" (
      "manifiesto_id" uuid NOT NULL, "ticket_id" uuid NOT NULL,
      CONSTRAINT "PK_manifiesto_tickets" PRIMARY KEY ("manifiesto_id", "ticket_id"))`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "transbordo_tickets" (
      "transbordo_id" uuid NOT NULL, "ticket_id" uuid NOT NULL,
      CONSTRAINT "PK_transbordo_tickets" PRIMARY KEY ("transbordo_id", "ticket_id"))`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "comprobantes" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tipo" "public"."tipo_comprobante_enum" NOT NULL,
      "serie" varchar(10) NOT NULL, "numero" varchar(10) NOT NULL, "ticket_id" uuid, "cliente_id" uuid NOT NULL,
      "sub_total" numeric(12,2) NOT NULL, "igv" numeric(12,2) NOT NULL, "total" numeric(12,2) NOT NULL,
      "estado" varchar(30) NOT NULL DEFAULT 'EMITIDO', "usuario_id" uuid, "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_comprobantes_id" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "desembarques" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticket_id" uuid NOT NULL,
      "estado" "public"."estado_desembarque_enum" NOT NULL DEFAULT 'PENDIENTE_VERIFICACION', "observacion" varchar(200),
      "dni_recibe" varchar(60), "nombre_recibe" varchar(160), "hora_entrega" timestamp, "manifiesto_ref" varchar(30),
      "usuario_id" uuid, "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_desembarques_id" PRIMARY KEY ("id"))`)

    await this.constraint(queryRunner, 'programaciones', 'FK_programaciones_origen', 'ALTER TABLE "programaciones" ADD CONSTRAINT "FK_programaciones_origen" FOREIGN KEY ("origen_id") REFERENCES "destinos"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'programaciones', 'FK_programaciones_destino', 'ALTER TABLE "programaciones" ADD CONSTRAINT "FK_programaciones_destino" FOREIGN KEY ("destino_id") REFERENCES "destinos"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'tickets', 'FK_tickets_origen', 'ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_origen" FOREIGN KEY ("origen_id") REFERENCES "destinos"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'tickets', 'FK_tickets_destino', 'ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_destino" FOREIGN KEY ("destino_id") REFERENCES "destinos"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'tickets', 'FK_tickets_remitente', 'ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_remitente" FOREIGN KEY ("remitente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'tickets', 'FK_tickets_destinatario', 'ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_destinatario" FOREIGN KEY ("destinatario_id") REFERENCES "clientes"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'tickets', 'FK_tickets_programacion', 'ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_programacion" FOREIGN KEY ("programacion_id") REFERENCES "programaciones"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'tickets', 'FK_tickets_usuario', 'ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_usuario" FOREIGN KEY ("usuario_creacion_id") REFERENCES "usuarios"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'guias_remision', 'FK_guias_ticket', 'ALTER TABLE "guias_remision" ADD CONSTRAINT "FK_guias_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE')
    await this.constraint(queryRunner, 'mercaderia_items', 'FK_mercaderia_ticket', 'ALTER TABLE "mercaderia_items" ADD CONSTRAINT "FK_mercaderia_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE')
    await this.constraint(queryRunner, 'pagos', 'FK_pagos_ticket', 'ALTER TABLE "pagos" ADD CONSTRAINT "FK_pagos_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'pagos', 'FK_pagos_usuario', 'ALTER TABLE "pagos" ADD CONSTRAINT "FK_pagos_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'manifiestos', 'FK_manifiestos_programacion', 'ALTER TABLE "manifiestos" ADD CONSTRAINT "FK_manifiestos_programacion" FOREIGN KEY ("programacion_id") REFERENCES "programaciones"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'manifiestos', 'FK_manifiestos_origen', 'ALTER TABLE "manifiestos" ADD CONSTRAINT "FK_manifiestos_origen" FOREIGN KEY ("origen_id") REFERENCES "destinos"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'manifiestos', 'FK_manifiestos_destino', 'ALTER TABLE "manifiestos" ADD CONSTRAINT "FK_manifiestos_destino" FOREIGN KEY ("destino_id") REFERENCES "destinos"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'manifiestos', 'FK_manifiestos_usuario', 'ALTER TABLE "manifiestos" ADD CONSTRAINT "FK_manifiestos_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'transbordos', 'FK_transbordos_origen', 'ALTER TABLE "transbordos" ADD CONSTRAINT "FK_transbordos_origen" FOREIGN KEY ("origen_id") REFERENCES "destinos"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'transbordos', 'FK_transbordos_destino', 'ALTER TABLE "transbordos" ADD CONSTRAINT "FK_transbordos_destino" FOREIGN KEY ("destino_id") REFERENCES "destinos"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'transbordos', 'FK_transbordos_usuario', 'ALTER TABLE "transbordos" ADD CONSTRAINT "FK_transbordos_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'comprobantes', 'FK_comprobantes_ticket', 'ALTER TABLE "comprobantes" ADD CONSTRAINT "FK_comprobantes_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'comprobantes', 'FK_comprobantes_cliente', 'ALTER TABLE "comprobantes" ADD CONSTRAINT "FK_comprobantes_cliente" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'comprobantes', 'FK_comprobantes_usuario', 'ALTER TABLE "comprobantes" ADD CONSTRAINT "FK_comprobantes_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'desembarques', 'FK_desembarques_ticket', 'ALTER TABLE "desembarques" ADD CONSTRAINT "FK_desembarques_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'desembarques', 'FK_desembarques_usuario', 'ALTER TABLE "desembarques" ADD CONSTRAINT "FK_desembarques_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'manifiesto_tickets', 'FK_manifiesto_tickets_manifest', 'ALTER TABLE "manifiesto_tickets" ADD CONSTRAINT "FK_manifiesto_tickets_manifest" FOREIGN KEY ("manifiesto_id") REFERENCES "manifiestos"("id") ON DELETE CASCADE')
    await this.constraint(queryRunner, 'manifiesto_tickets', 'FK_manifiesto_tickets_ticket', 'ALTER TABLE "manifiesto_tickets" ADD CONSTRAINT "FK_manifiesto_tickets_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE')
    await this.constraint(queryRunner, 'transbordo_tickets', 'FK_transbordo_tickets_transbordo', 'ALTER TABLE "transbordo_tickets" ADD CONSTRAINT "FK_transbordo_tickets_transbordo" FOREIGN KEY ("transbordo_id") REFERENCES "transbordos"("id") ON DELETE CASCADE')
    await this.constraint(queryRunner, 'transbordo_tickets', 'FK_transbordo_tickets_ticket', 'ALTER TABLE "transbordo_tickets" ADD CONSTRAINT "FK_transbordo_tickets_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE')

    await this.index(queryRunner, `CREATE INDEX IF NOT EXISTS "IDX_tickets_fecha_emision" ON "tickets" ("fecha_emision")`)
    await this.index(queryRunner, `CREATE INDEX IF NOT EXISTS "IDX_tickets_estado" ON "tickets" ("estado")`)
    await this.index(queryRunner, `CREATE INDEX IF NOT EXISTS "IDX_clientes_ruc" ON "clientes" ("ruc")`)
    await this.index(queryRunner, `CREATE INDEX IF NOT EXISTS "IDX_clientes_dni" ON "clientes" ("dni")`)
    await this.index(queryRunner, `CREATE INDEX IF NOT EXISTS "IDX_pagos_ticket" ON "pagos" ("ticket_id")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No se eliminan tablas legacy en rollback: la migración puede ejecutarse sobre una DB V1 con datos.
    // Las migraciones posteriores son responsables de sus propias tablas/columnas.
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateV2CoreOperations1710000000000 implements MigrationInterface {
  name = 'CreateV2CoreOperations1710000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)

    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."sedes_tipo_enum" AS ENUM ('AGENCIA','SEDE_PRINCIPAL','ALMACEN','PUNTO_RECOJO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."almacenes_tipo_enum" AS ENUM ('PRINCIPAL','RECEPCION','TRANSBORDO','REPARTO','OBSERVADOS','ENTREGADOS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."almacenes_estado_enum" AS ENUM ('ACTIVO','INACTIVO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."ubicaciones_almacen_tipo_enum" AS ENUM ('RECEPCION','ZONA','TRANSBORDO','REPARTO','OBSERVADOS','ENTREGADOS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."vehiculos_estado_enum" AS ENUM ('ACTIVO','MANTENIMIENTO','INACTIVO','BLOQUEADO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."conductores_estado_enum" AS ENUM ('ACTIVO','INACTIVO','BLOQUEADO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."bultos_estado_enum" AS ENUM ('RECEPCIONADO','EN_ALMACEN','PROGRAMADO','CARGADO','EN_TRANSITO','TRANSBORDO','LLEGADO','DESEMBARCADO','LISTO_RECOJO','EN_REPARTO','ENTREGADO','OBSERVADO','FALTANTE','DEVUELTO','ANULADO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."tracking_eventos_tipo_evento_enum" AS ENUM ('RECEPCIONADO','INGRESO_ALMACEN','UBICADO','PROGRAMADO','CARGANDO','CARGADO','DESPACHADO','EN_TRANSITO','TRANSBORDO_INICIADO','TRANSBORDO_COMPLETADO','LLEGADA_SEDE','DESEMBARCADO','OBSERVADO','LISTO_RECOJO','SALIDA_REPARTO','INTENTO_ENTREGA','ENTREGADO','DEVUELTO','ANULADO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "sedes" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "codigo" varchar(20) NOT NULL,
      "nombre" varchar(120) NOT NULL,
      "tipo" "public"."sedes_tipo_enum" NOT NULL DEFAULT 'AGENCIA',
      "ruc" varchar(11), "departamento" varchar(80), "provincia" varchar(80), "distrito" varchar(80),
      "ubigeo" varchar(10), "direccion" varchar(220), "referencia" varchar(220), "telefono" varchar(30),
      "correo" varchar(120), "latitud" numeric(10,7), "longitud" numeric(10,7), "activo" boolean NOT NULL DEFAULT true,
      "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_sedes_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_sedes_codigo" UNIQUE ("codigo")
    )`)

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "almacenes" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sede_id" uuid NOT NULL, "codigo" varchar(30) NOT NULL,
      "nombre" varchar(120) NOT NULL, "tipo" "public"."almacenes_tipo_enum" NOT NULL DEFAULT 'PRINCIPAL',
      "estado" "public"."almacenes_estado_enum" NOT NULL DEFAULT 'ACTIVO', "capacidadOpcional" integer,
      "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_almacenes_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_almacenes_sede_codigo" UNIQUE ("sede_id","codigo"),
      CONSTRAINT "FK_almacenes_sede" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    )`)

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "ubicaciones_almacen" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "almacen_id" uuid NOT NULL, "codigo" varchar(30) NOT NULL,
      "nombre" varchar(120) NOT NULL, "tipo" "public"."ubicaciones_almacen_tipo_enum" NOT NULL DEFAULT 'ZONA',
      "activo" boolean NOT NULL DEFAULT true, "capacidadOpcional" integer,
      "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_ubicaciones_almacen_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_ubicaciones_almacen_codigo" UNIQUE ("almacen_id","codigo"),
      CONSTRAINT "FK_ubicaciones_almacen_almacen" FOREIGN KEY ("almacen_id") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    )`)

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "vehiculos" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "placa" varchar(12) NOT NULL, "marca" varchar(80), "modelo" varchar(80),
      "anio" smallint, "tipo" varchar(50), "numeroEjes" smallint, "capacidadKg" numeric(12,2), "capacidadM3" numeric(12,3),
      "propietario" varchar(160), "es_tercero" boolean NOT NULL DEFAULT false, "ruc_propietario" varchar(11), "tuc" varchar(60),
      "habilitacion_mtc" varchar(80), "fecha_vencimiento_habilitacion" date, "soat" varchar(80), "fecha_vencimiento_soat" date,
      "citv" varchar(80), "fecha_vencimiento_citv" date, "estado" "public"."vehiculos_estado_enum" NOT NULL DEFAULT 'ACTIVO',
      "observaciones" text, "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_vehiculos_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_vehiculos_placa" UNIQUE ("placa")
    )`)

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "conductores" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "dni" varchar(8) NOT NULL, "nombres" varchar(100) NOT NULL,
      "apellidos" varchar(120) NOT NULL, "telefono" varchar(30), "direccion" varchar(220), "licencia" varchar(30),
      "categoria_licencia" varchar(10), "fecha_vencimiento_licencia" date, "empresa" varchar(160), "es_tercero" boolean NOT NULL DEFAULT false,
      "estado" "public"."conductores_estado_enum" NOT NULL DEFAULT 'ACTIVO', "observaciones" text,
      "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_conductores_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_conductores_dni" UNIQUE ("dni")
    )`)

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "tarifas" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "origen_id" uuid NOT NULL, "destino_id" uuid NOT NULL,
      "tipo_mercaderia" varchar(80) NOT NULL, "precio_kg" numeric(12,4) NOT NULL DEFAULT 0, "precio_volumen" numeric(12,4) NOT NULL DEFAULT 0,
      "precio_minimo" numeric(12,2) NOT NULL DEFAULT 0, "recargo_reparto" numeric(12,2) NOT NULL DEFAULT 0,
      "recargo_fragil" numeric(12,2) NOT NULL DEFAULT 0, "recargo_express" numeric(12,2) NOT NULL DEFAULT 0,
      "porcentaje_seguro" numeric(7,4) NOT NULL DEFAULT 0, "vigencia_desde" date NOT NULL,
      "vigencia_hasta" date, "activo" boolean NOT NULL DEFAULT true, "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_tarifas_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_tarifas_origen" FOREIGN KEY ("origen_id") REFERENCES "destinos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
      CONSTRAINT "FK_tarifas_destino" FOREIGN KEY ("destino_id") REFERENCES "destinos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    )`)

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "bultos" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticket_id" uuid NOT NULL, "codigo" varchar(40) NOT NULL,
      "numero" integer NOT NULL, "tipo" varchar(60), "descripcion" text, "cantidad" integer NOT NULL DEFAULT 1,
      "peso_real" numeric(12,3), "peso_volumetrico" numeric(12,3), "alto" numeric(10,3), "ancho" numeric(10,3), "largo" numeric(10,3),
      "volumen" numeric(12,6), "valor_declarado" numeric(12,2), "fragil" boolean NOT NULL DEFAULT false, "requiere_cuidado" boolean NOT NULL DEFAULT false,
      "codigo_barras" varchar(80), "qr_payload" text, "estado" "public"."bultos_estado_enum" NOT NULL DEFAULT 'RECEPCIONADO',
      "sede_actual_id" uuid, "almacen_actual_id" uuid, "ubicacion_actual_id" uuid, "observaciones" text,
      "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_bultos_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_bultos_codigo" UNIQUE ("codigo"), CONSTRAINT "UQ_bultos_ticket_numero" UNIQUE ("ticket_id","numero"),
      CONSTRAINT "FK_bultos_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
      CONSTRAINT "FK_bultos_sede" FOREIGN KEY ("sede_actual_id") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
      CONSTRAINT "FK_bultos_almacen" FOREIGN KEY ("almacen_actual_id") REFERENCES "almacenes"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
      CONSTRAINT "FK_bultos_ubicacion" FOREIGN KEY ("ubicacion_actual_id") REFERENCES "ubicaciones_almacen"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    )`)

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "tracking_eventos" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticket_id" uuid NOT NULL, "bulto_id" uuid, "tipo_evento" "public"."tracking_eventos_tipo_evento_enum" NOT NULL,
      "fecha_hora" timestamp NOT NULL DEFAULT now(), "sede_id" uuid, "almacen_id" uuid, "ubicacion_id" uuid, "usuario_id" uuid,
      "observacion" text, "metadata" jsonb, "created_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_tracking_eventos_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_tracking_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
      CONSTRAINT "FK_tracking_bulto" FOREIGN KEY ("bulto_id") REFERENCES "bultos"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
      CONSTRAINT "FK_tracking_sede" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
      CONSTRAINT "FK_tracking_almacen" FOREIGN KEY ("almacen_id") REFERENCES "almacenes"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
      CONSTRAINT "FK_tracking_ubicacion" FOREIGN KEY ("ubicacion_id") REFERENCES "ubicaciones_almacen"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
      CONSTRAINT "FK_tracking_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    )`)

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tarifas_ruta_tipo_vigencia" ON "tarifas" ("origen_id","destino_id","tipo_mercaderia","vigencia_desde")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bultos_estado" ON "bultos" ("estado")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tracking_ticket_fecha" ON "tracking_eventos" ("ticket_id","fecha_hora")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tracking_bulto_fecha" ON "tracking_eventos" ("bulto_id","fecha_hora")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tracking_eventos"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "bultos"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "tarifas"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "conductores"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "vehiculos"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "ubicaciones_almacen"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "almacenes"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "sedes"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tracking_eventos_tipo_evento_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."bultos_estado_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."conductores_estado_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."vehiculos_estado_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tarifas_estado_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."ubicaciones_almacen_tipo_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."almacenes_estado_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."almacenes_tipo_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."sedes_tipo_enum"`)
  }
}

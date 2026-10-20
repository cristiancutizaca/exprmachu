import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateDeliverySheetsV41710000012000 implements MigrationInterface {
  name = 'CreateDeliverySheetsV41710000012000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'planillas_reparto_estado_enum') THEN CREATE TYPE "public"."planillas_reparto_estado_enum" AS ENUM ('BORRADOR','ASIGNADO','EN_RUTA','FINALIZADO','ANULADO'); END IF; END $$`)
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'planillas_reparto_detalles_estado_enum') THEN CREATE TYPE "public"."planillas_reparto_detalles_estado_enum" AS ENUM ('PENDIENTE','ENTREGADO','CLIENTE_AUSENTE','DIRECCION_INCORRECTA','NO_UBICADO','RECHAZADO','REPROGRAMADO'); END IF; END $$`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "planillas_reparto" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fecha" date NOT NULL, "zona" character varying(120), "estado" "public"."planillas_reparto_estado_enum" NOT NULL DEFAULT 'BORRADOR', "sede_id" uuid NOT NULL, "vehiculo_id" uuid, "repartidor_id" uuid, "observacion" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_planillas_reparto_v4" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "planillas_reparto_detalles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "planilla_id" uuid NOT NULL, "ticket_id" uuid NOT NULL, "bulto_id" uuid NOT NULL, "estado" "public"."planillas_reparto_detalles_estado_enum" NOT NULL DEFAULT 'PENDIENTE', "intentos" integer NOT NULL DEFAULT 0, "ultima_fecha_intento" TIMESTAMP, "observacion" text, "documento_receptor" character varying(100), "nombre_receptor" character varying(180), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_planillas_reparto_detalles_v4" PRIMARY KEY ("id"), CONSTRAINT "UQ_planillas_reparto_detalle_bulto_v4" UNIQUE ("planilla_id", "bulto_id"))`)
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_planillas_reparto_sede_v4') THEN ALTER TABLE "planillas_reparto" ADD CONSTRAINT "FK_planillas_reparto_sede_v4" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT; END IF; END $$`)
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_planillas_reparto_vehiculo_v4') THEN ALTER TABLE "planillas_reparto" ADD CONSTRAINT "FK_planillas_reparto_vehiculo_v4" FOREIGN KEY ("vehiculo_id") REFERENCES "vehiculos"("id") ON DELETE SET NULL; END IF; END $$`)
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_planillas_reparto_repartidor_v4') THEN ALTER TABLE "planillas_reparto" ADD CONSTRAINT "FK_planillas_reparto_repartidor_v4" FOREIGN KEY ("repartidor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL; END IF; END $$`)
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_planillas_reparto_planilla_v4') THEN ALTER TABLE "planillas_reparto_detalles" ADD CONSTRAINT "FK_planillas_reparto_planilla_v4" FOREIGN KEY ("planilla_id") REFERENCES "planillas_reparto"("id") ON DELETE CASCADE; END IF; END $$`)
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_planillas_reparto_ticket_v4') THEN ALTER TABLE "planillas_reparto_detalles" ADD CONSTRAINT "FK_planillas_reparto_ticket_v4" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT; END IF; END $$`)
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_planillas_reparto_bulto_v4') THEN ALTER TABLE "planillas_reparto_detalles" ADD CONSTRAINT "FK_planillas_reparto_bulto_v4" FOREIGN KEY ("bulto_id") REFERENCES "bultos"("id") ON DELETE RESTRICT; END IF; END $$`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_planillas_reparto_sede_fecha_v4" ON "planillas_reparto" ("sede_id", "fecha")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_planillas_reparto_sede_fecha_v4"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "planillas_reparto_detalles"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "planillas_reparto"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."planillas_reparto_detalles_estado_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."planillas_reparto_estado_enum"`)
  }
}

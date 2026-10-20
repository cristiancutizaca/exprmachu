import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateExpensesV41710000011000 implements MigrationInterface {
  name = 'CreateExpensesV41710000011000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'egresos_categoria_enum') THEN CREATE TYPE "public"."egresos_categoria_enum" AS ENUM ('COMBUSTIBLE','CARGUIO','DESCARGUIO','TAXI','MANTENIMIENTO','PEAJE','VIATICO','APOYO_PERSONAL','SERVICIO','OTRO'); END IF; END $$`)
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'egresos_estado_enum') THEN CREATE TYPE "public"."egresos_estado_enum" AS ENUM ('PENDIENTE','APROBADO','RECHAZADO','ANULADO'); END IF; END $$`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "egresos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fecha" TIMESTAMP NOT NULL DEFAULT now(), "sede_id" uuid NOT NULL, "categoria" "public"."egresos_categoria_enum" NOT NULL, "concepto" character varying(220) NOT NULL, "monto" numeric(12,2) NOT NULL, "proveedor" character varying(180), "ruc" character varying(11), "documento" character varying(80), "placa" character varying(20), "chofer" character varying(160), "destino" character varying(160), "observacion" text, "afecta_caja" boolean NOT NULL DEFAULT true, "usuario_solicita_id" uuid NOT NULL, "usuario_autoriza_id" uuid, "caja_sesion_id" uuid, "estado" "public"."egresos_estado_enum" NOT NULL DEFAULT 'PENDIENTE', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_egresos_v4" PRIMARY KEY ("id"))`)
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_egresos_sede_v4') THEN ALTER TABLE "egresos" ADD CONSTRAINT "FK_egresos_sede_v4" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT; END IF; END $$`)
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_egresos_solicita_v4') THEN ALTER TABLE "egresos" ADD CONSTRAINT "FK_egresos_solicita_v4" FOREIGN KEY ("usuario_solicita_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT; END IF; END $$`)
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_egresos_autoriza_v4') THEN ALTER TABLE "egresos" ADD CONSTRAINT "FK_egresos_autoriza_v4" FOREIGN KEY ("usuario_autoriza_id") REFERENCES "usuarios"("id") ON DELETE SET NULL; END IF; END $$`)
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_egresos_caja_v4') THEN ALTER TABLE "egresos" ADD CONSTRAINT "FK_egresos_caja_v4" FOREIGN KEY ("caja_sesion_id") REFERENCES "caja_sesiones"("id") ON DELETE SET NULL; END IF; END $$`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_egresos_sede_fecha_v4" ON "egresos" ("sede_id", "fecha")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_egresos_estado_v4" ON "egresos" ("estado")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_egresos_estado_v4"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_egresos_sede_fecha_v4"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "egresos"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."egresos_estado_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."egresos_categoria_enum"`)
  }
}

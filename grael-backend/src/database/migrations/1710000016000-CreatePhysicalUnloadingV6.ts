import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePhysicalUnloadingV61710000016000 implements MigrationInterface {
  name = 'CreatePhysicalUnloadingV61710000016000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."estado_desembarque_sesion_enum" AS ENUM ('ABIERTA', 'CERRADA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."estado_desembarque_bulto_enum" AS ENUM ('RECIBIDO', 'DANADO', 'EXTRA', 'FALTANTE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "desembarque_sesiones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "manifiesto_id" uuid NOT NULL, "sede_id" uuid NOT NULL, "almacen_destino_id" uuid, "ubicacion_destino_id" uuid, "usuario_apertura_id" uuid NOT NULL, "usuario_cierre_id" uuid, "estado" "public"."estado_desembarque_sesion_enum" NOT NULL DEFAULT 'ABIERTA', "observacion" text, "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_desembarque_sesiones_id" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "desembarque_bultos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sesion_id" uuid NOT NULL, "bulto_id" uuid NOT NULL, "estado" "public"."estado_desembarque_bulto_enum" NOT NULL DEFAULT 'RECIBIDO', "observacion" text, "usuario_id" uuid NOT NULL, "created_at" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_desembarque_bultos_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_desembarque_bultos_sesion_bulto" UNIQUE ("sesion_id", "bulto_id"))`)
    await queryRunner.query(`ALTER TABLE "desembarque_sesiones" ADD CONSTRAINT "FK_desembarque_sesiones_manifiesto" FOREIGN KEY ("manifiesto_id") REFERENCES "manifiestos"("id") ON DELETE RESTRICT`)
    await queryRunner.query(`ALTER TABLE "desembarque_sesiones" ADD CONSTRAINT "FK_desembarque_sesiones_sede" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT`)
    await queryRunner.query(`ALTER TABLE "desembarque_sesiones" ADD CONSTRAINT "FK_desembarque_sesiones_almacen" FOREIGN KEY ("almacen_destino_id") REFERENCES "almacenes"("id") ON DELETE SET NULL`)
    await queryRunner.query(`ALTER TABLE "desembarque_sesiones" ADD CONSTRAINT "FK_desembarque_sesiones_ubicacion" FOREIGN KEY ("ubicacion_destino_id") REFERENCES "ubicaciones_almacen"("id") ON DELETE SET NULL`)
    await queryRunner.query(`ALTER TABLE "desembarque_sesiones" ADD CONSTRAINT "FK_desembarque_sesiones_apertura" FOREIGN KEY ("usuario_apertura_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT`)
    await queryRunner.query(`ALTER TABLE "desembarque_sesiones" ADD CONSTRAINT "FK_desembarque_sesiones_cierre" FOREIGN KEY ("usuario_cierre_id") REFERENCES "usuarios"("id") ON DELETE SET NULL`)
    await queryRunner.query(`ALTER TABLE "desembarque_bultos" ADD CONSTRAINT "FK_desembarque_bultos_sesion" FOREIGN KEY ("sesion_id") REFERENCES "desembarque_sesiones"("id") ON DELETE CASCADE`)
    await queryRunner.query(`ALTER TABLE "desembarque_bultos" ADD CONSTRAINT "FK_desembarque_bultos_bulto" FOREIGN KEY ("bulto_id") REFERENCES "bultos"("id") ON DELETE RESTRICT`)
    await queryRunner.query(`ALTER TABLE "desembarque_bultos" ADD CONSTRAINT "FK_desembarque_bultos_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_desembarque_sesiones_open_manifest" ON "desembarque_sesiones" ("manifiesto_id") WHERE "estado" = 'ABIERTA'`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_desembarque_sesiones_sede_created" ON "desembarque_sesiones" ("sede_id", "created_at")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_desembarque_bultos_bulto_created" ON "desembarque_bultos" ("bulto_id", "created_at")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_desembarque_bultos_bulto_created"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_desembarque_sesiones_sede_created"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_desembarque_sesiones_open_manifest"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "desembarque_bultos"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "desembarque_sesiones"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."estado_desembarque_bulto_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."estado_desembarque_sesion_enum"`)
  }
}

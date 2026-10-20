import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateWarehouseMovements1710000008000 implements MigrationInterface {
  name = 'CreateWarehouseMovements1710000008000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."movimientos_almacen_tipo_enum" AS ENUM ('INGRESO','TRANSFERENCIA','SALIDA','INCIDENCIA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "movimientos_almacen" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bulto_id" uuid NOT NULL, "sede_id" uuid NOT NULL,
      "almacen_origen_id" uuid, "ubicacion_origen_id" uuid, "almacen_destino_id" uuid, "ubicacion_destino_id" uuid,
      "usuario_id" uuid, "tipo" "public"."movimientos_almacen_tipo_enum" NOT NULL,
      "referenciaTipo" varchar(80), "referenciaId" uuid, "motivo" varchar(240), "created_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_movimientos_almacen" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_movimientos_almacen_bulto_fecha" ON "movimientos_almacen" ("bulto_id", "created_at")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_movimientos_almacen_sede_fecha" ON "movimientos_almacen" ("sede_id", "created_at")`)
    const constraints: Array<[string, string]> = [
      ['FK_mov_alm_bulto', 'ALTER TABLE "movimientos_almacen" ADD CONSTRAINT "FK_mov_alm_bulto" FOREIGN KEY ("bulto_id") REFERENCES "bultos"("id") ON DELETE RESTRICT'],
      ['FK_mov_alm_sede', 'ALTER TABLE "movimientos_almacen" ADD CONSTRAINT "FK_mov_alm_sede" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT'],
      ['FK_mov_alm_origen', 'ALTER TABLE "movimientos_almacen" ADD CONSTRAINT "FK_mov_alm_origen" FOREIGN KEY ("almacen_origen_id") REFERENCES "almacenes"("id") ON DELETE SET NULL'],
      ['FK_mov_ubic_origen', 'ALTER TABLE "movimientos_almacen" ADD CONSTRAINT "FK_mov_ubic_origen" FOREIGN KEY ("ubicacion_origen_id") REFERENCES "ubicaciones_almacen"("id") ON DELETE SET NULL'],
      ['FK_mov_alm_destino', 'ALTER TABLE "movimientos_almacen" ADD CONSTRAINT "FK_mov_alm_destino" FOREIGN KEY ("almacen_destino_id") REFERENCES "almacenes"("id") ON DELETE SET NULL'],
      ['FK_mov_ubic_destino', 'ALTER TABLE "movimientos_almacen" ADD CONSTRAINT "FK_mov_ubic_destino" FOREIGN KEY ("ubicacion_destino_id") REFERENCES "ubicaciones_almacen"("id") ON DELETE SET NULL'],
      ['FK_mov_alm_usuario', 'ALTER TABLE "movimientos_almacen" ADD CONSTRAINT "FK_mov_alm_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL'],
    ]
    for (const [name, sql] of constraints) await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN ${sql}; END IF; END $$`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "movimientos_almacen"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."movimientos_almacen_tipo_enum"`)
  }
}

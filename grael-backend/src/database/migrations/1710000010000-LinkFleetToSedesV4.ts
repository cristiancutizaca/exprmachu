import { MigrationInterface, QueryRunner } from 'typeorm'

export class LinkFleetToSedesV41710000010000 implements MigrationInterface {
  name = 'LinkFleetToSedesV41710000010000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vehiculos" ADD COLUMN IF NOT EXISTS "sede_id" uuid`)
    await queryRunner.query(`ALTER TABLE "conductores" ADD COLUMN IF NOT EXISTS "sede_id" uuid`)
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_vehiculos_sede_v4') THEN ALTER TABLE "vehiculos" ADD CONSTRAINT "FK_vehiculos_sede_v4" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL; END IF; END $$`)
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_conductores_sede_v4') THEN ALTER TABLE "conductores" ADD CONSTRAINT "FK_conductores_sede_v4" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL; END IF; END $$`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_vehiculos_sede_id_v4" ON "vehiculos" ("sede_id")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_conductores_sede_id_v4" ON "conductores" ("sede_id")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conductores_sede_id_v4"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehiculos_sede_id_v4"`)
    await queryRunner.query(`ALTER TABLE "conductores" DROP CONSTRAINT IF EXISTS "FK_conductores_sede_v4"`)
    await queryRunner.query(`ALTER TABLE "vehiculos" DROP CONSTRAINT IF EXISTS "FK_vehiculos_sede_v4"`)
    await queryRunner.query(`ALTER TABLE "conductores" DROP COLUMN IF EXISTS "sede_id"`)
    await queryRunner.query(`ALTER TABLE "vehiculos" DROP COLUMN IF EXISTS "sede_id"`)
  }
}

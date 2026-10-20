import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddIncidentDispositionV101710000023000 implements MigrationInterface {
  name = 'AddIncidentDispositionV101710000023000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "incidencias" ADD COLUMN IF NOT EXISTS "disposicion" varchar(40) NULL`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_incidencias_disposicion" ON "incidencias" ("disposicion")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_incidencias_disposicion"`)
    await queryRunner.query(`ALTER TABLE "incidencias" DROP COLUMN IF EXISTS "disposicion"`)
  }
}

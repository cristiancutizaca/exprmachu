import { MigrationInterface, QueryRunner } from 'typeorm'

export class HardenGreDocumentsV81710000022000 implements MigrationInterface {
  name = 'HardenGreDocumentsV81710000022000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "gre_documentos" ADD COLUMN IF NOT EXISTS "manifiesto_id" uuid NULL`)
    await queryRunner.query(`ALTER TABLE "gre_documentos" ADD COLUMN IF NOT EXISTS "sede_id" uuid NULL`)
    await queryRunner.query(`ALTER TABLE "gre_documentos" ADD COLUMN IF NOT EXISTS "hash_xml" varchar(64) NULL`)
    await queryRunner.query(`ALTER TABLE "gre_documentos" ADD COLUMN IF NOT EXISTS "actor_context" jsonb NULL`)
    await queryRunner.query(`
      UPDATE "gre_documentos" g
      SET "sede_id" = t."sede_recepcion_id"
      FROM "tickets" t
      WHERE g."ticket_id" = t."id" AND g."sede_id" IS NULL AND t."sede_recepcion_id" IS NOT NULL
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_gre_documentos_sede_id" ON "gre_documentos" ("sede_id")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_gre_documentos_manifiesto_id" ON "gre_documentos" ("manifiesto_id")`)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_gre_documentos_manifiesto') THEN
          ALTER TABLE "gre_documentos" ADD CONSTRAINT "FK_gre_documentos_manifiesto" FOREIGN KEY ("manifiesto_id") REFERENCES "manifiestos"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_gre_documentos_sede') THEN
          ALTER TABLE "gre_documentos" ADD CONSTRAINT "FK_gre_documentos_sede" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "gre_documentos" DROP CONSTRAINT IF EXISTS "FK_gre_documentos_sede"`)
    await queryRunner.query(`ALTER TABLE "gre_documentos" DROP CONSTRAINT IF EXISTS "FK_gre_documentos_manifiesto"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_gre_documentos_manifiesto_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_gre_documentos_sede_id"`)
    await queryRunner.query(`ALTER TABLE "gre_documentos" DROP COLUMN IF EXISTS "actor_context"`)
    await queryRunner.query(`ALTER TABLE "gre_documentos" DROP COLUMN IF EXISTS "hash_xml"`)
    await queryRunner.query(`ALTER TABLE "gre_documentos" DROP COLUMN IF EXISTS "sede_id"`)
    await queryRunner.query(`ALTER TABLE "gre_documentos" DROP COLUMN IF EXISTS "manifiesto_id"`)
  }
}

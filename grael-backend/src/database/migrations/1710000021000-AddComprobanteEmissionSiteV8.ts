import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddComprobanteEmissionSiteV81710000021000 implements MigrationInterface {
  name = 'AddComprobanteEmissionSiteV81710000021000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "comprobantes" ADD COLUMN IF NOT EXISTS "sede_emision_id" uuid NULL`)
    await queryRunner.query(`
      UPDATE "comprobantes" c
      SET "sede_emision_id" = t."sede_recepcion_id"
      FROM "tickets" t
      WHERE c."ticket_id" = t."id"
        AND c."sede_emision_id" IS NULL
        AND t."sede_recepcion_id" IS NOT NULL
    `)
    await queryRunner.query(`
      UPDATE "comprobantes" c
      SET "sede_emision_id" = u."sede_id"
      FROM "usuarios" u
      WHERE c."usuario_id" = u."id"
        AND c."sede_emision_id" IS NULL
        AND u."sede_id" IS NOT NULL
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comprobantes_sede_emision_id" ON "comprobantes" ("sede_emision_id")`)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_comprobantes_sede_emision') THEN
          ALTER TABLE "comprobantes" ADD CONSTRAINT "FK_comprobantes_sede_emision" FOREIGN KEY ("sede_emision_id") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "comprobantes" DROP CONSTRAINT IF EXISTS "FK_comprobantes_sede_emision"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comprobantes_sede_emision_id"`)
    await queryRunner.query(`ALTER TABLE "comprobantes" DROP COLUMN IF EXISTS "sede_emision_id"`)
  }
}

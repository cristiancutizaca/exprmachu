import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateDocumentSeriesV101710000024000 implements MigrationInterface {
  name = 'CreateDocumentSeriesV101710000024000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "series_documento" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tipo" varchar(5) NOT NULL, "serie" varchar(10) NOT NULL, "sede_id" uuid NOT NULL, "activo" boolean NOT NULL DEFAULT true, "correlativo_actual" integer NOT NULL DEFAULT 0, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_series_documento" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_series_documento_tipo_sede_serie" ON "series_documento" ("tipo", "sede_id", "serie")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_series_documento_sede" ON "series_documento" ("sede_id")`)
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_series_documento_sede') THEN ALTER TABLE "series_documento" ADD CONSTRAINT "FK_series_documento_sede" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION; END IF; END $$;`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "series_documento" DROP CONSTRAINT IF EXISTS "FK_series_documento_sede"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_series_documento_sede"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_series_documento_tipo_sede_serie"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "series_documento"`)
  }
}

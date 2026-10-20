import { MigrationInterface, QueryRunner } from 'typeorm'

export class LinkUsersToSedes1710000005000 implements MigrationInterface {
  name = 'LinkUsersToSedes1710000005000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "sede_id" uuid`)
    await queryRunner.query(`UPDATE "usuarios" u SET "sede_id" = s."id" FROM "sedes" s WHERE u."sede_id" IS NULL AND (UPPER(s."codigo") = UPPER(u."sede") OR UPPER(s."nombre") LIKE '%' || UPPER(u."sede") || '%')`)
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_usuarios_sede') THEN ALTER TABLE "usuarios" ADD CONSTRAINT "FK_usuarios_sede" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL; END IF; END $$`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_usuarios_sede_id" ON "usuarios" ("sede_id")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" DROP CONSTRAINT IF EXISTS "FK_usuarios_sede"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_usuarios_sede_id"`)
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "sede_id"`)
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuditSiteDateIndexV51710000015000 implements MigrationInterface {
  name = 'AddAuditSiteDateIndexV51710000015000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_sede_fecha" ON "audit_logs" ("sede_id", "fecha_hora")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_sede_fecha"`)
  }
}

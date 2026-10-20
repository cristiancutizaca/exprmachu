import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAuditLogs1710000003000 implements MigrationInterface {
  name = 'CreateAuditLogs1710000003000'

  private async constraint(queryRunner: QueryRunner, name: string, sql: string) {
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN ${sql}; END IF; END $$`)
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "usuario_id" uuid, "sede_id" uuid,
      "accion" varchar(80) NOT NULL, "entidad" varchar(80) NOT NULL, "entidad_id" varchar(80) NOT NULL,
      "fecha_hora" timestamp NOT NULL DEFAULT now(), "ip" varchar(64), "user_agent" text,
      "antes" jsonb, "despues" jsonb, "metadata" jsonb, "created_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_entidad_fecha" ON "audit_logs" ("entidad", "entidad_id", "fecha_hora")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_usuario_fecha" ON "audit_logs" ("usuario_id", "fecha_hora")`)
    await this.constraint(queryRunner, 'FK_audit_logs_usuario', 'ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_logs_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'FK_audit_logs_sede', 'ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_logs_sede" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`)
  }
}

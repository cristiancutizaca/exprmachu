import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateGreDocumentsV61710000017000 implements MigrationInterface {
  name = 'CreateGreDocumentsV61710000017000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."gre_documentos_estado_enum" AS ENUM ('ACEPTADO_MOCK', 'EMITIDO', 'RECHAZADO', 'ANULADO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "gre_documentos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticket_id" uuid NOT NULL, "comprobante_id" uuid, "usuario_id" uuid, "tipo" character varying(5) NOT NULL, "serie" character varying(10), "numero" character varying(20), "codigo" character varying(80) NOT NULL, "proveedor" character varying(20) NOT NULL, "estado" "public"."gre_documentos_estado_enum" NOT NULL DEFAULT 'ACEPTADO_MOCK', "xml" text NOT NULL, "observacion" text, "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_gre_documentos_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_gre_documentos_codigo" UNIQUE ("codigo"))`)
    await queryRunner.query(`ALTER TABLE "gre_documentos" ADD CONSTRAINT "FK_gre_documentos_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT`)
    await queryRunner.query(`ALTER TABLE "gre_documentos" ADD CONSTRAINT "FK_gre_documentos_comprobante" FOREIGN KEY ("comprobante_id") REFERENCES "comprobantes"("id") ON DELETE SET NULL`)
    await queryRunner.query(`ALTER TABLE "gre_documentos" ADD CONSTRAINT "FK_gre_documentos_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_gre_documentos_ticket_type_created" ON "gre_documentos" ("ticket_id", "tipo", "created_at")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_gre_documentos_ticket_type_created"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "gre_documentos"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."gre_documentos_estado_enum"`)
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFiscalDocumentStates1710000025000 implements MigrationInterface {
  name = 'AddFiscalDocumentStates1710000025000'

  async up(runner: QueryRunner) {
    for (const state of ['BORRADOR', 'ENVIANDO', 'ENVIADO', 'ENVIO_INCIERTO', 'REINTENTABLE', 'ACEPTADO', 'ACEPTADO_CON_OBSERVACIONES']) {
      await runner.query(`ALTER TYPE "gre_documentos_estado_enum" ADD VALUE IF NOT EXISTS '${state}'`)
    }
    await runner.query('ALTER TABLE "gre_documentos" ALTER COLUMN "estado" DROP DEFAULT')
    await runner.query(`
      ALTER TABLE "gre_documentos"
        ADD COLUMN "ambiente_sunat" varchar(12),
        ADD COLUMN "ruc_emisor" varchar(11),
        ADD COLUMN "tipo_tributario" varchar(2),
        ADD COLUMN "datos_fiscales" jsonb,
        ADD COLUMN "zip_envio" bytea,
        ADD COLUMN "zip_cdr" bytea,
        ADD COLUMN "ticket_sunat" varchar(36),
        ADD COLUMN "respuesta_sunat" jsonb,
        ADD COLUMN "fecha_envio" timestamptz
    `)
    await runner.query(`
      CREATE UNIQUE INDEX "IDX_gre_identidad_fiscal"
      ON "gre_documentos" ("ambiente_sunat", "ruc_emisor", "tipo_tributario", "serie", "numero")
      WHERE "ambiente_sunat" IS NOT NULL AND "numero" IS NOT NULL
    `)
    await runner.query(`
      CREATE UNIQUE INDEX "IDX_gre_ticket_sunat"
      ON "gre_documentos" ("ambiente_sunat", "ticket_sunat") WHERE "ticket_sunat" IS NOT NULL
    `)
    await runner.query(`
      CREATE TABLE "series_sunat" (
        "ambiente" varchar(12) NOT NULL CHECK ("ambiente" IN ('TEST','PRODUCTION')),
        "ruc" varchar(11) NOT NULL,
        "tipo" varchar(2) NOT NULL,
        "serie" varchar(4) NOT NULL,
        "sede_id" uuid NOT NULL REFERENCES "sedes"("id") ON DELETE RESTRICT,
        "correlativo_actual" integer NOT NULL CHECK ("correlativo_actual" BETWEEN 0 AND 99999999),
        "activo" boolean NOT NULL DEFAULT true,
        "codigo_establecimiento" varchar(4),
        PRIMARY KEY ("ambiente", "ruc", "tipo", "serie")
      )
    `)
    await runner.query(`
      UPDATE "comprobantes" c SET "estado" = 'SIMULADO'
      WHERE c."estado" = 'EMITIDO' AND EXISTS (
        SELECT 1 FROM "gre_documentos" g
        WHERE g."comprobante_id" = c."id" AND g."proveedor" = 'MOCK'
      )
    `)
    await runner.query(`ALTER TABLE "comprobantes" ALTER COLUMN "estado" SET DEFAULT 'INTERNO'`)
    await runner.query(`CREATE INDEX "IDX_gre_comprobante_fiscal" ON "gre_documentos" ("comprobante_id") WHERE "ambiente_sunat" IS NOT NULL`)
    await runner.query(`CREATE INDEX "IDX_comprobantes_sede_fecha" ON "comprobantes" ("sede_emision_id", "created_at")`)
  }

  async down() {
    throw new Error('Revertir esta migración eliminaría evidencia tributaria. Aplique una migración correctiva.')
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm'

export class NationalSedeDimensionsV71710000018000 implements MigrationInterface {
  name = 'NationalSedeDimensionsV71710000018000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "destinos" ADD COLUMN IF NOT EXISTS "sede_id" uuid`)
    await queryRunner.query(`ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "sede_recepcion_id" uuid`)
    await queryRunner.query(`ALTER TABLE "pagos" ADD COLUMN IF NOT EXISTS "sede_id" uuid`)

    await queryRunner.query(`UPDATE "destinos" d SET "sede_id" = s."id" FROM "sedes" s WHERE d."sede_id" IS NULL AND UPPER(d."codigo") = UPPER(s."codigo")`)
    await queryRunner.query(`UPDATE "tickets" t SET "sede_recepcion_id" = u."sede_id" FROM "usuarios" u WHERE t."sede_recepcion_id" IS NULL AND t."usuario_creacion_id" = u."id" AND u."sede_id" IS NOT NULL`)
    await queryRunner.query(`UPDATE "pagos" p SET "sede_id" = c."sede_id" FROM "movimientos_caja" mc JOIN "caja_sesiones" c ON c."id" = mc."caja_sesion_id" WHERE p."sede_id" IS NULL AND mc."pago_id" = p."id"`)
    await queryRunner.query(`UPDATE "pagos" p SET "sede_id" = u."sede_id" FROM "usuarios" u WHERE p."sede_id" IS NULL AND p."usuario_id" = u."id" AND u."sede_id" IS NOT NULL`)

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_destinos_sede_id" ON "destinos" ("sede_id")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tickets_sede_recepcion_id" ON "tickets" ("sede_recepcion_id")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_pagos_sede_id_created_at" ON "pagos" ("sede_id", "created_at")`)

    await queryRunner.query(`ALTER TABLE "destinos" ADD CONSTRAINT "FK_destinos_sede_id" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL`)
    await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_sede_recepcion_id" FOREIGN KEY ("sede_recepcion_id") REFERENCES "sedes"("id") ON DELETE SET NULL`)
    await queryRunner.query(`ALTER TABLE "pagos" ADD CONSTRAINT "FK_pagos_sede_id" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "pagos" DROP CONSTRAINT IF EXISTS "FK_pagos_sede_id"`)
    await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "FK_tickets_sede_recepcion_id"`)
    await queryRunner.query(`ALTER TABLE "destinos" DROP CONSTRAINT IF EXISTS "FK_destinos_sede_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pagos_sede_id_created_at"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tickets_sede_recepcion_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_destinos_sede_id"`)
    await queryRunner.query(`ALTER TABLE "pagos" DROP COLUMN IF EXISTS "sede_id"`)
    await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN IF EXISTS "sede_recepcion_id"`)
    await queryRunner.query(`ALTER TABLE "destinos" DROP COLUMN IF EXISTS "sede_id"`)
  }
}


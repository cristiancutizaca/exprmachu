import { MigrationInterface, QueryRunner } from 'typeorm'

export class NormalizePaymentMethodEnum1710000006000 implements MigrationInterface {
  name = 'NormalizePaymentMethodEnum1710000006000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."metodo_pago_enum" AS ENUM ('EFECTIVO','TRANSFERENCIA','YAPE','PLIN','TARJETA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
    await queryRunner.query(`DO $$
      DECLARE data_type text;
      BEGIN
        SELECT format_type(a.atttypid, a.atttypmod) INTO data_type
        FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
        WHERE c.relname = 'pagos' AND a.attname = 'metodo_pago' AND a.attnum > 0 AND NOT a.attisdropped;
        IF data_type IS NULL THEN
          ALTER TABLE "pagos" ADD COLUMN "metodo_pago" "public"."metodo_pago_enum";
        ELSIF data_type <> 'metodo_pago_enum' THEN
          IF EXISTS (SELECT 1 FROM "pagos" WHERE "metodo_pago" IS NOT NULL AND UPPER("metodo_pago"::text) NOT IN ('EFECTIVO','TRANSFERENCIA','YAPE','PLIN','TARJETA')) THEN
            RAISE EXCEPTION 'Existen valores inválidos en pagos.metodo_pago; corregir datos antes de migrar';
          END IF;
          ALTER TABLE "pagos" ALTER COLUMN "metodo_pago" TYPE "public"."metodo_pago_enum" USING UPPER("metodo_pago"::text)::"public"."metodo_pago_enum";
        END IF;
      END $$`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "pagos" ALTER COLUMN "metodo_pago" TYPE varchar(30) USING "metodo_pago"::text`)
  }
}

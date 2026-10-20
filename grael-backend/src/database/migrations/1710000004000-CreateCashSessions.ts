import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCashSessions1710000004000 implements MigrationInterface {
  name = 'CreateCashSessions1710000004000'

  private async enum(queryRunner: QueryRunner, name: string, values: string[]) {
    const literals = values.map(value => `'${value.replace(/'/g, "''")}'`).join(',')
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."${name}" AS ENUM (${literals}); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  }

  private async constraint(queryRunner: QueryRunner, name: string, sql: string) {
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN ${sql}; END IF; END $$`)
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // El enum metodo_pago_enum es único para pagos y movimientos de caja.
    await this.enum(queryRunner, 'metodo_pago_enum', ['EFECTIVO', 'TRANSFERENCIA', 'YAPE', 'PLIN', 'TARJETA'])
    await this.enum(queryRunner, 'caja_sesiones_estado_enum', ['ABIERTA', 'CERRADA', 'OBSERVADA'])
    await this.enum(queryRunner, 'movimientos_caja_tipo_movimiento_enum', ['INGRESO', 'EGRESO', 'AJUSTE'])
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "caja_sesiones" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sede_id" uuid NOT NULL, "usuario_apertura_id" uuid NOT NULL,
      "usuario_cierre_id" uuid, "fecha_apertura" timestamp NOT NULL DEFAULT now(), "fecha_cierre" timestamp,
      "saldo_inicial" numeric(12,2) NOT NULL DEFAULT 0, "saldo_esperado" numeric(12,2) NOT NULL DEFAULT 0,
      "saldo_declarado" numeric(12,2), "estado" "public"."caja_sesiones_estado_enum" NOT NULL DEFAULT 'ABIERTA',
      "observacion" text, "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_caja_sesiones" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UX_caja_sesion_abierta_usuario" ON "caja_sesiones" ("usuario_apertura_id") WHERE "estado" = 'ABIERTA'`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "movimientos_caja" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "caja_sesion_id" uuid NOT NULL, "pago_id" uuid,
      "usuario_id" uuid NOT NULL, "tipo_movimiento" "public"."movimientos_caja_tipo_movimiento_enum" NOT NULL,
      "metodo_pago" "public"."metodo_pago_enum", "monto" numeric(12,2) NOT NULL, "concepto" varchar(180) NOT NULL,
      "metadata" jsonb, "created_at" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_movimientos_caja" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_movimientos_caja_sesion" ON "movimientos_caja" ("caja_sesion_id", "created_at")`)
    await this.constraint(queryRunner, 'FK_caja_sesion_sede', 'ALTER TABLE "caja_sesiones" ADD CONSTRAINT "FK_caja_sesion_sede" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'FK_caja_sesion_apertura', 'ALTER TABLE "caja_sesiones" ADD CONSTRAINT "FK_caja_sesion_apertura" FOREIGN KEY ("usuario_apertura_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'FK_caja_sesion_cierre', 'ALTER TABLE "caja_sesiones" ADD CONSTRAINT "FK_caja_sesion_cierre" FOREIGN KEY ("usuario_cierre_id") REFERENCES "usuarios"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'FK_mov_caja_sesion', 'ALTER TABLE "movimientos_caja" ADD CONSTRAINT "FK_mov_caja_sesion" FOREIGN KEY ("caja_sesion_id") REFERENCES "caja_sesiones"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'FK_mov_pago', 'ALTER TABLE "movimientos_caja" ADD CONSTRAINT "FK_mov_pago" FOREIGN KEY ("pago_id") REFERENCES "pagos"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'FK_mov_usuario', 'ALTER TABLE "movimientos_caja" ADD CONSTRAINT "FK_mov_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "movimientos_caja"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."movimientos_caja_tipo_movimiento_enum"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "caja_sesiones"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."caja_sesiones_estado_enum"`)
    // metodo_pago_enum pertenece al esquema base y no debe eliminarse aquí.
  }
}

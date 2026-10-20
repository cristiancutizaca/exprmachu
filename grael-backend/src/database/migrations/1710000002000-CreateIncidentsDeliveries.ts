import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateIncidentsDeliveries1710000002000 implements MigrationInterface {
  name = 'CreateIncidentsDeliveries1710000002000'

  private async enum(queryRunner: QueryRunner, name: string, values: string[]) {
    const literals = values.map(value => `'${value.replace(/'/g, "''")}'`).join(',')
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."${name}" AS ENUM (${literals}); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  }

  private async constraint(queryRunner: QueryRunner, name: string, sql: string) {
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN ${sql}; END IF; END $$`)
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.enum(queryRunner, 'incidencias_tipo_incidencia_enum', ['FALTANTE', 'DANADO', 'DIFERENCIA_PESO', 'DOCUMENTAL', 'ENTREGA_FALLIDA', 'OTRO'])
    await this.enum(queryRunner, 'incidencias_estado_enum', ['ABIERTA', 'EN_INVESTIGACION', 'RESUELTA', 'CERRADA'])
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "incidencias" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticket_id" uuid NOT NULL, "bulto_id" uuid,
      "tipo_incidencia" "public"."incidencias_tipo_incidencia_enum" NOT NULL,
      "estado" "public"."incidencias_estado_enum" NOT NULL DEFAULT 'ABIERTA', "descripcion" varchar(240) NOT NULL,
      "evidencia" jsonb, "resolucion" text, "sede_id" uuid, "almacen_id" uuid, "usuario_id" uuid, "resuelto_por_id" uuid,
      "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_incidencias" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_incidencias_ticket_estado" ON "incidencias" ("ticket_id", "estado")`)
    await this.constraint(queryRunner, 'FK_incidencias_ticket', 'ALTER TABLE "incidencias" ADD CONSTRAINT "FK_incidencias_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'FK_incidencias_bulto', 'ALTER TABLE "incidencias" ADD CONSTRAINT "FK_incidencias_bulto" FOREIGN KEY ("bulto_id") REFERENCES "bultos"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'FK_incidencias_sede', 'ALTER TABLE "incidencias" ADD CONSTRAINT "FK_incidencias_sede" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'FK_incidencias_almacen', 'ALTER TABLE "incidencias" ADD CONSTRAINT "FK_incidencias_almacen" FOREIGN KEY ("almacen_id") REFERENCES "almacenes"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'FK_incidencias_usuario', 'ALTER TABLE "incidencias" ADD CONSTRAINT "FK_incidencias_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'FK_incidencias_resuelto_por', 'ALTER TABLE "incidencias" ADD CONSTRAINT "FK_incidencias_resuelto_por" FOREIGN KEY ("resuelto_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL')

    await this.enum(queryRunner, 'entregas_tipo_entrega_enum', ['AGENCIA', 'REPARTO'])
    await this.enum(queryRunner, 'entregas_estado_enum', ['PROGRAMADA', 'EN_REPARTO', 'INTENTO_FALLIDO', 'ENTREGADA', 'DEVUELTA'])
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "entregas" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticket_id" uuid NOT NULL, "bulto_id" uuid,
      "tipo_entrega" "public"."entregas_tipo_entrega_enum" NOT NULL,
      "estado" "public"."entregas_estado_enum" NOT NULL DEFAULT 'PROGRAMADA', "fecha_programada" timestamp,
      "fecha_entrega" timestamp, "nombre_receptor" varchar(120), "documento_receptor" varchar(30), "observacion" text,
      "evidencia" jsonb, "latitud" numeric(10,7), "longitud" numeric(10,7), "firma" text, "sede_id" uuid, "usuario_id" uuid,
      "created_at" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_entregas" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_entregas_ticket_estado" ON "entregas" ("ticket_id", "estado")`)
    await this.constraint(queryRunner, 'FK_entregas_ticket', 'ALTER TABLE "entregas" ADD CONSTRAINT "FK_entregas_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT')
    await this.constraint(queryRunner, 'FK_entregas_bulto', 'ALTER TABLE "entregas" ADD CONSTRAINT "FK_entregas_bulto" FOREIGN KEY ("bulto_id") REFERENCES "bultos"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'FK_entregas_sede', 'ALTER TABLE "entregas" ADD CONSTRAINT "FK_entregas_sede" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL')
    await this.constraint(queryRunner, 'FK_entregas_usuario', 'ALTER TABLE "entregas" ADD CONSTRAINT "FK_entregas_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "entregas"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."entregas_estado_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."entregas_tipo_entrega_enum"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "incidencias"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."incidencias_estado_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."incidencias_tipo_incidencia_enum"`)
  }
}

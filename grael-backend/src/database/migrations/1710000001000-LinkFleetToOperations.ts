import { MigrationInterface, QueryRunner } from 'typeorm'

export class LinkFleetToOperations1710000001000 implements MigrationInterface {
  name = 'LinkFleetToOperations1710000001000'

  private async addConstraint(queryRunner: QueryRunner, table: string, constraint: string, sql: string) {
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${constraint}') THEN ${sql}; END IF; END $$`)
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "programaciones" ADD COLUMN IF NOT EXISTS "vehiculo_id" uuid`)
    await queryRunner.query(`ALTER TABLE "programaciones" ADD COLUMN IF NOT EXISTS "conductor_id" uuid`)
    await this.addConstraint(queryRunner, 'programaciones', 'FK_programaciones_vehiculo', 'ALTER TABLE "programaciones" ADD CONSTRAINT "FK_programaciones_vehiculo" FOREIGN KEY ("vehiculo_id") REFERENCES "vehiculos"("id") ON DELETE SET NULL')
    await this.addConstraint(queryRunner, 'programaciones', 'FK_programaciones_conductor', 'ALTER TABLE "programaciones" ADD CONSTRAINT "FK_programaciones_conductor" FOREIGN KEY ("conductor_id") REFERENCES "conductores"("id") ON DELETE SET NULL')

    await queryRunner.query(`ALTER TABLE "manifiestos" ADD COLUMN IF NOT EXISTS "sede_origen_id" uuid`)
    await queryRunner.query(`ALTER TABLE "manifiestos" ADD COLUMN IF NOT EXISTS "sede_destino_id" uuid`)
    await queryRunner.query(`ALTER TABLE "manifiestos" ADD COLUMN IF NOT EXISTS "vehiculo_id" uuid`)
    await queryRunner.query(`ALTER TABLE "manifiestos" ADD COLUMN IF NOT EXISTS "conductor_id" uuid`)
    await queryRunner.query(`ALTER TABLE "manifiestos" ADD COLUMN IF NOT EXISTS "fecha_salida" timestamp`)
    await queryRunner.query(`ALTER TABLE "manifiestos" ADD COLUMN IF NOT EXISTS "usuario_cierre_id" uuid`)
    await queryRunner.query(`ALTER TABLE "manifiestos" ADD COLUMN IF NOT EXISTS "observaciones" text`)
    await this.addConstraint(queryRunner, 'manifiestos', 'FK_manifiestos_sede_origen', 'ALTER TABLE "manifiestos" ADD CONSTRAINT "FK_manifiestos_sede_origen" FOREIGN KEY ("sede_origen_id") REFERENCES "sedes"("id") ON DELETE SET NULL')
    await this.addConstraint(queryRunner, 'manifiestos', 'FK_manifiestos_sede_destino', 'ALTER TABLE "manifiestos" ADD CONSTRAINT "FK_manifiestos_sede_destino" FOREIGN KEY ("sede_destino_id") REFERENCES "sedes"("id") ON DELETE SET NULL')
    await this.addConstraint(queryRunner, 'manifiestos', 'FK_manifiestos_vehiculo', 'ALTER TABLE "manifiestos" ADD CONSTRAINT "FK_manifiestos_vehiculo" FOREIGN KEY ("vehiculo_id") REFERENCES "vehiculos"("id") ON DELETE SET NULL')
    await this.addConstraint(queryRunner, 'manifiestos', 'FK_manifiestos_conductor', 'ALTER TABLE "manifiestos" ADD CONSTRAINT "FK_manifiestos_conductor" FOREIGN KEY ("conductor_id") REFERENCES "conductores"("id") ON DELETE SET NULL')
    await this.addConstraint(queryRunner, 'manifiestos', 'FK_manifiestos_usuario_cierre', 'ALTER TABLE "manifiestos" ADD CONSTRAINT "FK_manifiestos_usuario_cierre" FOREIGN KEY ("usuario_cierre_id") REFERENCES "usuarios"("id") ON DELETE SET NULL')

    await queryRunner.query(`ALTER TABLE "transbordos" ADD COLUMN IF NOT EXISTS "sede_id" uuid`)
    await queryRunner.query(`ALTER TABLE "transbordos" ADD COLUMN IF NOT EXISTS "vehiculo_anterior_id" uuid`)
    await queryRunner.query(`ALTER TABLE "transbordos" ADD COLUMN IF NOT EXISTS "vehiculo_nuevo_id" uuid`)
    await queryRunner.query(`ALTER TABLE "transbordos" ADD COLUMN IF NOT EXISTS "conductor_anterior_id" uuid`)
    await queryRunner.query(`ALTER TABLE "transbordos" ADD COLUMN IF NOT EXISTS "conductor_nuevo_id" uuid`)
    await queryRunner.query(`ALTER TABLE "transbordos" ADD COLUMN IF NOT EXISTS "fecha_hora" timestamp`)
    await queryRunner.query(`ALTER TABLE "transbordos" ADD COLUMN IF NOT EXISTS "motivo" text`)
    await queryRunner.query(`ALTER TABLE "transbordos" ADD COLUMN IF NOT EXISTS "manifiesto_id" uuid`)
    await this.addConstraint(queryRunner, 'transbordos', 'FK_transbordos_sede', 'ALTER TABLE "transbordos" ADD CONSTRAINT "FK_transbordos_sede" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL')
    await this.addConstraint(queryRunner, 'transbordos', 'FK_transbordos_vehiculo_anterior', 'ALTER TABLE "transbordos" ADD CONSTRAINT "FK_transbordos_vehiculo_anterior" FOREIGN KEY ("vehiculo_anterior_id") REFERENCES "vehiculos"("id") ON DELETE SET NULL')
    await this.addConstraint(queryRunner, 'transbordos', 'FK_transbordos_vehiculo_nuevo', 'ALTER TABLE "transbordos" ADD CONSTRAINT "FK_transbordos_vehiculo_nuevo" FOREIGN KEY ("vehiculo_nuevo_id") REFERENCES "vehiculos"("id") ON DELETE SET NULL')
    await this.addConstraint(queryRunner, 'transbordos', 'FK_transbordos_conductor_anterior', 'ALTER TABLE "transbordos" ADD CONSTRAINT "FK_transbordos_conductor_anterior" FOREIGN KEY ("conductor_anterior_id") REFERENCES "conductores"("id") ON DELETE SET NULL')
    await this.addConstraint(queryRunner, 'transbordos', 'FK_transbordos_conductor_nuevo', 'ALTER TABLE "transbordos" ADD CONSTRAINT "FK_transbordos_conductor_nuevo" FOREIGN KEY ("conductor_nuevo_id") REFERENCES "conductores"("id") ON DELETE SET NULL')
    await this.addConstraint(queryRunner, 'transbordos', 'FK_transbordos_manifiesto', 'ALTER TABLE "transbordos" ADD CONSTRAINT "FK_transbordos_manifiesto" FOREIGN KEY ("manifiesto_id") REFERENCES "manifiestos"("id") ON DELETE SET NULL')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transbordos" DROP CONSTRAINT IF EXISTS "FK_transbordos_manifiesto"`)
    await queryRunner.query(`ALTER TABLE "transbordos" DROP CONSTRAINT IF EXISTS "FK_transbordos_conductor_nuevo"`)
    await queryRunner.query(`ALTER TABLE "transbordos" DROP CONSTRAINT IF EXISTS "FK_transbordos_conductor_anterior"`)
    await queryRunner.query(`ALTER TABLE "transbordos" DROP CONSTRAINT IF EXISTS "FK_transbordos_vehiculo_nuevo"`)
    await queryRunner.query(`ALTER TABLE "transbordos" DROP CONSTRAINT IF EXISTS "FK_transbordos_vehiculo_anterior"`)
    await queryRunner.query(`ALTER TABLE "transbordos" DROP CONSTRAINT IF EXISTS "FK_transbordos_sede"`)
    await queryRunner.query(`ALTER TABLE "transbordos" DROP COLUMN IF EXISTS "manifiesto_id"`)
    await queryRunner.query(`ALTER TABLE "transbordos" DROP COLUMN IF EXISTS "motivo"`)
    await queryRunner.query(`ALTER TABLE "transbordos" DROP COLUMN IF EXISTS "fecha_hora"`)
    await queryRunner.query(`ALTER TABLE "transbordos" DROP COLUMN IF EXISTS "conductor_nuevo_id"`)
    await queryRunner.query(`ALTER TABLE "transbordos" DROP COLUMN IF EXISTS "conductor_anterior_id"`)
    await queryRunner.query(`ALTER TABLE "transbordos" DROP COLUMN IF EXISTS "vehiculo_nuevo_id"`)
    await queryRunner.query(`ALTER TABLE "transbordos" DROP COLUMN IF EXISTS "vehiculo_anterior_id"`)
    await queryRunner.query(`ALTER TABLE "transbordos" DROP COLUMN IF EXISTS "sede_id"`)

    await queryRunner.query(`ALTER TABLE "manifiestos" DROP CONSTRAINT IF EXISTS "FK_manifiestos_usuario_cierre"`)
    await queryRunner.query(`ALTER TABLE "manifiestos" DROP CONSTRAINT IF EXISTS "FK_manifiestos_conductor"`)
    await queryRunner.query(`ALTER TABLE "manifiestos" DROP CONSTRAINT IF EXISTS "FK_manifiestos_vehiculo"`)
    await queryRunner.query(`ALTER TABLE "manifiestos" DROP CONSTRAINT IF EXISTS "FK_manifiestos_sede_destino"`)
    await queryRunner.query(`ALTER TABLE "manifiestos" DROP CONSTRAINT IF EXISTS "FK_manifiestos_sede_origen"`)
    await queryRunner.query(`ALTER TABLE "manifiestos" DROP COLUMN IF EXISTS "observaciones"`)
    await queryRunner.query(`ALTER TABLE "manifiestos" DROP COLUMN IF EXISTS "usuario_cierre_id"`)
    await queryRunner.query(`ALTER TABLE "manifiestos" DROP COLUMN IF EXISTS "fecha_salida"`)
    await queryRunner.query(`ALTER TABLE "manifiestos" DROP COLUMN IF EXISTS "conductor_id"`)
    await queryRunner.query(`ALTER TABLE "manifiestos" DROP COLUMN IF EXISTS "vehiculo_id"`)
    await queryRunner.query(`ALTER TABLE "manifiestos" DROP COLUMN IF EXISTS "sede_destino_id"`)
    await queryRunner.query(`ALTER TABLE "manifiestos" DROP COLUMN IF EXISTS "sede_origen_id"`)

    await queryRunner.query(`ALTER TABLE "programaciones" DROP CONSTRAINT IF EXISTS "FK_programaciones_conductor"`)
    await queryRunner.query(`ALTER TABLE "programaciones" DROP CONSTRAINT IF EXISTS "FK_programaciones_vehiculo"`)
    await queryRunner.query(`ALTER TABLE "programaciones" DROP COLUMN IF EXISTS "conductor_id"`)
    await queryRunner.query(`ALTER TABLE "programaciones" DROP COLUMN IF EXISTS "vehiculo_id"`)
  }
}

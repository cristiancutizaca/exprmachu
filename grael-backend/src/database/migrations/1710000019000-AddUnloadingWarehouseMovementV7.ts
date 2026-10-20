import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUnloadingWarehouseMovementV71710000019000 implements MigrationInterface {
  name = 'AddUnloadingWarehouseMovementV71710000019000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."movimientos_almacen_tipo_enum" ADD VALUE IF NOT EXISTS 'INGRESO_DESEMBARQUE'`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL no permite quitar un valor de enum de forma segura en caliente.
    // La reversión del código conserva compatibilidad; la migración no realiza una operación destructiva.
  }
}


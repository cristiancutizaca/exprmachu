import { MigrationInterface, QueryRunner } from 'typeorm'

export class ExtendDeliveryReturnStatesV51710000014000 implements MigrationInterface {
  name = 'ExtendDeliveryReturnStatesV51710000014000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."planillas_reparto_detalles_estado_enum" ADD VALUE IF NOT EXISTS 'RETORNO_PENDIENTE'`)
    await queryRunner.query(`ALTER TYPE "public"."planillas_reparto_detalles_estado_enum" ADD VALUE IF NOT EXISTS 'RETORNADO'`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL no permite eliminar valores de ENUM de forma segura sin reconstruirlo.
    // La migración es deliberadamente irreversible para no destruir historial operativo.
  }
}

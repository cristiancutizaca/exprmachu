import { MigrationInterface, QueryRunner } from 'typeorm'

export class ExtendTicketDeliveryStatesV41710000013000 implements MigrationInterface {
  name = 'ExtendTicketDeliveryStatesV41710000013000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const state of ['LISTO_REPARTO', 'EN_REPARTO', 'REPROGRAMADO']) {
      await queryRunner.query(`ALTER TYPE "public"."estado_ticket_enum" ADD VALUE IF NOT EXISTS '${state}'`)
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL no permite eliminar valores ENUM sin reconstruir y validar toda la columna.
  }
}

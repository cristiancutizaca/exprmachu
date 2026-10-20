import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddExtraIncidentTypeV71710000020000 implements MigrationInterface {
  name = 'AddExtraIncidentTypeV71710000020000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."incidencias_tipo_incidencia_enum" ADD VALUE IF NOT EXISTS 'BULTO_EXTRA'`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL no permite retirar un valor de enum de forma segura en caliente.
  }
}


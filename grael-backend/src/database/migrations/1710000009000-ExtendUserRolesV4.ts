import { MigrationInterface, QueryRunner } from 'typeorm'

export class ExtendUserRolesV41710000009000 implements MigrationInterface {
  name = 'ExtendUserRolesV41710000009000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const role of ['SUPERADMIN', 'ALMACEN', 'REPARTIDOR', 'AUDITOR']) {
      await queryRunner.query(`ALTER TYPE "public"."rol_usuario_enum" ADD VALUE IF NOT EXISTS '${role}'`)
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL no permite eliminar valores de ENUM de forma segura. Se conservan para compatibilidad.
  }
}

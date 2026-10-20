import { MigrationInterface, QueryRunner } from 'typeorm'

export class NormalizeTypeOrmColumnNames1710000007000 implements MigrationInterface {
  name = 'NormalizeTypeOrmColumnNames1710000007000'

  private async renameIfNeeded(queryRunner: QueryRunner, table: string, oldName: string, newName: string) {
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${oldName}')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${newName}') THEN
        EXECUTE 'ALTER TABLE "${table}" RENAME COLUMN "${oldName}" TO "${newName}"';
      END IF;
    END $$`)
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.renameIfNeeded(queryRunner, 'almacenes', 'capacidad_opcional', 'capacidadOpcional')
    await this.renameIfNeeded(queryRunner, 'ubicaciones_almacen', 'capacidad_opcional', 'capacidadOpcional')
    await this.renameIfNeeded(queryRunner, 'vehiculos', 'numero_ejes', 'numeroEjes')
    await this.renameIfNeeded(queryRunner, 'vehiculos', 'capacidad_kg', 'capacidadKg')
    await this.renameIfNeeded(queryRunner, 'vehiculos', 'capacidad_m3', 'capacidadM3')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.renameIfNeeded(queryRunner, 'almacenes', 'capacidadOpcional', 'capacidad_opcional')
    await this.renameIfNeeded(queryRunner, 'ubicaciones_almacen', 'capacidadOpcional', 'capacidad_opcional')
    await this.renameIfNeeded(queryRunner, 'vehiculos', 'numeroEjes', 'numero_ejes')
    await this.renameIfNeeded(queryRunner, 'vehiculos', 'capacidadKg', 'capacidad_kg')
    await this.renameIfNeeded(queryRunner, 'vehiculos', 'capacidadM3', 'capacidad_m3')
  }
}

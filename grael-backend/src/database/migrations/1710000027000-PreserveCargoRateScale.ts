import { MigrationInterface, QueryRunner } from 'typeorm'

export class PreserveCargoRateScale1710000027000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mercaderia_items ALTER COLUMN costo_kg TYPE numeric(12,4)')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const [row] = await queryRunner.query('SELECT EXISTS (SELECT 1 FROM mercaderia_items WHERE costo_kg <> round(costo_kg, 2)) AS tiene_fracciones')
    if (row.tiene_fracciones) throw new Error('La reversión perdería precisión en tarifas históricas')
    await queryRunner.query('ALTER TABLE mercaderia_items ALTER COLUMN costo_kg TYPE numeric(10,2)')
  }
}

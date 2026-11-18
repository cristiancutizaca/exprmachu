import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePadronRuc1710000026000 implements MigrationInterface {
  name = 'CreatePadronRuc1710000026000'

  async up(runner: QueryRunner) {
    await runner.query(`
      CREATE TABLE padron_ruc (
        ruc varchar(11) PRIMARY KEY,
        razon_social text NOT NULL,
        estado varchar(30) NOT NULL,
        condicion varchar(30) NOT NULL,
        fecha_padron date NOT NULL
      )
    `)
    await runner.query('CREATE INDEX IDX_padron_ruc_fecha ON padron_ruc (fecha_padron DESC)')
  }

  async down(runner: QueryRunner) {
    if ((await runner.query('SELECT 1 FROM padron_ruc LIMIT 1')).length) {
      throw new Error('El padrón contiene datos importados')
    }
    await runner.query('DROP TABLE padron_ruc')
  }
}

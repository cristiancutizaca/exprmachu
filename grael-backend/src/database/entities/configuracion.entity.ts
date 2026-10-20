import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm'

@Entity('configuracion')
export class Configuracion {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 60, unique: true })
  clave: string

  @Column({ type: 'text' })
  valor: string

  @Column({ length: 200, nullable: true })
  descripcion: string

  @Column({ length: 20, default: 'string' })
  tipo: string  // string | number | boolean | json

  @Column({ default: true })
  editable: boolean

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}

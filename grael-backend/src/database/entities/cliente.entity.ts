import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index
} from 'typeorm'

export enum TipoCliente { NATURAL = 'NATURAL', JURIDICO = 'JURIDICO' }

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'enum', enum: TipoCliente, default: TipoCliente.NATURAL })
  tipo: TipoCliente

  @Column({ length: 160, name: 'razon_social' })
  razonSocial: string

  @Index()
  @Column({ length: 11, nullable: true, unique: false })
  ruc: string

  @Index()
  @Column({ length: 8, nullable: true, unique: false })
  dni: string

  @Column({ length: 20, nullable: true })
  telefono: string

  @Column({ length: 100, nullable: true })
  email: string

  @Column({ length: 200, nullable: true })
  direccion: string

  @Column({ default: true })
  activo: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}

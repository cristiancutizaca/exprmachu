import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm'

export enum TipoSede {
  AGENCIA = 'AGENCIA',
  SEDE_PRINCIPAL = 'SEDE_PRINCIPAL',
  ALMACEN = 'ALMACEN',
  PUNTO_RECOJO = 'PUNTO_RECOJO',
}

@Entity('sedes')
@Index(['codigo'], { unique: true })
export class Sede {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 20 })
  codigo: string

  @Column({ length: 120 })
  nombre: string

  @Column({ type: 'enum', enum: TipoSede, default: TipoSede.AGENCIA })
  tipo: TipoSede

  @Column({ length: 11, nullable: true })
  ruc: string

  @Column({ length: 80, nullable: true })
  departamento: string

  @Column({ length: 80, nullable: true })
  provincia: string

  @Column({ length: 80, nullable: true })
  distrito: string

  @Column({ length: 10, nullable: true })
  ubigeo: string

  @Column({ length: 220, nullable: true })
  direccion: string

  @Column({ length: 220, nullable: true })
  referencia: string

  @Column({ length: 30, nullable: true })
  telefono: string

  @Column({ length: 120, nullable: true })
  correo: string

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitud: number

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitud: number

  @Column({ default: true })
  activo: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}

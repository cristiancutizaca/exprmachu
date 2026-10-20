import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
  UpdateDateColumn, Index,
} from 'typeorm'
import { Sede } from './sede.entity'

export enum TipoAlmacen {
  PRINCIPAL = 'PRINCIPAL',
  RECEPCION = 'RECEPCION',
  TRANSBORDO = 'TRANSBORDO',
  REPARTO = 'REPARTO',
  OBSERVADOS = 'OBSERVADOS',
  ENTREGADOS = 'ENTREGADOS',
}

export enum EstadoAlmacen {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

@Entity('almacenes')
@Index(['sedeId', 'codigo'], { unique: true })
export class Almacen {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Sede, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sede_id' })
  sede: Sede

  @Column({ name: 'sede_id' })
  sedeId: string

  @Column({ length: 30 })
  codigo: string

  @Column({ length: 120 })
  nombre: string

  @Column({ type: 'enum', enum: TipoAlmacen, default: TipoAlmacen.PRINCIPAL })
  tipo: TipoAlmacen

  @Column({ type: 'enum', enum: EstadoAlmacen, default: EstadoAlmacen.ACTIVO })
  estado: EstadoAlmacen

  @Column({ type: 'integer', nullable: true })
  capacidadOpcional: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}

export enum TipoUbicacionAlmacen {
  RECEPCION = 'RECEPCION',
  ZONA = 'ZONA',
  TRANSBORDO = 'TRANSBORDO',
  REPARTO = 'REPARTO',
  OBSERVADOS = 'OBSERVADOS',
  ENTREGADOS = 'ENTREGADOS',
}

@Entity('ubicaciones_almacen')
@Index(['almacenId', 'codigo'], { unique: true })
export class UbicacionAlmacen {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Almacen, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'almacen_id' })
  almacen: Almacen

  @Column({ name: 'almacen_id' })
  almacenId: string

  @Column({ length: 30 })
  codigo: string

  @Column({ length: 120 })
  nombre: string

  @Column({ type: 'enum', enum: TipoUbicacionAlmacen, default: TipoUbicacionAlmacen.ZONA })
  tipo: TipoUbicacionAlmacen

  @Column({ default: true })
  activo: boolean

  @Column({ type: 'integer', nullable: true })
  capacidadOpcional: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}

import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm'
import { Sede } from './sede.entity'

export enum EstadoVehiculo {
  ACTIVO = 'ACTIVO',
  MANTENIMIENTO = 'MANTENIMIENTO',
  INACTIVO = 'INACTIVO',
  BLOQUEADO = 'BLOQUEADO',
}

@Entity('vehiculos')
@Index(['placa'], { unique: true })
export class Vehiculo {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 12 })
  placa: string

  @Column({ length: 80, nullable: true })
  marca: string

  @Column({ length: 80, nullable: true })
  modelo: string

  @Column({ type: 'smallint', nullable: true })
  anio: number

  @Column({ length: 50, nullable: true })
  tipo: string

  @Column({ type: 'smallint', nullable: true })
  numeroEjes: number

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  capacidadKg: number

  @Column({ type: 'numeric', precision: 12, scale: 3, nullable: true })
  capacidadM3: number

  @Column({ length: 160, nullable: true })
  propietario: string

  @Column({ name: 'es_tercero', default: false })
  esTercero: boolean

  @Column({ length: 11, name: 'ruc_propietario', nullable: true })
  rucPropietario: string

  @Column({ length: 60, nullable: true })
  tuc: string

  @Column({ length: 80, name: 'habilitacion_mtc', nullable: true })
  habilitacionMtc: string

  @Column({ type: 'date', name: 'fecha_vencimiento_habilitacion', nullable: true })
  fechaVencimientoHabilitacion: Date

  @Column({ length: 80, nullable: true })
  soat: string

  @Column({ type: 'date', name: 'fecha_vencimiento_soat', nullable: true })
  fechaVencimientoSoat: Date

  @Column({ length: 80, nullable: true })
  citv: string

  @Column({ type: 'date', name: 'fecha_vencimiento_citv', nullable: true })
  fechaVencimientoCitv: Date

  @Column({ type: 'enum', enum: EstadoVehiculo, default: EstadoVehiculo.ACTIVO })
  estado: EstadoVehiculo

  @Column({ type: 'text', nullable: true })
  observaciones: string

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sede_id' })
  sede: Sede

  @Column({ name: 'sede_id', nullable: true })
  sedeId: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}

export enum EstadoConductor {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  BLOQUEADO = 'BLOQUEADO',
}

@Entity('conductores')
@Index(['dni'], { unique: true })
export class Conductor {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 8 })
  dni: string

  @Column({ length: 100 })
  nombres: string

  @Column({ length: 120 })
  apellidos: string

  @Column({ length: 30, nullable: true })
  telefono: string

  @Column({ length: 220, nullable: true })
  direccion: string

  @Column({ length: 30, nullable: true })
  licencia: string

  @Column({ length: 10, name: 'categoria_licencia', nullable: true })
  categoriaLicencia: string

  @Column({ type: 'date', name: 'fecha_vencimiento_licencia', nullable: true })
  fechaVencimientoLicencia: Date

  @Column({ length: 160, nullable: true })
  empresa: string

  @Column({ name: 'es_tercero', default: false })
  esTercero: boolean

  @Column({ type: 'enum', enum: EstadoConductor, default: EstadoConductor.ACTIVO })
  estado: EstadoConductor

  @Column({ type: 'text', nullable: true })
  observaciones: string

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sede_id' })
  sede: Sede

  @Column({ name: 'sede_id', nullable: true })
  sedeId: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}

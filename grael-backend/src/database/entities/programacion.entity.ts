import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn
} from 'typeorm'
import { Destino } from './destino.entity'
import { Vehiculo, Conductor } from './flota.entity'

@Entity('programaciones')
export class Programacion {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 40, unique: true })
  codigo: string

  @ManyToOne(() => Destino, { eager: true })
  @JoinColumn({ name: 'origen_id' })
  origen: Destino

  @ManyToOne(() => Destino, { eager: true })
  @JoinColumn({ name: 'destino_id' })
  destino: Destino

  @Column({ type: 'time', name: 'hora_salida' })
  horaSalida: string

  @Column({ length: 20, nullable: true })
  bus: string

  @ManyToOne(() => Vehiculo, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehiculo_id' })
  vehiculo: Vehiculo

  @Column({ name: 'vehiculo_id', nullable: true })
  vehiculoId: string

  @ManyToOne(() => Conductor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'conductor_id' })
  conductor: Conductor

  @Column({ name: 'conductor_id', nullable: true })
  conductorId: string

  @Column({ default: true })
  activo: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}

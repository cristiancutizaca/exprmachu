import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
  UpdateDateColumn, Index,
} from 'typeorm'
import { Destino } from './destino.entity'

@Entity('tarifas')
@Index(['origenId', 'destinoId', 'tipoMercaderia', 'vigenciaDesde'])
export class Tarifa {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Destino, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'origen_id' })
  origen: Destino

  @Column({ name: 'origen_id' })
  origenId: string

  @ManyToOne(() => Destino, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'destino_id' })
  destino: Destino

  @Column({ name: 'destino_id' })
  destinoId: string

  @Column({ length: 80, name: 'tipo_mercaderia' })
  tipoMercaderia: string

  @Column({ type: 'numeric', precision: 12, scale: 4, name: 'precio_kg', default: 0 })
  precioKg: number

  @Column({ type: 'numeric', precision: 12, scale: 4, name: 'precio_volumen', default: 0 })
  precioVolumen: number

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'precio_minimo', default: 0 })
  precioMinimo: number

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'recargo_reparto', default: 0 })
  recargoReparto: number

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'recargo_fragil', default: 0 })
  recargoFragil: number

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'recargo_express', default: 0 })
  recargoExpress: number

  @Column({ type: 'numeric', precision: 7, scale: 4, name: 'porcentaje_seguro', default: 0 })
  porcentajeSeguro: number

  @Column({ type: 'date', name: 'vigencia_desde' })
  vigenciaDesde: Date

  @Column({ type: 'date', name: 'vigencia_hasta', nullable: true })
  vigenciaHasta: Date

  @Column({ default: true })
  activo: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}

import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Ticket } from './ticket.entity'
import { Sede } from './sede.entity'
import { Almacen, UbicacionAlmacen } from './almacen.entity'

export enum EstadoBulto {
  RECEPCIONADO = 'RECEPCIONADO',
  EN_ALMACEN = 'EN_ALMACEN',
  PROGRAMADO = 'PROGRAMADO',
  CARGADO = 'CARGADO',
  EN_TRANSITO = 'EN_TRANSITO',
  TRANSBORDO = 'TRANSBORDO',
  LLEGADO = 'LLEGADO',
  DESEMBARCADO = 'DESEMBARCADO',
  LISTO_RECOJO = 'LISTO_RECOJO',
  EN_REPARTO = 'EN_REPARTO',
  ENTREGADO = 'ENTREGADO',
  OBSERVADO = 'OBSERVADO',
  FALTANTE = 'FALTANTE',
  DEVUELTO = 'DEVUELTO',
  ANULADO = 'ANULADO',
}

@Entity('bultos')
@Index(['codigo'], { unique: true })
@Index(['ticketId', 'numero'], { unique: true })
@Index(['estado'])
export class Bulto {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Ticket, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket

  @Column({ name: 'ticket_id' })
  ticketId: string

  @Column({ length: 40 })
  codigo: string

  @Column({ type: 'integer' })
  numero: number

  @Column({ length: 60, nullable: true })
  tipo: string

  @Column({ type: 'text', nullable: true })
  descripcion: string

  @Column({ type: 'integer', default: 1 })
  cantidad: number

  @Column({ type: 'numeric', precision: 12, scale: 3, name: 'peso_real', nullable: true })
  pesoReal: number

  @Column({ type: 'numeric', precision: 12, scale: 3, name: 'peso_volumetrico', nullable: true })
  pesoVolumetrico: number

  @Column({ type: 'numeric', precision: 10, scale: 3, nullable: true })
  alto: number

  @Column({ type: 'numeric', precision: 10, scale: 3, nullable: true })
  ancho: number

  @Column({ type: 'numeric', precision: 10, scale: 3, nullable: true })
  largo: number

  @Column({ type: 'numeric', precision: 12, scale: 6, nullable: true })
  volumen: number

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'valor_declarado', nullable: true })
  valorDeclarado: number

  @Column({ default: false })
  fragil: boolean

  @Column({ default: false, name: 'requiere_cuidado' })
  requiereCuidado: boolean

  @Column({ length: 80, name: 'codigo_barras', nullable: true })
  codigoBarras: string

  @Column({ type: 'text', name: 'qr_payload', nullable: true })
  qrPayload: string

  @Column({ type: 'enum', enum: EstadoBulto, default: EstadoBulto.RECEPCIONADO })
  estado: EstadoBulto

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sede_actual_id' })
  sedeActual: Sede

  @Column({ name: 'sede_actual_id', nullable: true })
  sedeActualId: string

  @ManyToOne(() => Almacen, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'almacen_actual_id' })
  almacenActual: Almacen

  @Column({ name: 'almacen_actual_id', nullable: true })
  almacenActualId: string

  @ManyToOne(() => UbicacionAlmacen, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ubicacion_actual_id' })
  ubicacionActual: UbicacionAlmacen

  @Column({ name: 'ubicacion_actual_id', nullable: true })
  ubicacionActualId: string

  @Column({ type: 'text', nullable: true })
  observaciones: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}

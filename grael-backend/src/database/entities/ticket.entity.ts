import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn,
  CreateDateColumn, UpdateDateColumn, Index, BeforeInsert
} from 'typeorm'
import { Destino }       from './destino.entity'
import { Cliente }       from './cliente.entity'
import { Programacion }  from './programacion.entity'
import { GuiaRemision }  from './mercaderia-item.entity'
import { MercaderiaItem} from './mercaderia-item.entity'
import { Usuario }       from './usuario.entity'
import { Sede }          from './sede.entity'
import { Bulto }         from './bulto.entity'

export enum EstadoTicket {
  PENDIENTE               = 'PENDIENTE',
  EN_TRANSITO             = 'EN_TRANSITO',
  DESEMBARQUE_EN_DESTINO  = 'DESEMBARQUE_EN_DESTINO',
  LISTO_REPARTO           = 'LISTO_REPARTO',
  EN_REPARTO              = 'EN_REPARTO',
  REPROGRAMADO            = 'REPROGRAMADO',
  ENTREGADO               = 'ENTREGADO',
  ANULADO                 = 'ANULADO',
}
export enum TipoEntrega { AGENCIA = 'AGENCIA', REPARTO = 'REPARTO' }
export enum TipoPago    { ORIGEN  = 'ORIGEN',  DESTINO = 'DESTINO'  }

@Entity('tickets')
@Index(['numeroTicket'])
@Index(['estado'])
@Index(['fechaEmision'])
@Index(['sedeRecepcionId'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index({ unique: true })
  @Column({ length: 20, name: 'numero_ticket' })
  numeroTicket: string

  @Column({ type: 'timestamp', name: 'fecha_emision', default: () => 'NOW()' })
  fechaEmision: Date

  @Column({ type: 'date', name: 'fecha_viaje' })
  fechaViaje: Date

  @Column({ type: 'enum', enum: EstadoTicket, default: EstadoTicket.PENDIENTE })
  estado: EstadoTicket

  @Column({ type: 'enum', enum: TipoEntrega, name: 'tipo_entrega', default: TipoEntrega.AGENCIA })
  tipoEntrega: TipoEntrega

  @Column({ type: 'enum', enum: TipoPago, name: 'tipo_pago', default: TipoPago.DESTINO })
  tipoPago: TipoPago

  // ─── Relaciones de destino ─────────────────────────────────────────────────
  @ManyToOne(() => Destino, { eager: true })
  @JoinColumn({ name: 'origen_id' })
  origen: Destino

  @Column({ name: 'origen_id' })
  origenId: string

  @ManyToOne(() => Destino, { eager: true })
  @JoinColumn({ name: 'destino_id' })
  destino: Destino

  @Column({ name: 'destino_id' })
  destinoId: string

  // V7: sede donde nació comercialmente la recepción; no equivale a custodia actual.
  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sede_recepcion_id' })
  sedeRecepcion: Sede

  @Column({ name: 'sede_recepcion_id', nullable: true })
  sedeRecepcionId: string

  // ─── Relaciones de personas ────────────────────────────────────────────────
  @ManyToOne(() => Cliente, { eager: true })
  @JoinColumn({ name: 'remitente_id' })
  remitente: Cliente

  @Column({ name: 'remitente_id' })
  remitenteId: string

  @ManyToOne(() => Cliente, { eager: true })
  @JoinColumn({ name: 'destinatario_id' })
  destinatario: Cliente

  @Column({ name: 'destinatario_id' })
  destinatarioId: string

  // ─── Programación ──────────────────────────────────────────────────────────
  @ManyToOne(() => Programacion, { eager: true, nullable: true })
  @JoinColumn({ name: 'programacion_id' })
  programacion: Programacion

  @Column({ name: 'programacion_id', nullable: true })
  programacionId: string

  // ─── Detalles adicionales ──────────────────────────────────────────────────
  @Column({ length: 100, nullable: true })
  atencion1: string

  @Column({ length: 100, nullable: true })
  atencion2: string

  // ─── Totales ───────────────────────────────────────────────────────────────
  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'sub_total', default: 0 })
  subTotal: number

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  igv: number

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  total: number

  // ─── Pago ──────────────────────────────────────────────────────────────────
  @Column({ default: false })
  pagado: boolean

  @Column({ type: 'timestamp', name: 'fecha_pago', nullable: true })
  fechaPago: Date

  @Column({ length: 30, name: 'metodo_pago', nullable: true })
  metodoPago: string

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'monto_pagado', nullable: true })
  montoPagado: number

  // ─── Anulación ─────────────────────────────────────────────────────────────
  @Column({ default: false })
  anulado: boolean

  @Column({ length: 200, name: 'motivo_anulacion', nullable: true })
  motivoAnulacion: string

  @Column({ type: 'timestamp', name: 'fecha_anulacion', nullable: true })
  fechaAnulacion: Date

  // ─── Auditoría ─────────────────────────────────────────────────────────────
  @ManyToOne(() => Usuario, { eager: false, nullable: true })
  @JoinColumn({ name: 'usuario_creacion_id' })
  usuarioCreacion: Usuario

  @Column({ name: 'usuario_creacion_id', nullable: true })
  usuarioCreacionId: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // ─── Relaciones OneToMany ──────────────────────────────────────────────────
  @OneToMany(() => GuiaRemision,   (g) => g.ticket, { cascade: true, eager: true })
  guiasRemision: GuiaRemision[]

  @OneToMany(() => MercaderiaItem, (m) => m.ticket, { cascade: true, eager: true })
  mercaderias: MercaderiaItem[]

  // V2: un ticket puede contener múltiples bultos con trazabilidad individual.
  @OneToMany(() => Bulto, (b) => b.ticket)
  bultos: Bulto[]
}

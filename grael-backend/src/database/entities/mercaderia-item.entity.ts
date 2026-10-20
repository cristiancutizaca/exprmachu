import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn
} from 'typeorm'
import { Ticket } from './ticket.entity'

// ─── Guía de Remisión ─────────────────────────────────────────────────────────
@Entity('guias_remision')
export class GuiaRemision {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 60 })
  codigo: string

  @ManyToOne(() => Ticket, (t) => t.guiasRemision, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket

  @Column({ name: 'ticket_id' })
  ticketId: string
}

// ─── Mercadería (línea de detalle del ticket) ─────────────────────────────────
@Entity('mercaderia_items')
export class MercaderiaItem {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 60 })
  tipo: string

  @Column({ length: 200, nullable: true })
  descripcion: string

  @Column({ type: 'numeric', precision: 10, scale: 3, name: 'peso_total', default: 0 })
  pesoTotal: number

  @Column({ type: 'numeric', precision: 10, scale: 2, name: 'costo_kg', default: 5.5 })
  costoKg: number

  @Column({ type: 'integer', default: 1 })
  cantidad: number

  @Column({ default: false, name: 'es_peso_volumen' })
  esPesoVolumen: boolean

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'sub_total', default: 0 })
  subTotal: number

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  igv: number

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  total: number

  @ManyToOne(() => Ticket, (t) => t.mercaderias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket

  @Column({ name: 'ticket_id' })
  ticketId: string
}

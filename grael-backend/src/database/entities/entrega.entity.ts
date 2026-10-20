import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Ticket } from './ticket.entity'
import { Bulto } from './bulto.entity'
import { Usuario } from './usuario.entity'
import { Sede } from './sede.entity'

export enum TipoEntregaV2 {
  AGENCIA = 'AGENCIA',
  REPARTO = 'REPARTO',
}

export enum EstadoEntrega {
  PROGRAMADA = 'PROGRAMADA',
  EN_REPARTO = 'EN_REPARTO',
  INTENTO_FALLIDO = 'INTENTO_FALLIDO',
  ENTREGADA = 'ENTREGADA',
  DEVUELTA = 'DEVUELTA',
}

@Entity('entregas')
export class Entrega {
  @PrimaryGeneratedColumn('uuid') id: string

  @ManyToOne(() => Ticket, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ticket_id' }) ticket: Ticket
  @Column({ name: 'ticket_id' }) ticketId: string

  @ManyToOne(() => Bulto, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'bulto_id' }) bulto: Bulto
  @Column({ name: 'bulto_id', nullable: true }) bultoId: string

  @Column({ type: 'enum', enum: TipoEntregaV2, name: 'tipo_entrega' }) tipo: TipoEntregaV2
  @Column({ type: 'enum', enum: EstadoEntrega, default: EstadoEntrega.PROGRAMADA }) estado: EstadoEntrega
  @Column({ type: 'timestamp', name: 'fecha_programada', nullable: true }) fechaProgramada: Date
  @Column({ type: 'timestamp', name: 'fecha_entrega', nullable: true }) fechaEntrega: Date
  @Column({ length: 120, name: 'nombre_receptor', nullable: true }) nombreReceptor: string
  @Column({ length: 30, name: 'documento_receptor', nullable: true }) documentoReceptor: string
  @Column({ type: 'text', nullable: true }) observacion: string
  @Column({ type: 'jsonb', nullable: true }) evidencia: Record<string, unknown>
  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true }) latitud: number
  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true }) longitud: number
  @Column({ type: 'text', nullable: true }) firma: string

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sede_id' }) sede: Sede
  @Column({ name: 'sede_id', nullable: true }) sedeId: string

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' }) usuario: Usuario
  @Column({ name: 'usuario_id', nullable: true }) usuarioId: string

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
}

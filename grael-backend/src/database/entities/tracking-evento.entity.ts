import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm'
import { Ticket } from './ticket.entity'
import { Bulto } from './bulto.entity'
import { Sede } from './sede.entity'
import { Almacen, UbicacionAlmacen } from './almacen.entity'
import { Usuario } from './usuario.entity'

export enum TipoTrackingEvento {
  RECEPCIONADO = 'RECEPCIONADO',
  INGRESO_ALMACEN = 'INGRESO_ALMACEN',
  UBICADO = 'UBICADO',
  PROGRAMADO = 'PROGRAMADO',
  CARGANDO = 'CARGANDO',
  CARGADO = 'CARGADO',
  DESPACHADO = 'DESPACHADO',
  EN_TRANSITO = 'EN_TRANSITO',
  TRANSBORDO_INICIADO = 'TRANSBORDO_INICIADO',
  TRANSBORDO_COMPLETADO = 'TRANSBORDO_COMPLETADO',
  LLEGADA_SEDE = 'LLEGADA_SEDE',
  DESEMBARCADO = 'DESEMBARCADO',
  OBSERVADO = 'OBSERVADO',
  LISTO_RECOJO = 'LISTO_RECOJO',
  SALIDA_REPARTO = 'SALIDA_REPARTO',
  INTENTO_ENTREGA = 'INTENTO_ENTREGA',
  ENTREGADO = 'ENTREGADO',
  DEVUELTO = 'DEVUELTO',
  ANULADO = 'ANULADO',
}

@Entity('tracking_eventos')
@Index(['ticketId', 'fechaHora'])
@Index(['bultoId', 'fechaHora'])
export class TrackingEvento {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Ticket, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket

  @Column({ name: 'ticket_id' })
  ticketId: string

  @ManyToOne(() => Bulto, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'bulto_id' })
  bulto: Bulto

  @Column({ name: 'bulto_id', nullable: true })
  bultoId: string

  @Column({ type: 'enum', enum: TipoTrackingEvento, name: 'tipo_evento' })
  tipoEvento: TipoTrackingEvento

  @Column({ type: 'timestamp', name: 'fecha_hora', default: () => 'NOW()' })
  fechaHora: Date

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sede_id' })
  sede: Sede

  @Column({ name: 'sede_id', nullable: true })
  sedeId: string

  @ManyToOne(() => Almacen, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'almacen_id' })
  almacen: Almacen

  @Column({ name: 'almacen_id', nullable: true })
  almacenId: string

  @ManyToOne(() => UbicacionAlmacen, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ubicacion_id' })
  ubicacion: UbicacionAlmacen

  @Column({ name: 'ubicacion_id', nullable: true })
  ubicacionId: string

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario

  @Column({ name: 'usuario_id', nullable: true })
  usuarioId: string

  @Column({ type: 'text', nullable: true })
  observacion: string

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}

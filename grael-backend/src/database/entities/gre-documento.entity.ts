import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Ticket } from './ticket.entity'
import { Comprobante } from './operaciones.entity'
import { Usuario } from './usuario.entity'
import { Sede } from './sede.entity'
import { Manifiesto } from './operaciones.entity'

export enum EstadoGreDocumento { ACEPTADO_MOCK = 'ACEPTADO_MOCK', EMITIDO = 'EMITIDO', RECHAZADO = 'RECHAZADO', ANULADO = 'ANULADO' }

@Entity('gre_documentos')
@Index(['codigo'], { unique: true })
@Index(['ticketId', 'tipo', 'createdAt'])
export class GreDocumento {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => Ticket, { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'ticket_id' }) ticket: Ticket
  @Column({ name: 'ticket_id' }) ticketId: string
  @ManyToOne(() => Manifiesto, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'manifiesto_id' }) manifiesto: Manifiesto
  @Column({ name: 'manifiesto_id', nullable: true }) manifiestoId: string
  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'sede_id' }) sede: Sede
  @Column({ name: 'sede_id', nullable: true }) sedeId: string
  @ManyToOne(() => Comprobante, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'comprobante_id' }) comprobante: Comprobante
  @Column({ name: 'comprobante_id', nullable: true }) comprobanteId: string
  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'usuario_id' }) usuario: Usuario
  @Column({ name: 'usuario_id', nullable: true }) usuarioId: string
  @Column({ length: 5 }) tipo: 'GRE' | 'CPE'
  @Column({ length: 10, nullable: true }) serie: string
  @Column({ length: 20, nullable: true }) numero: string
  @Column({ length: 80, unique: true }) codigo: string
  @Column({ length: 20 }) proveedor: string
  @Column({ type: 'enum', enum: EstadoGreDocumento, default: EstadoGreDocumento.ACEPTADO_MOCK }) estado: EstadoGreDocumento
  @Column({ type: 'text' }) xml: string
  @Column({ length: 64, name: 'hash_xml', nullable: true }) hashXml: string
  @Column({ type: 'jsonb', name: 'actor_context', nullable: true }) actorContext: Record<string, unknown>
  @Column({ type: 'text', nullable: true }) observacion: string
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}

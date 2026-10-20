import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm'
import { Usuario } from './usuario.entity'
import { Sede } from './sede.entity'

@Entity('audit_logs')
@Index(['entidad', 'entidadId', 'fechaHora'])
@Index(['usuarioId', 'fechaHora'])
@Index(['sedeId', 'fechaHora'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario

  @Column({ name: 'usuario_id', nullable: true })
  usuarioId: string

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sede_id' })
  sede: Sede

  @Column({ name: 'sede_id', nullable: true })
  sedeId: string

  @Column({ length: 80 })
  accion: string

  @Column({ length: 80 })
  entidad: string

  @Column({ length: 80, name: 'entidad_id' })
  entidadId: string

  @Column({ type: 'timestamp', name: 'fecha_hora', default: () => 'NOW()' })
  fechaHora: Date

  @Column({ length: 64, nullable: true })
  ip: string

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  userAgent: string

  @Column({ type: 'jsonb', nullable: true })
  antes: Record<string, unknown>

  @Column({ type: 'jsonb', nullable: true })
  despues: Record<string, unknown>

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}

import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Ticket } from './ticket.entity'
import { Bulto } from './bulto.entity'
import { Usuario } from './usuario.entity'
import { Sede } from './sede.entity'
import { Almacen } from './almacen.entity'

export enum TipoIncidencia {
  FALTANTE = 'FALTANTE',
  BULTO_EXTRA = 'BULTO_EXTRA',
  DANADO = 'DANADO',
  DIFERENCIA_PESO = 'DIFERENCIA_PESO',
  DOCUMENTAL = 'DOCUMENTAL',
  ENTREGA_FALLIDA = 'ENTREGA_FALLIDA',
  OTRO = 'OTRO',
}

export enum EstadoIncidencia {
  ABIERTA = 'ABIERTA',
  EN_INVESTIGACION = 'EN_INVESTIGACION',
  RESUELTA = 'RESUELTA',
  CERRADA = 'CERRADA',
}

export enum DisposicionIncidencia {
  ENCONTRADO = 'ENCONTRADO',
  REINGRESADO_ALMACEN = 'REINGRESADO_ALMACEN',
  ACEPTADO_CON_DANO = 'ACEPTADO_CON_DANO',
  DEVUELTO_ORIGEN = 'DEVUELTO_ORIGEN',
  ENTREGADO = 'ENTREGADO',
  SIN_CAMBIO_FISICO = 'SIN_CAMBIO_FISICO',
}

@Entity('incidencias')
export class Incidencia {
  @PrimaryGeneratedColumn('uuid') id: string

  @ManyToOne(() => Ticket, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ticket_id' }) ticket: Ticket
  @Column({ name: 'ticket_id' }) ticketId: string

  @ManyToOne(() => Bulto, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'bulto_id' }) bulto: Bulto
  @Column({ name: 'bulto_id', nullable: true }) bultoId: string

  @Column({ type: 'enum', enum: TipoIncidencia, name: 'tipo_incidencia' }) tipo: TipoIncidencia
  @Column({ type: 'enum', enum: EstadoIncidencia, default: EstadoIncidencia.ABIERTA }) estado: EstadoIncidencia
  @Column({ length: 240 }) descripcion: string
  @Column({ type: 'jsonb', nullable: true }) evidencia: Record<string, unknown>
  @Column({ type: 'text', nullable: true }) resolucion: string
  @Column({ type: 'varchar', length: 40, nullable: true }) disposicion: DisposicionIncidencia

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sede_id' }) sede: Sede
  @Column({ name: 'sede_id', nullable: true }) sedeId: string

  @ManyToOne(() => Almacen, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'almacen_id' }) almacen: Almacen
  @Column({ name: 'almacen_id', nullable: true }) almacenId: string

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' }) usuario: Usuario
  @Column({ name: 'usuario_id', nullable: true }) usuarioId: string

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resuelto_por_id' }) resueltoPor: Usuario
  @Column({ name: 'resuelto_por_id', nullable: true }) resueltoPorId: string

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}

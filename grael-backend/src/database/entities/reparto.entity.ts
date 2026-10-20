import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Sede } from './sede.entity'
import { Vehiculo } from './flota.entity'
import { Usuario } from './usuario.entity'
import { Ticket } from './ticket.entity'
import { Bulto } from './bulto.entity'

export enum EstadoPlanillaReparto {
  BORRADOR = 'BORRADOR',
  ASIGNADO = 'ASIGNADO',
  EN_RUTA = 'EN_RUTA',
  FINALIZADO = 'FINALIZADO',
  ANULADO = 'ANULADO',
}

export enum EstadoIntentoReparto {
  PENDIENTE = 'PENDIENTE',
  ENTREGADO = 'ENTREGADO',
  CLIENTE_AUSENTE = 'CLIENTE_AUSENTE',
  DIRECCION_INCORRECTA = 'DIRECCION_INCORRECTA',
  NO_UBICADO = 'NO_UBICADO',
  RECHAZADO = 'RECHAZADO',
  REPROGRAMADO = 'REPROGRAMADO',
  RETORNO_PENDIENTE = 'RETORNO_PENDIENTE',
  RETORNADO = 'RETORNADO',
}

@Entity('planillas_reparto')
@Index(['sedeId', 'fecha'])
export class PlanillaReparto {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column({ type: 'date' }) fecha: Date
  @Column({ length: 120, nullable: true }) zona: string
  @Column({ type: 'enum', enum: EstadoPlanillaReparto, default: EstadoPlanillaReparto.BORRADOR }) estado: EstadoPlanillaReparto
  @ManyToOne(() => Sede, { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'sede_id' }) sede: Sede
  @Column({ name: 'sede_id' }) sedeId: string
  @ManyToOne(() => Vehiculo, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'vehiculo_id' }) vehiculo: Vehiculo
  @Column({ name: 'vehiculo_id', nullable: true }) vehiculoId: string
  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'repartidor_id' }) repartidor: Usuario
  @Column({ name: 'repartidor_id', nullable: true }) repartidorId: string
  @Column({ type: 'text', nullable: true }) observacion: string
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}

@Entity('planillas_reparto_detalles')
@Index(['planillaId', 'bultoId'], { unique: true })
export class PlanillaRepartoDetalle {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => PlanillaReparto, { nullable: false, onDelete: 'CASCADE' }) @JoinColumn({ name: 'planilla_id' }) planilla: PlanillaReparto
  @Column({ name: 'planilla_id' }) planillaId: string
  @ManyToOne(() => Ticket, { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'ticket_id' }) ticket: Ticket
  @Column({ name: 'ticket_id' }) ticketId: string
  @ManyToOne(() => Bulto, { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'bulto_id' }) bulto: Bulto
  @Column({ name: 'bulto_id' }) bultoId: string
  @Column({ type: 'enum', enum: EstadoIntentoReparto, default: EstadoIntentoReparto.PENDIENTE }) estado: EstadoIntentoReparto
  @Column({ type: 'int', default: 0 }) intentos: number
  @Column({ type: 'timestamp', name: 'ultima_fecha_intento', nullable: true }) ultimaFechaIntento: Date
  @Column({ type: 'text', nullable: true }) observacion: string
  @Column({ length: 100, nullable: true }) documentoReceptor: string
  @Column({ length: 180, nullable: true }) nombreReceptor: string
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}

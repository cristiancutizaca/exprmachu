import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany,
  JoinColumn, JoinTable, CreateDateColumn, UpdateDateColumn
} from 'typeorm'
import { Ticket }   from './ticket.entity'
import { Destino }  from './destino.entity'
import { Usuario }  from './usuario.entity'
import { Cliente }  from './cliente.entity'
import { Programacion } from './programacion.entity'
import { Vehiculo, Conductor } from './flota.entity'
import { Sede } from './sede.entity'

// ─── Manifiesto ───────────────────────────────────────────────────────────────
export enum EstadoManifiesto {
  ABIERTO  = 'ABIERTO',
  EN_RUTA  = 'EN_RUTA',
  LLEGADO  = 'LLEGADO',
  CERRADO  = 'CERRADO',
}

@Entity('manifiestos')
export class Manifiesto {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 30, unique: true })
  codigo: string

  @ManyToOne(() => Programacion, { eager: true, nullable: true })
  @JoinColumn({ name: 'programacion_id' })
  programacion: Programacion

  @Column({ name: 'programacion_id', nullable: true })
  programacionId: string

  @ManyToOne(() => Destino, { eager: true })
  @JoinColumn({ name: 'origen_id' })
  origen: Destino

  @ManyToOne(() => Destino, { eager: true })
  @JoinColumn({ name: 'destino_id' })
  destino: Destino

  @Column({ type: 'date', name: 'fecha_viaje' })
  fechaViaje: Date

  @Column({ length: 120, nullable: true })
  chofer: string

  @Column({ length: 20, nullable: true })
  placa: string

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sede_origen_id' })
  sedeOrigen: Sede

  @Column({ name: 'sede_origen_id', nullable: true })
  sedeOrigenId: string

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sede_destino_id' })
  sedeDestino: Sede

  @Column({ name: 'sede_destino_id', nullable: true })
  sedeDestinoId: string

  @ManyToOne(() => Vehiculo, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehiculo_id' })
  vehiculo: Vehiculo

  @Column({ name: 'vehiculo_id', nullable: true })
  vehiculoId: string

  @ManyToOne(() => Conductor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'conductor_id' })
  conductor: Conductor

  @Column({ name: 'conductor_id', nullable: true })
  conductorId: string

  @Column({ type: 'timestamp', name: 'fecha_salida', nullable: true })
  fechaSalida: Date

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_cierre_id' })
  usuarioCierre: Usuario

  @Column({ name: 'usuario_cierre_id', nullable: true })
  usuarioCierreId: string

  @Column({ type: 'text', nullable: true })
  observaciones: string

  @Column({ type: 'enum', enum: EstadoManifiesto, default: EstadoManifiesto.ABIERTO })
  estado: EstadoManifiesto

  @ManyToMany(() => Ticket, { eager: false })
  @JoinTable({
    name: 'manifiesto_tickets',
    joinColumn:        { name: 'manifiesto_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'ticket_id',     referencedColumnName: 'id' },
  })
  tickets: Ticket[]

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}

// ─── Transbordo ───────────────────────────────────────────────────────────────
export enum EstadoTransbordo {
  ABIERTO    = 'ABIERTO',
  EN_TRANSITO= 'EN_TRANSITO',
  LLEGADO    = 'LLEGADO',
  CERRADO    = 'CERRADO',
}

@Entity('transbordos')
export class Transbordo {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 30, unique: true })
  codigo: string

  @ManyToOne(() => Destino, { eager: true })
  @JoinColumn({ name: 'origen_id' })
  origen: Destino

  @ManyToOne(() => Destino, { eager: true })
  @JoinColumn({ name: 'destino_id' })
  destino: Destino

  @ManyToOne(() => Destino, { eager: true, nullable: true })
  @JoinColumn({ name: 'desembarque_id' })
  desembarqueEn: Destino

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sede_id' })
  sede: Sede

  @Column({ name: 'sede_id', nullable: true })
  sedeId: string

  @ManyToOne(() => Vehiculo, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehiculo_anterior_id' })
  vehiculoAnterior: Vehiculo

  @Column({ name: 'vehiculo_anterior_id', nullable: true })
  vehiculoAnteriorId: string

  @ManyToOne(() => Vehiculo, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehiculo_nuevo_id' })
  vehiculoNuevo: Vehiculo

  @Column({ name: 'vehiculo_nuevo_id', nullable: true })
  vehiculoNuevoId: string

  @ManyToOne(() => Conductor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'conductor_anterior_id' })
  conductorAnterior: Conductor

  @Column({ name: 'conductor_anterior_id', nullable: true })
  conductorAnteriorId: string

  @ManyToOne(() => Conductor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'conductor_nuevo_id' })
  conductorNuevo: Conductor

  @Column({ name: 'conductor_nuevo_id', nullable: true })
  conductorNuevoId: string

  @Column({ type: 'timestamp', name: 'fecha_hora', nullable: true })
  fechaHora: Date

  @Column({ type: 'text', nullable: true })
  motivo: string

  @Column({ type: 'uuid', name: 'manifiesto_id', nullable: true })
  manifiestoId: string

  @Column({ type: 'enum', enum: EstadoTransbordo, default: EstadoTransbordo.ABIERTO })
  estado: EstadoTransbordo

  @ManyToMany(() => Ticket)
  @JoinTable({
    name: 'transbordo_tickets',
    joinColumn:        { name: 'transbordo_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'ticket_id',     referencedColumnName: 'id' },
  })
  tickets: Ticket[]

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}

// ─── Pago ─────────────────────────────────────────────────────────────────────
export enum MetodoPago {
  EFECTIVO      = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  YAPE          = 'YAPE',
  PLIN          = 'PLIN',
  TARJETA       = 'TARJETA',
}

@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Ticket, { eager: true })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket

  @Column({ name: 'ticket_id' })
  ticketId: string

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  monto: number

  @Column({ type: 'enum', enum: MetodoPago, name: 'metodo_pago' })
  metodoPago: MetodoPago

  @Column({ length: 60, nullable: true, name: 'referencia_banco' })
  referenciaBanco: string

  @Column({ length: 60, nullable: true, name: 'numero_operacion' })
  numeroOperacion: string

  @ManyToOne(() => Usuario, { eager: false, nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario

  @Column({ name: 'usuario_id', nullable: true })
  usuarioId: string

  // V7: sede donde se recaudó el pago; puede diferir de la sede de recepción.
  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sede_id' })
  sede: Sede

  @Column({ name: 'sede_id', nullable: true })
  sedeId: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}

// ─── Comprobante ──────────────────────────────────────────────────────────────
export enum TipoComprobante {
  BOLETA       = 'BOLETA',
  FACTURA      = 'FACTURA',
  NOTA_CREDITO = 'NOTA_CREDITO',
}

@Entity('comprobantes')
export class Comprobante {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'enum', enum: TipoComprobante })
  tipo: TipoComprobante

  @Column({ length: 10 })
  serie: string

  @Column({ length: 10 })
  numero: string

  @ManyToOne(() => Ticket, { eager: true, nullable: true })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket

  @ManyToOne(() => Cliente, { eager: true })
  @JoinColumn({ name: 'cliente_id' })
  cliente: any  // Cliente entity

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'sub_total' })
  subTotal: number

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  igv: number

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  total: number

  @Column({ default: 'EMITIDO' })
  estado: string  // EMITIDO | ANULADO

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sede_emision_id' })
  sedeEmision: Sede

  @Column({ name: 'sede_emision_id', nullable: true })
  sedeEmisionId: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}

// ─── Desembarque ──────────────────────────────────────────────────────────────
export enum EstadoDesembarque {
  PENDIENTE_VERIFICACION = 'PENDIENTE_VERIFICACION',
  VERIFICADO             = 'VERIFICADO',
  ENTREGADO              = 'ENTREGADO',
  OBSERVADO              = 'OBSERVADO',
}

@Entity('desembarques')
export class Desembarque {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Ticket, { eager: true })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket

  @Column({ name: 'ticket_id' })
  ticketId: string

  @Column({ type: 'enum', enum: EstadoDesembarque, default: EstadoDesembarque.PENDIENTE_VERIFICACION })
  estado: EstadoDesembarque

  @Column({ length: 200, nullable: true })
  observacion: string

  @Column({ length: 60, name: 'dni_recibe', nullable: true })
  dniRecibe: string

  @Column({ length: 160, name: 'nombre_recibe', nullable: true })
  nombreRecibe: string

  @Column({ type: 'timestamp', name: 'hora_entrega', nullable: true })
  horaEntrega: Date

  @Column({ length: 30, name: 'manifiesto_ref', nullable: true })
  manifiestoRef: string

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}

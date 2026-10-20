import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Usuario } from './usuario.entity'
import { Sede } from './sede.entity'
import { Pago, MetodoPago } from './operaciones.entity'

export enum EstadoCajaSesion {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
  OBSERVADA = 'OBSERVADA',
}

export enum TipoMovimientoCaja {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO',
  AJUSTE = 'AJUSTE',
}

@Entity('caja_sesiones')
export class CajaSesion {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => Sede, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sede_id' }) sede: Sede
  @Column({ name: 'sede_id' }) sedeId: string
  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuario_apertura_id' }) usuarioApertura: Usuario
  @Column({ name: 'usuario_apertura_id' }) usuarioAperturaId: string
  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_cierre_id' }) usuarioCierre: Usuario
  @Column({ name: 'usuario_cierre_id', nullable: true }) usuarioCierreId: string
  @Column({ type: 'timestamp', name: 'fecha_apertura', default: () => 'NOW()' }) fechaApertura: Date
  @Column({ type: 'timestamp', name: 'fecha_cierre', nullable: true }) fechaCierre: Date
  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'saldo_inicial', default: 0 }) saldoInicial: number
  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'saldo_esperado', default: 0 }) saldoEsperado: number
  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'saldo_declarado', nullable: true }) saldoDeclarado: number
  @Column({ type: 'enum', enum: EstadoCajaSesion, default: EstadoCajaSesion.ABIERTA }) estado: EstadoCajaSesion
  @Column({ type: 'text', nullable: true }) observacion: string
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}

@Entity('movimientos_caja')
export class MovimientoCaja {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => CajaSesion, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'caja_sesion_id' }) cajaSesion: CajaSesion
  @Column({ name: 'caja_sesion_id' }) cajaSesionId: string
  @ManyToOne(() => Pago, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pago_id' }) pago: Pago
  @Column({ name: 'pago_id', nullable: true }) pagoId: string
  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuario_id' }) usuario: Usuario
  @Column({ name: 'usuario_id' }) usuarioId: string
  @Column({ type: 'enum', enum: TipoMovimientoCaja, name: 'tipo_movimiento' }) tipo: TipoMovimientoCaja
  @Column({ type: 'enum', enum: MetodoPago, name: 'metodo_pago', nullable: true }) metodoPago: MetodoPago
  @Column({ type: 'numeric', precision: 12, scale: 2 }) monto: number
  @Column({ length: 180 }) concepto: string
  @Column({ type: 'jsonb', nullable: true }) metadata: Record<string, unknown>
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
}

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Sede } from './sede.entity'
import { Usuario } from './usuario.entity'
import { CajaSesion } from './caja.entity'

export enum CategoriaEgreso {
  COMBUSTIBLE = 'COMBUSTIBLE',
  CARGUIO = 'CARGUIO',
  DESCARGUIO = 'DESCARGUIO',
  TAXI = 'TAXI',
  MANTENIMIENTO = 'MANTENIMIENTO',
  PEAJE = 'PEAJE',
  VIATICO = 'VIATICO',
  APOYO_PERSONAL = 'APOYO_PERSONAL',
  SERVICIO = 'SERVICIO',
  OTRO = 'OTRO',
}

export enum EstadoEgreso {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  ANULADO = 'ANULADO',
}

@Entity('egresos')
@Index(['sedeId', 'fecha'])
@Index(['estado'])
export class Egreso {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column({ type: 'timestamp', default: () => 'NOW()' }) fecha: Date

  @ManyToOne(() => Sede, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sede_id' }) sede: Sede
  @Column({ name: 'sede_id' }) sedeId: string

  @Column({ type: 'enum', enum: CategoriaEgreso }) categoria: CategoriaEgreso
  @Column({ length: 220 }) concepto: string
  @Column({ type: 'numeric', precision: 12, scale: 2 }) monto: number
  @Column({ length: 180, nullable: true }) proveedor: string
  @Column({ length: 11, nullable: true }) ruc: string
  @Column({ length: 80, nullable: true }) documento: string
  @Column({ length: 20, nullable: true }) placa: string
  @Column({ length: 160, nullable: true }) chofer: string
  @Column({ length: 160, nullable: true }) destino: string
  @Column({ type: 'text', nullable: true }) observacion: string
  @Column({ name: 'afecta_caja', default: true }) afectaCaja: boolean

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuario_solicita_id' }) usuarioSolicita: Usuario
  @Column({ name: 'usuario_solicita_id' }) usuarioSolicitaId: string

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_autoriza_id' }) usuarioAutoriza: Usuario
  @Column({ name: 'usuario_autoriza_id', nullable: true }) usuarioAutorizaId: string

  @ManyToOne(() => CajaSesion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'caja_sesion_id' }) cajaSesion: CajaSesion
  @Column({ name: 'caja_sesion_id', nullable: true }) cajaSesionId: string

  @Column({ type: 'enum', enum: EstadoEgreso, default: EstadoEgreso.PENDIENTE }) estado: EstadoEgreso
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}

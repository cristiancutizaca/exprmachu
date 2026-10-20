import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Manifiesto } from './operaciones.entity'
import { Bulto } from './bulto.entity'
import { Sede } from './sede.entity'
import { Almacen, UbicacionAlmacen } from './almacen.entity'
import { Usuario } from './usuario.entity'

export enum EstadoDesembarqueSesion { ABIERTA = 'ABIERTA', CERRADA = 'CERRADA' }
export enum EstadoDesembarqueBulto { RECIBIDO = 'RECIBIDO', DANADO = 'DANADO', EXTRA = 'EXTRA', FALTANTE = 'FALTANTE' }

@Entity('desembarque_sesiones')
@Index(['manifiestoId', 'estado'])
export class DesembarqueSesion {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => Manifiesto, { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'manifiesto_id' }) manifiesto: Manifiesto
  @Column({ name: 'manifiesto_id' }) manifiestoId: string
  @ManyToOne(() => Sede, { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'sede_id' }) sede: Sede
  @Column({ name: 'sede_id' }) sedeId: string
  @ManyToOne(() => Almacen, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'almacen_destino_id' }) almacenDestino: Almacen
  @Column({ name: 'almacen_destino_id', nullable: true }) almacenDestinoId: string
  @ManyToOne(() => UbicacionAlmacen, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'ubicacion_destino_id' }) ubicacionDestino: UbicacionAlmacen
  @Column({ name: 'ubicacion_destino_id', nullable: true }) ubicacionDestinoId: string
  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'usuario_apertura_id' }) usuarioApertura: Usuario
  @Column({ name: 'usuario_apertura_id' }) usuarioAperturaId: string
  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'usuario_cierre_id' }) usuarioCierre: Usuario
  @Column({ name: 'usuario_cierre_id', nullable: true }) usuarioCierreId: string
  @Column({ type: 'enum', enum: EstadoDesembarqueSesion, default: EstadoDesembarqueSesion.ABIERTA }) estado: EstadoDesembarqueSesion
  @Column({ type: 'text', nullable: true }) observacion: string
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}

@Entity('desembarque_bultos')
@Index(['sesionId', 'bultoId'], { unique: true })
export class DesembarqueBulto {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => DesembarqueSesion, { nullable: false, onDelete: 'CASCADE' }) @JoinColumn({ name: 'sesion_id' }) sesion: DesembarqueSesion
  @Column({ name: 'sesion_id' }) sesionId: string
  @ManyToOne(() => Bulto, { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'bulto_id' }) bulto: Bulto
  @Column({ name: 'bulto_id' }) bultoId: string
  @Column({ type: 'enum', enum: EstadoDesembarqueBulto, default: EstadoDesembarqueBulto.RECIBIDO }) estado: EstadoDesembarqueBulto
  @Column({ type: 'text', nullable: true }) observacion: string
  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'usuario_id' }) usuario: Usuario
  @Column({ name: 'usuario_id' }) usuarioId: string
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
}

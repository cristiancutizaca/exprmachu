import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Bulto } from './bulto.entity'
import { Sede } from './sede.entity'
import { Almacen, UbicacionAlmacen } from './almacen.entity'
import { Usuario } from './usuario.entity'

export enum TipoMovimientoAlmacen {
  INGRESO = 'INGRESO',
  INGRESO_DESEMBARQUE = 'INGRESO_DESEMBARQUE',
  TRANSFERENCIA = 'TRANSFERENCIA',
  SALIDA = 'SALIDA',
  INCIDENCIA = 'INCIDENCIA',
}

@Entity('movimientos_almacen')
@Index(['bultoId', 'createdAt'])
@Index(['sedeId', 'createdAt'])
export class MovimientoAlmacen {
  @PrimaryGeneratedColumn('uuid') id: string

  @ManyToOne(() => Bulto, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'bulto_id' }) bulto: Bulto
  @Column({ name: 'bulto_id' }) bultoId: string

  @ManyToOne(() => Sede, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sede_id' }) sede: Sede
  @Column({ name: 'sede_id' }) sedeId: string

  @ManyToOne(() => Almacen, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'almacen_origen_id' }) almacenOrigen: Almacen
  @Column({ name: 'almacen_origen_id', nullable: true }) almacenOrigenId: string

  @ManyToOne(() => UbicacionAlmacen, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ubicacion_origen_id' }) ubicacionOrigen: UbicacionAlmacen
  @Column({ name: 'ubicacion_origen_id', nullable: true }) ubicacionOrigenId: string

  @ManyToOne(() => Almacen, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'almacen_destino_id' }) almacenDestino: Almacen
  @Column({ name: 'almacen_destino_id', nullable: true }) almacenDestinoId: string

  @ManyToOne(() => UbicacionAlmacen, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ubicacion_destino_id' }) ubicacionDestino: UbicacionAlmacen
  @Column({ name: 'ubicacion_destino_id', nullable: true }) ubicacionDestinoId: string

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' }) usuario: Usuario
  @Column({ name: 'usuario_id', nullable: true }) usuarioId: string

  @Column({ type: 'enum', enum: TipoMovimientoAlmacen }) tipo: TipoMovimientoAlmacen
  @Column({ type: 'varchar', length: 80, nullable: true }) referenciaTipo: string
  @Column({ type: 'uuid', nullable: true }) referenciaId: string
  @Column({ type: 'varchar', length: 240, nullable: true }) motivo: string
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
}

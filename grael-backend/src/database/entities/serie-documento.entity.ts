import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Sede } from './sede.entity'

@Entity('series_documento')
@Index(['tipo', 'sedeId', 'serie'], { unique: true })
export class SerieDocumento {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column({ length: 5 }) tipo: 'GRE' | 'CPE'
  @Column({ length: 10 }) serie: string
  @ManyToOne(() => Sede, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sede_id' }) sede: Sede
  @Column({ name: 'sede_id' }) sedeId: string
  @Column({ default: true }) activo: boolean
  @Column({ type: 'integer', name: 'correlativo_actual', default: 0 }) correlativoActual: number
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}

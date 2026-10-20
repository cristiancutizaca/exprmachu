import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn
} from 'typeorm'
import { Sede } from './sede.entity'

@Entity('destinos')
export class Destino {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 80 })
  nombre: string

  @Column({ length: 10, unique: true })
  codigo: string

  @Column({ length: 80, nullable: true })
  departamento: string

  @Column({ length: 80, nullable: true })
  provincia: string

  @Column({ default: true })
  activo: boolean

  // V7: sede operativa asociada al destino; no se infiere solo por nombre en runtime.
  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sede_id' })
  sede: Sede

  @Column({ name: 'sede_id', nullable: true })
  sedeId: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}

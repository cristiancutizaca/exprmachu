import { Sede } from './sede.entity'

import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn
} from 'typeorm'

export enum RolUsuario {
  SUPERADMIN  = 'SUPERADMIN',
  SUPERVISOR  = 'SUPERVISOR',
  ADMIN_SEDE  = 'ADMIN_SEDE',
  OPERADOR    = 'OPERADOR',
  ALMACEN     = 'ALMACEN',
  CAJERO      = 'CAJERO',
  REPARTIDOR  = 'REPARTIDOR',
  AUDITOR     = 'AUDITOR',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index({ unique: true })
  @Column({ length: 60 })
  username: string

  @Column({ length: 120 })
  password: string

  @Column({ length: 80, name: 'nombre' })
  nombre: string

  @Column({ length: 100, name: 'apellido' })
  apellido: string

  @Column({ length: 80, nullable: true })
  email: string

  @Column({ length: 20, nullable: true })
  telefono: string

  @Column({ type: 'enum', enum: RolUsuario, default: RolUsuario.OPERADOR })
  rol: RolUsuario

  @Column({ length: 60, default: 'CUSCO' })
  sede: string

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sede_id' })
  sedeRelacion: Sede

  @Column({ name: 'sede_id', nullable: true })
  sedeId: string

  @Column({ default: true, name: 'activo' })
  activo: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // Virtual: nombre completo
  get nombreCompleto(): string {
    return `${this.nombre} ${this.apellido}`
  }
}

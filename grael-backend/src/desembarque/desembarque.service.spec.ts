import { BadRequestException } from '@nestjs/common'
import { DesembarqueService } from './desembarque.service'
import { EstadoDesembarque, EstadoManifiesto } from '../database/entities/operaciones.entity'
import { EstadoBulto } from '../database/entities/bulto.entity'
import { EstadoDesembarqueBulto, EstadoDesembarqueSesion } from '../database/entities/desembarque-fisico.entity'
import { RolUsuario } from '../database/entities/usuario.entity'

const user = { sub: 'u-1', rol: RolUsuario.ADMIN_SEDE, sedeId: 'sede-1' }

function makeService(manager: any) {
  const dataSource: any = { transaction: jest.fn((callback: any) => callback(manager)) }
  return new DesembarqueService({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, dataSource)
}

describe('DesembarqueService físico V6', () => {
  it('solo abre sesión para manifiesto LLEGADO', async () => {
    const manager: any = {
      findOne: jest.fn().mockResolvedValue({ id: 'm-1', estado: EstadoManifiesto.EN_RUTA, sedeDestinoId: 'sede-1' }),
    }
    await expect(makeService(manager).abrirSesion({ manifiestoId: 'm-1', almacenDestinoId: 'a-1', ubicacionDestinoId: 'u-1' }, user)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rechaza escaneo de bulto que no pertenece al manifiesto', async () => {
    const session = { id: 'ses-1', manifiestoId: 'm-1', sedeId: 'sede-1', estado: EstadoDesembarqueSesion.ABIERTA }
    const manager: any = {
      findOne: jest.fn((entity: any) => entity.name === 'DesembarqueSesion'
        ? Promise.resolve(session)
        : entity.name === 'Manifiesto' ? Promise.resolve({ id: 'm-1', tickets: [{ id: 't-1' }] })
        : Promise.resolve({ id: 'b-foreign', codigo: 'B-999' })),
      findBy: jest.fn().mockResolvedValue([]),
    }
    await expect(makeService(manager).escanearBulto('ses-1', { codigo: 'B-999' }, user)).rejects.toMatchObject({ response: expect.objectContaining({ code: 'BULTO_NOT_IN_MANIFEST' }) })
  })

  it('devuelve resultado idempotente en segundo escaneo', async () => {
    const session = { id: 'ses-1', manifiestoId: 'm-1', sedeId: 'sede-1', estado: EstadoDesembarqueSesion.ABIERTA }
    const bulto = { id: 'b-1', codigo: 'B-001', ticketId: 't-1' }
    const existing = { id: 'db-1', sesionId: 'ses-1', bultoId: 'b-1', estado: EstadoDesembarqueBulto.RECIBIDO }
    const manager: any = {
      findOne: jest.fn((entity: any) => entity.name === 'DesembarqueSesion'
        ? Promise.resolve(session)
        : entity.name === 'Manifiesto' ? Promise.resolve({ id: 'm-1', tickets: [{ id: 't-1' }] })
        : entity.name === 'Bulto' ? Promise.resolve(bulto)
        : Promise.resolve(existing)),
      findBy: jest.fn().mockResolvedValue([bulto]),
      create: jest.fn(),
      save: jest.fn(),
    }
    const result = await makeService(manager).escanearBulto('ses-1', { codigo: 'B-001' }, user)
    expect(result.alreadyScanned).toBe(true)
    expect(manager.save).not.toHaveBeenCalled()
  })

  it('exige autorización y motivo cuando existen faltantes', async () => {
    const session = { id: 'ses-1', manifiestoId: 'm-1', sedeId: 'sede-1', estado: EstadoDesembarqueSesion.ABIERTA }
    const bulto = { id: 'b-1', ticketId: 't-1', estado: EstadoBulto.EN_TRANSITO }
    const manager: any = {
      findOne: jest.fn((entity: any) => entity.name === 'DesembarqueSesion' ? Promise.resolve(session) : Promise.resolve({ id: 'm-1', tickets: [{ id: 't-1' }] })),
      findBy: jest.fn().mockResolvedValue([bulto]),
      find: jest.fn().mockResolvedValue([]),
    }
    const operador = { id: 'u-2' }
    const service = makeService(manager)
    await expect(service.cerrarSesion('ses-1', undefined, { ...user, rol: RolUsuario.OPERADOR })).rejects.toMatchObject({ response: expect.objectContaining({ code: 'UNLOADING_DIFFERENCE_REQUIRES_AUTHORIZATION' }) })
    expect(operador).toBeTruthy()
  })

  it('bloquea el bypass legacy sin marcador explícito', async () => {
    const service = makeService({})
    await expect(service.verificar('d-1', 'u-1', user)).rejects.toMatchObject({ response: expect.objectContaining({ code: 'LEGACY_UNLOADING_REQUIRES_EXPLICIT_FLAG' }) })
  })

  it('crea registro FALTANTE, incidencia y tracking al cierre autorizado', async () => {
    const session = { id: 'ses-1', manifiestoId: 'm-1', sedeId: 'sede-1', almacenDestinoId: 'a-1', ubicacionDestinoId: 'u-1', estado: EstadoDesembarqueSesion.ABIERTA }
    const bulto = { id: 'b-1', ticketId: 't-1', estado: EstadoBulto.EN_TRANSITO }
    const manager: any = {
      findOne: jest.fn((entity: any) => entity.name === 'DesembarqueSesion' ? Promise.resolve(session) : Promise.resolve({ id: 'm-1', tickets: [{ id: 't-1' }] })),
      findBy: jest.fn().mockResolvedValue([bulto]),
      find: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn().mockResolvedValue({ id: 'u-1' }),
      create: jest.fn((_entity: any, value: any) => value),
      save: jest.fn((_entity: any, value: any) => Promise.resolve({ ...value, id: value?.id || 'generated-1' })),
    }
    const result = await makeService(manager).cerrarSesion('ses-1', 'Faltante confirmado por supervisor', user)
    expect(result.faltantesRegistrados).toBe(1)
    expect(manager.save).toHaveBeenCalledTimes(5)
    expect(manager.save.mock.calls.some(([, value]: any[]) => value.estado === EstadoDesembarqueBulto.FALTANTE)).toBe(true)
    expect(manager.save.mock.calls.some(([, value]: any[]) => value.tipo === 'FALTANTE')).toBe(true)
    expect(bulto.estado).toBe(EstadoBulto.FALTANTE)
  })
})

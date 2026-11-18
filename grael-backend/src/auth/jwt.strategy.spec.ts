import { UnauthorizedException } from '@nestjs/common'
import { JwtStrategy } from './jwt.strategy'

describe('JwtStrategy', () => {
  const secret = process.env.JWT_SECRET
  const id = 'f4758314-76c4-4565-afdb-81670bfcc46e'

  beforeAll(() => { process.env.JWT_SECRET = 'v4-test-secret' })
  afterAll(() => {
    if (secret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = secret
  })

  it('usa el rol y sede actuales de la base', async () => {
    const findOne = jest.fn().mockResolvedValue({ id, username: 'operador', rol: 'OPERADOR', sede: 'LIMA', sedeId: 'sede-lima' })
    const strategy = new JwtStrategy({ findOne } as any)
    const stale = { sub: id, rol: 'SUPERADMIN', sedeId: 'otra-sede' }
    await expect(strategy.validate(stale)).resolves.toEqual({ sub: id, username: 'operador', rol: 'OPERADOR', sede: 'LIMA', sedeId: 'sede-lima' })
    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id, activo: true } }))
  })

  it('rechaza una sesión de un usuario inactivo o sin sede', async () => {
    const findOne = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id, rol: 'CAJERO', sedeId: null })
    const strategy = new JwtStrategy({ findOne } as any)
    await expect(strategy.validate({ sub: id })).rejects.toBeInstanceOf(UnauthorizedException)
    await expect(strategy.validate({ sub: id })).rejects.toBeInstanceOf(UnauthorizedException)
  })
})

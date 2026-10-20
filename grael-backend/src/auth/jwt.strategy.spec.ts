import { JwtStrategy } from './jwt.strategy'

describe('JwtStrategy', () => {
  const previousSecret = process.env.JWT_SECRET

  beforeAll(() => { process.env.JWT_SECRET = 'v4-test-secret' })
  afterAll(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = previousSecret
  })

  it('preserva sedeId en req.user al validar el payload', async () => {
    const strategy = new JwtStrategy()
    await expect(strategy.validate({ sub: 'user-1', username: 'operador.lima', rol: 'OPERADOR', sede: 'LIMA', sedeId: 'sede-lima' })).resolves.toEqual({
      sub: 'user-1', username: 'operador.lima', rol: 'OPERADOR', sede: 'LIMA', sedeId: 'sede-lima',
    })
  })
})

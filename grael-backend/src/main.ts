import 'reflect-metadata'
import { NestFactory }           from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { DataSource } from 'typeorm'
import { requestContext } from './common/request-context'
import { HttpExceptionJsonFilter } from './common/http-exception.filter'
import { AppModule }              from './app.module'
import helmet from 'helmet'

async function bootstrap() {
  const logger = new Logger('GRAEL')
  const app = await NestFactory.create(AppModule)
  app.use(helmet({ contentSecurityPolicy: false }))
  const rateBuckets = new Map<string, { count: number; resetAt: number }>()
  app.use((req: any, res: any, next: any) => {
    const path = String(req.path || '')
    const isLogin = path === '/api/v1/auth/login'
    const isPublicTracking = path.startsWith('/api/v1/tracking/public/')
    if (!isLogin && !isPublicTracking) return next()
    const limit = isLogin ? 20 : 60
    const key = `${req.ip || 'unknown'}:${isLogin ? 'login' : 'tracking'}`
    const now = Date.now()
    const bucket = rateBuckets.get(key)
    if (!bucket || bucket.resetAt <= now) rateBuckets.set(key, { count: 1, resetAt: now + 60_000 })
    else if (bucket.count >= limit) return res.status(429).json({ statusCode: 429, code: 'RATE_LIMITED', message: 'Demasiadas solicitudes; inténtelo nuevamente en un minuto', details: { retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) } })
    else bucket.count += 1
    return next()
  })
  app.use(requestContext)
  app.useGlobalFilters(new HttpExceptionJsonFilter())

  app.enableCors({
    origin: Array.from(new Set([process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3003', 'http://localhost:3001', 'http://127.0.0.1:3003'].filter(Boolean))),
    credentials: true,
    methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
  })

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, transform: true,
    transformOptions: { enableImplicitConversion: true },
  }))

  app.setGlobalPrefix('api/v1', { exclude: ['health'] })

  // Swagger
  const doc = new DocumentBuilder()
    .setTitle('GRAEL API v1')
    .setDescription('Sistema de Gestión Logística')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, doc), {
    swaggerOptions: { persistAuthorization: true },
  })

  // Health check: confirma proceso y dependencia crítica de PostgreSQL sin exponer secretos.
  app.getHttpAdapter().get('/health', async (req: any, res: any) => {
    const started = Date.now()
    try {
      await app.get(DataSource).query('SELECT 1')
      res.json({ status: 'ok', db: 'ok', requestId: req.requestId, latencyMs: Date.now() - started, time: new Date().toISOString(), env: process.env.NODE_ENV })
    } catch {
      res.status(503).json({ status: 'degraded', db: 'unavailable', requestId: req.requestId, latencyMs: Date.now() - started, time: new Date().toISOString(), env: process.env.NODE_ENV })
    }
  })

  const port = process.env.PORT || 3001
  await app.listen(port)
  logger.log(`🚀 http://localhost:${port}  |  Swagger: http://localhost:${port}/api`)
}
bootstrap()

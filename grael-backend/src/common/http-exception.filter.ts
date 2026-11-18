import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class HttpExceptionJsonFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request & { requestId?: string }>()
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    if (!(exception instanceof HttpException)) {
      const diagnostic = process.env.NODE_ENV === 'production'
        ? { requestId: request.requestId, name: exception instanceof Error ? exception.name : 'Error' }
        : exception instanceof Error ? exception.stack : exception
      console.error('[HTTP_UNHANDLED_EXCEPTION]', diagnostic)
    }
    const raw = exception instanceof HttpException ? exception.getResponse() : null
    const body = typeof raw === 'string' ? { message: raw } : (raw && typeof raw === 'object' ? raw : { message: 'Error interno del servidor' })
    response.status(status).json({ statusCode: status, requestId: request.requestId, timestamp: new Date().toISOString(), path: request.path, ...body })
  }
}

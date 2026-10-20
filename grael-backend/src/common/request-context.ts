import { randomUUID } from 'crypto'
import { NextFunction, Request, Response } from 'express'

export function requestContext(req: Request & { requestId?: string }, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id')
  const requestId = incoming && incoming.length <= 100 ? incoming : randomUUID()
  req.requestId = requestId
  res.setHeader('x-request-id', requestId)
  next()
}

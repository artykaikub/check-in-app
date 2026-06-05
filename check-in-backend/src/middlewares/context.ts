import { randomUUID } from 'node:crypto'
import type { MiddlewareHandler } from 'hono'
import { logger } from '../core/logger.js'
import type { AppEnv } from '../types/hono.js'

export const contextMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const requestId = c.req.header('x-request-id') ?? randomUUID()
  const scopedLogger = logger.child({
    requestId,
    method: c.req.method,
    path: c.req.path
  })

  c.set('requestId', requestId)
  c.set('logger', scopedLogger)
  c.header('x-request-id', requestId)

  await next()
}

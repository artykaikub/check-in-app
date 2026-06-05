import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '../types/hono.js'

export const requestLogger: MiddlewareHandler<AppEnv> = async (c, next) => {
  const start = performance.now()

  await next()

  const durationMs = Math.round((performance.now() - start) * 100) / 100
  c.get('logger').info(
    {
      status: c.res.status,
      durationMs
    },
    'Request completed'
  )
}

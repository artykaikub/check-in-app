import type { MiddlewareHandler } from 'hono'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { env } from '../config/env.js'
import { rateLimited } from '../core/errors/http-error.js'
import type { AppEnv } from '../types/hono.js'

const limiter = new RateLimiterMemory({
  points: env.RATE_LIMIT_POINTS,
  duration: env.RATE_LIMIT_DURATION_SECONDS
})

function getClientKey(c: Parameters<MiddlewareHandler<AppEnv>>[0]): string {
  const forwardedFor = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor ?? c.req.header('x-real-ip') ?? 'anonymous'
}

export const rateLimit: MiddlewareHandler<AppEnv> = async (c, next) => {
  const key = getClientKey(c)

  try {
    const result = await limiter.consume(key)
    c.header('RateLimit-Limit', String(env.RATE_LIMIT_POINTS))
    c.header('RateLimit-Remaining', String(result.remainingPoints))
    c.header('RateLimit-Reset', String(Math.ceil(result.msBeforeNext / 1000)))
    await next()
  } catch {
    throw rateLimited()
  }
}

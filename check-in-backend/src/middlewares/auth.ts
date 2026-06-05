import type { MiddlewareHandler } from 'hono'
import { supabase } from '../db/supabase.js'
import { forbidden, unauthorized } from '../core/errors/http-error.js'
import { getProfileForAuthUser } from '../modules/auth/profile.service.js'
import type { AppEnv } from '../types/hono.js'

function extractBearerToken(authorization?: string): string | null {
  if (!authorization) {
    return null
  }

  const [scheme, token] = authorization.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }

  return token
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const accessToken = extractBearerToken(c.req.header('authorization'))

  if (!accessToken) {
    throw unauthorized()
  }

  const { data, error } = await supabase.auth.getUser(accessToken)

  if (error || !data.user) {
    throw unauthorized('Invalid or expired access token')
  }

  const profile = await getProfileForAuthUser(data.user)

  c.set('authUser', data.user)
  c.set('currentUser', profile)
  c.set('accessToken', accessToken)

  await next()
}

export function requirePermission(permission: string): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const profile = c.get('currentUser')

    if (!profile.permissions.includes(permission)) {
      throw forbidden(`Missing permission: ${permission}`)
    }

    await next()
  }
}

export function requireAnyPermission(permissions: string[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const profile = c.get('currentUser')

    if (!permissions.some((permission) => profile.permissions.includes(permission))) {
      throw forbidden(`Missing any permission: ${permissions.join(', ')}`)
    }

    await next()
  }
}

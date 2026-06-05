import { zValidator } from '@hono/zod-validator'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { requireAuth } from '../../middlewares/auth.js'
import { ErrorResponseSchema } from '../../shared/schemas/common.js'
import type { AppEnv } from '../../types/hono.js'
import {
  AuthResponseSchema,
  CurrentUserResponseSchema,
  RefreshTokenRequestSchema,
  SignInRequestSchema,
  SignOutResponseSchema,
  SignUpRequestSchema
} from './auth.schemas.js'
import { mapProfile, refreshSession, signIn, signUp } from './auth.service.js'

export const authRoutes = new OpenAPIHono<AppEnv>()

authRoutes.use('/sign-up', zValidator('json', SignUpRequestSchema))
authRoutes.use('/sign-in', zValidator('json', SignInRequestSchema))
authRoutes.use('/refresh', zValidator('json', RefreshTokenRequestSchema))
authRoutes.use('/me', requireAuth)
authRoutes.use('/sign-out', requireAuth)

const signUpRoute = createRoute({
  method: 'post',
  path: '/sign-up',
  operationId: 'signUp',
  tags: ['Auth'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: SignUpRequestSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: 'User created and authenticated when email confirmation is disabled in Supabase.',
      content: {
        'application/json': {
          schema: AuthResponseSchema
        }
      }
    },
    400: {
      description: 'Invalid sign-up request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      }
    }
  }
})

const signInRoute = createRoute({
  method: 'post',
  path: '/sign-in',
  operationId: 'signIn',
  tags: ['Auth'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: SignInRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'User authenticated',
      content: {
        'application/json': {
          schema: AuthResponseSchema
        }
      }
    },
    400: {
      description: 'Invalid credentials',
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      }
    }
  }
})

const refreshRoute = createRoute({
  method: 'post',
  path: '/refresh',
  operationId: 'refreshAuthSession',
  tags: ['Auth'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: RefreshTokenRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Session refreshed',
      content: {
        'application/json': {
          schema: AuthResponseSchema
        }
      }
    },
    400: {
      description: 'Invalid refresh token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      }
    }
  }
})

const meRoute = createRoute({
  method: 'get',
  path: '/me',
  operationId: 'getCurrentUser',
  tags: ['Auth'],
  responses: {
    200: {
      description: 'Current authenticated user',
      content: {
        'application/json': {
          schema: CurrentUserResponseSchema
        }
      }
    },
    401: {
      description: 'Missing or invalid access token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      }
    }
  }
})

const signOutRoute = createRoute({
  method: 'post',
  path: '/sign-out',
  operationId: 'signOut',
  tags: ['Auth'],
  responses: {
    200: {
      description: 'Client can discard the access and refresh tokens',
      content: {
        'application/json': {
          schema: SignOutResponseSchema
        }
      }
    }
  }
})

authRoutes.openapi(signUpRoute, async (c) => {
  const payload = c.req.valid('json')
  const result = await signUp(payload)
  return c.json(result, 201)
})

authRoutes.openapi(signInRoute, async (c) => {
  const payload = c.req.valid('json')
  const result = await signIn(payload, c)
  return c.json(result, 200)
})

authRoutes.openapi(refreshRoute, async (c) => {
  const payload = c.req.valid('json')
  const result = await refreshSession(payload)
  return c.json(result, 200)
})

authRoutes.openapi(meRoute, (c) => {
  return c.json({ user: mapProfile(c.get('currentUser')) }, 200)
})

authRoutes.openapi(signOutRoute, (c) => {
  return c.json({ success: true as const }, 200)
})

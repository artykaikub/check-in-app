import { randomUUID } from 'node:crypto'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { requireAuth } from '../../middlewares/auth.js'
import { ErrorResponseSchema } from '../../shared/schemas/common.js'
import type { AppEnv } from '../../types/hono.js'
import { mapProfile } from '../auth/auth.service.js'
import {
  CreateCheckInResponseSchema,
  CreateCheckInRequestSchema,
  FrontendProfileResponseSchema
} from './frontend.schemas.js'

export const frontendRoutes = new OpenAPIHono<AppEnv>()

frontendRoutes.use('*', requireAuth)

const profileRoute = createRoute({
  method: 'get',
  path: '/profile',
  operationId: 'getFrontendProfile',
  tags: ['Frontend'],
  responses: {
    200: {
      description: 'Frontend user profile',
      content: {
        'application/json': {
          schema: FrontendProfileResponseSchema
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

frontendRoutes.openapi(profileRoute, (c) => {
  return c.json({ user: mapProfile(c.get('currentUser')) }, 200)
})

const createCheckInRoute = createRoute({
  method: 'post',
  path: '/check-ins',
  operationId: 'createCheckIn',
  tags: ['Frontend'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: CreateCheckInRequestSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Check-in created',
      content: {
        'application/json': {
          schema: CreateCheckInResponseSchema
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

frontendRoutes.openapi(createCheckInRoute, (c) => {
  const payload = c.req.valid('json')
  const user = c.get('authUser')

  return c.json(
    {
      id: randomUUID(),
      locationId: payload.locationId,
      userId: user.id,
      checkedInAt: new Date().toISOString(),
      note: payload.note ?? null
    },
    201
  )
})

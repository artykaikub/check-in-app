import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import type { Context } from 'hono'
import { forbidden } from '../../core/errors/http-error.js'
import { requireAuth } from '../../middlewares/auth.js'
import { ErrorResponseSchema } from '../../shared/schemas/common.js'
import type { AppEnv } from '../../types/hono.js'
import {
  ConfirmAttendanceRequestSchema,
  ConfirmAttendanceResponseSchema,
  CreateAttendanceUploadUrlRequestSchema,
  CreateAttendanceUploadUrlResponseSchema
} from '../attendance/attendance.schemas.js'
import {
  confirmAttendance,
  createAttendanceUploadUrl
} from '../attendance/attendance.service.js'
import { permissions } from '../auth/permissions.js'
import {
  CreateEmergencyRequestSchema,
  CreateEmergencyResponseSchema
} from '../emergency/emergency.schemas.js'
import { createEmergencyLog } from '../emergency/emergency.service.js'

export const mobileRoutes = new OpenAPIHono<AppEnv>()

mobileRoutes.use('*', requireAuth)

function ensurePermission(c: Context<AppEnv>, permission: string) {
  if (!c.get('currentUser').permissions.includes(permission)) {
    throw forbidden(`Missing permission: ${permission}`)
  }
}

const commonErrorResponses = {
  401: {
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: ErrorResponseSchema
      }
    }
  },
  403: {
    description: 'Missing required permission',
    content: {
      'application/json': {
        schema: ErrorResponseSchema
      }
    }
  }
}

const createAttendanceUploadUrlRoute = createRoute({
  method: 'post',
  path: '/attendance/upload-url',
  operationId: 'createAttendanceUploadUrl',
  tags: ['Mobile'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: CreateAttendanceUploadUrlRequestSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Signed upload URL for attendance photo',
      content: {
        'application/json': {
          schema: CreateAttendanceUploadUrlResponseSchema
        }
      }
    },
    ...commonErrorResponses
  }
})

mobileRoutes.openapi(createAttendanceUploadUrlRoute, async (c) => {
  ensurePermission(c, permissions.mobileAttendance)
  const payload = c.req.valid('json')
  return c.json(
    await createAttendanceUploadUrl({
      userId: c.get('currentUser').id,
      payload
    }),
    201
  )
})

const checkInRoute = createRoute({
  method: 'post',
  path: '/attendance/check-in',
  operationId: 'checkIn',
  tags: ['Mobile'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: ConfirmAttendanceRequestSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Check-in created',
      content: {
        'application/json': {
          schema: ConfirmAttendanceResponseSchema
        }
      }
    },
    ...commonErrorResponses
  }
})

mobileRoutes.openapi(checkInRoute, async (c) => {
  ensurePermission(c, permissions.mobileAttendance)
  return c.json(
    await confirmAttendance({
      userId: c.get('currentUser').id,
      eventType: 'CHECK_IN',
      payload: c.req.valid('json'),
      c
    }),
    201
  )
})

const checkOutRoute = createRoute({
  method: 'post',
  path: '/attendance/check-out',
  operationId: 'checkOut',
  tags: ['Mobile'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: ConfirmAttendanceRequestSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Check-out created',
      content: {
        'application/json': {
          schema: ConfirmAttendanceResponseSchema
        }
      }
    },
    ...commonErrorResponses
  }
})

mobileRoutes.openapi(checkOutRoute, async (c) => {
  ensurePermission(c, permissions.mobileAttendance)
  return c.json(
    await confirmAttendance({
      userId: c.get('currentUser').id,
      eventType: 'CHECK_OUT',
      payload: c.req.valid('json'),
      c
    }),
    201
  )
})

const createEmergencyRoute = createRoute({
  method: 'post',
  path: '/emergency',
  operationId: 'createEmergency',
  tags: ['Mobile'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: CreateEmergencyRequestSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Emergency log created',
      content: {
        'application/json': {
          schema: CreateEmergencyResponseSchema
        }
      }
    },
    ...commonErrorResponses
  }
})

mobileRoutes.openapi(createEmergencyRoute, async (c) => {
  ensurePermission(c, permissions.mobileEmergency)
  return c.json(
    await createEmergencyLog({
      userId: c.get('currentUser').id,
      payload: c.req.valid('json'),
      c
    }),
    201
  )
})

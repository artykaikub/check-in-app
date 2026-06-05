import { z } from '@hono/zod-openapi'

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string().openapi({ example: 'BAD_REQUEST' }),
      message: z.string().openapi({ example: 'Invalid request' }),
      details: z.unknown().optional()
    })
  })
  .openapi('ErrorResponse')

export const HealthResponseSchema = z
  .object({
    status: z.literal('ok'),
    service: z.string(),
    version: z.string(),
    timestamp: z.string().datetime()
  })
  .openapi('HealthResponse')

export const UserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email().nullable(),
    fullName: z.string().nullable(),
    employeeCode: z.string().nullable(),
    isActive: z.boolean(),
    role: z.object({
      id: z.string().uuid(),
      key: z.string(),
      name: z.string()
    }),
    permissions: z.array(z.string())
  })
  .openapi('User')

export const AuthSessionSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.number().nullable(),
    tokenType: z.string()
  })
  .openapi('AuthSession')

import { z } from '@hono/zod-openapi'
import { UserSchema } from '../../shared/schemas/common.js'

export const FrontendProfileResponseSchema = z
  .object({
    user: UserSchema
  })
  .openapi('FrontendProfileResponse')

export const CreateCheckInRequestSchema = z
  .object({
    locationId: z.string().uuid(),
    note: z.string().max(500).optional()
  })
  .openapi('CreateCheckInRequest')

export const CreateCheckInResponseSchema = z
  .object({
    id: z.string().uuid(),
    locationId: z.string().uuid(),
    userId: z.string().uuid(),
    checkedInAt: z.string().datetime(),
    note: z.string().nullable()
  })
  .openapi('CreateCheckInResponse')

import { z } from '@hono/zod-openapi'
import { AuthSessionSchema, UserSchema } from '../../shared/schemas/common.js'

export const SignUpRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(1).max(120).optional()
  })
  .openapi('SignUpRequest')

export const SignInRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
    clientType: z.enum(['BACKOFFICE', 'MOBILE']).optional(),
    deviceUuid: z.string().uuid().optional()
  })
  .openapi('SignInRequest')

export const RefreshTokenRequestSchema = z
  .object({
    refreshToken: z.string().min(1)
  })
  .openapi('RefreshTokenRequest')

export const AuthResponseSchema = z
  .object({
    user: UserSchema,
    session: AuthSessionSchema.nullable(),
    device: z
      .object({
        deviceUuid: z.string().uuid(),
        isNewBinding: z.boolean()
      })
      .nullable()
  })
  .openapi('AuthResponse')

export const CurrentUserResponseSchema = z
  .object({
    user: UserSchema
  })
  .openapi('CurrentUserResponse')

export const SignOutResponseSchema = z
  .object({
    success: z.literal(true)
  })
  .openapi('SignOutResponse')

export type SignUpRequest = z.infer<typeof SignUpRequestSchema>
export type SignInRequest = z.infer<typeof SignInRequestSchema>
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>

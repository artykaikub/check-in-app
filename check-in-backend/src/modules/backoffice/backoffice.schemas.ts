import { z } from '@hono/zod-openapi'
import { UserSchema } from '../../shared/schemas/common.js'

export const UuidParamSchema = z.object({
  userId: z.string().uuid()
})

export const WorkLocationIdParamSchema = z.object({
  workLocationId: z.string().uuid()
})

export const BackofficeProfileResponseSchema = z
  .object({
    user: UserSchema
  })
  .openapi('BackofficeProfileResponse')

export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional()
})

export const RoleSchema = z
  .object({
    id: z.string().uuid(),
    key: z.string(),
    name: z.string()
  })
  .openapi('Role')

export const PermissionSchema = z
  .object({
    id: z.string().uuid(),
    key: z.string(),
    name: z.string()
  })
  .openapi('Permission')

export const BackofficeUserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email().nullable(),
    fullName: z.string().nullable(),
    employeeCode: z.string().nullable(),
    role: RoleSchema,
    isActive: z.boolean(),
    createdAt: z.string().nullable()
  })
  .openapi('BackofficeUser')

export const ListUsersResponseSchema = z
  .object({
    users: z.array(BackofficeUserSchema),
    page: z.number(),
    perPage: z.number(),
    total: z.number()
  })
  .openapi('ListUsersResponse')

export const ListRolesResponseSchema = z
  .object({
    roles: z.array(RoleSchema)
  })
  .openapi('ListRolesResponse')

export const ListPermissionsResponseSchema = z
  .object({
    permissions: z.array(PermissionSchema)
  })
  .openapi('ListPermissionsResponse')

export const DeviceBindingSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    deviceUuid: z.string().uuid(),
    isActive: z.boolean(),
    boundAt: z.string().datetime(),
    resetAt: z.string().datetime().nullable()
  })
  .openapi('DeviceBinding')

export const GetUserDeviceResponseSchema = z
  .object({
    device: DeviceBindingSchema.nullable()
  })
  .openapi('GetUserDeviceResponse')

export const ResetDeviceRequestSchema = z
  .object({
    reason: z.string().max(500).optional()
  })
  .openapi('ResetDeviceRequest')

export const ResetDeviceResponseSchema = z
  .object({
    reset: z.boolean()
  })
  .openapi('ResetDeviceResponse')

export const WorkLocationSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.string().datetime()
  })
  .openapi('WorkLocation')

export const CreateWorkLocationRequestSchema = z
  .object({
    name: z.string().min(1).max(160),
    description: z.string().max(1000).optional(),
    isActive: z.boolean().default(true)
  })
  .openapi('CreateWorkLocationRequest')

export const UpdateWorkLocationRequestSchema = CreateWorkLocationRequestSchema.partial().openapi(
  'UpdateWorkLocationRequest'
)

export const ListWorkLocationsResponseSchema = z
  .object({
    workLocations: z.array(WorkLocationSchema)
  })
  .openapi('ListWorkLocationsResponse')

export const WorkLocationResponseSchema = z
  .object({
    workLocation: WorkLocationSchema
  })
  .openapi('WorkLocationResponse')

export const LatLngNodeSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  })
  .openapi('LatLngNode')

export const EmployeeWorkAreaSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    workLocationId: z.string().uuid(),
    areaNodes: z.array(LatLngNodeSchema).length(4),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })
  .openapi('EmployeeWorkArea')

export const SetEmployeeWorkAreaRequestSchema = z
  .object({
    workLocationId: z.string().uuid(),
    areaNodes: z.array(LatLngNodeSchema).length(4),
    isActive: z.boolean().default(true)
  })
  .openapi('SetEmployeeWorkAreaRequest')

export const EmployeeWorkAreaResponseSchema = z
  .object({
    workArea: EmployeeWorkAreaSchema.nullable()
  })
  .openapi('EmployeeWorkAreaResponse')

export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>
export type CreateWorkLocationRequest = z.infer<typeof CreateWorkLocationRequestSchema>
export type UpdateWorkLocationRequest = z.infer<typeof UpdateWorkLocationRequestSchema>
export type SetEmployeeWorkAreaRequest = z.infer<typeof SetEmployeeWorkAreaRequestSchema>

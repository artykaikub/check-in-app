import { z } from '@hono/zod-openapi'

export const RetentionCleanupResponseSchema = z
  .object({
    deletedPhotoObjects: z.number(),
    expiredPhotoUploads: z.number(),
    expiredAttendanceEvents: z.number(),
    expiredAttendanceDays: z.number()
  })
  .openapi('RetentionCleanupResponse')

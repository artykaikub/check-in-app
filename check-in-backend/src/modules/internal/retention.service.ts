import { env } from '../../config/env.js'
import { badRequest } from '../../core/errors/http-error.js'
import { requireSupabaseAdmin } from '../../core/supabase/require-admin-client.js'

type PhotoUploadRow = {
  id: string
  storage_bucket: string
  storage_path: string
}

export async function cleanupAttendanceRetention() {
  const supabaseAdmin = requireSupabaseAdmin()
  const now = new Date().toISOString()
  const { data: expiredUploads, error: uploadsError } = await supabaseAdmin
    .from('attendance_photo_uploads')
    .select('id,storage_bucket,storage_path')
    .lt('expires_at', now)

  if (uploadsError) {
    throw badRequest(uploadsError.message)
  }

  const uploads = (expiredUploads ?? []) as PhotoUploadRow[]
  const storagePaths = uploads.map((upload) => upload.storage_path)
  let deletedPhotoObjects = 0

  if (storagePaths.length > 0) {
    const { data, error } = await supabaseAdmin.storage
      .from(env.ATTENDANCE_PHOTO_BUCKET)
      .remove(storagePaths)

    if (!error) {
      deletedPhotoObjects = data?.length ?? 0
    }
  }

  const { count: expiredAttendanceEvents, error: eventsError } = await supabaseAdmin
    .from('attendance_events')
    .delete({ count: 'exact' })
    .lt('expires_at', now)

  if (eventsError) {
    throw badRequest(eventsError.message)
  }

  const { count: expiredAttendanceDays, error: daysError } = await supabaseAdmin
    .from('attendance_days')
    .delete({ count: 'exact' })
    .lt('expires_at', now)

  if (daysError) {
    throw badRequest(daysError.message)
  }

  const { count: expiredPhotoUploads, error: photoUploadsError } = await supabaseAdmin
    .from('attendance_photo_uploads')
    .delete({ count: 'exact' })
    .lt('expires_at', now)

  if (photoUploadsError) {
    throw badRequest(photoUploadsError.message)
  }

  return {
    deletedPhotoObjects,
    expiredPhotoUploads: expiredPhotoUploads ?? 0,
    expiredAttendanceEvents: expiredAttendanceEvents ?? 0,
    expiredAttendanceDays: expiredAttendanceDays ?? 0
  }
}

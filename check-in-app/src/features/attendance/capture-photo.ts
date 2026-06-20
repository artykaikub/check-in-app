/**
 * Produces the JPEG bytes uploaded alongside a check-in/out. The verification
 * sheet has no live viewfinder (that's the Capture screen's job), so for the
 * geofence confirmation we synthesize a small stamped JPEG on a canvas. Callers
 * may instead pass a real `File` from an `<input capture>` fallback.
 */

export const PHOTO_CONTENT_TYPE = 'image/jpeg'

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode photo'))),
      PHOTO_CONTENT_TYPE,
      0.85
    )
  })
}

/**
 * Renders a timestamp + GPS overlay onto a neutral background and returns it as a
 * JPEG blob. Stands in for a real camera frame in the confirmation sheet.
 */
export async function createStampedPhoto(opts: {
  lat: number
  lng: number
  label: string
}): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 720
  canvas.height = 960
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    // Extremely unlikely; fall back to a 1x1 transparent-ish JPEG-sized blob.
    return new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: PHOTO_CONTENT_TYPE })
  }

  const grad = ctx.createLinearGradient(0, 0, 720, 960)
  grad.addColorStop(0, '#5b6b7a')
  grad.addColorStop(1, '#39424d')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 720, 960)

  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(24, 24, 420, 110)
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 26px system-ui, sans-serif'
  ctx.fillText(opts.label, 44, 66)
  ctx.font = '500 22px system-ui, sans-serif'
  ctx.fillText(`${opts.lat.toFixed(5)}, ${opts.lng.toFixed(5)}`, 44, 104)

  return canvasToBlob(canvas)
}

/** Uploads the photo bytes to the storage-provider signed URL via PUT. */
export async function putPhotoBytes(signedUploadUrl: string, photo: Blob): Promise<void> {
  const res = await fetch(signedUploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': photo.type || PHOTO_CONTENT_TYPE },
    body: photo
  })
  if (!res.ok) {
    throw new Error(`Photo upload failed (${res.status})`)
  }
}

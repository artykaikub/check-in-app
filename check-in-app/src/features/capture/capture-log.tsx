'use client'

import { Camera, Clock, MapPin, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CameraCapture,
  type CapturedPhoto
} from '@/components/shell/camera-capture'
import { useListFrontendAttendance } from '@/generated/api/frontend/frontend'
import { useCreateAttendanceUploadUrl } from '@/generated/api/mobile/mobile'
import type {
  AttendanceDay,
  AttendanceEvent,
  CreateAttendanceUploadUrlRequestContentType
} from '@/generated/api/model'
import { useGetFrontendProfile } from '@/generated/api/frontend/frontend'
import { ApiError } from '@/lib/api/fetch-client'
import { useI18n } from '@/lib/i18n/i18n-provider'
import type { Lang } from '@/lib/i18n/dictionaries'

/** A normalized entry rendered in the photo log. */
type LogEntry = {
  id: string
  photoUrl: string | null
  /** Background gradient when no real photo is available. */
  bg: string
  gps: string
  /** HH:MM stamp. */
  stamp: string
  /** Capture moment, used for the relative "ago" label and delete window. */
  capturedAt: number
  who: string
  whoInitials: string
  notes: string | null
  /** Locally-created ad-hoc captures can be deleted within the window. */
  deletable: boolean
}

const GRADIENTS = [
  'linear-gradient(135deg,#5b6b7a,#39424d)',
  'linear-gradient(135deg,#7a6a5b,#4d4239)',
  'linear-gradient(135deg,#5b727a,#394a4d)',
  'linear-gradient(135deg,#6a5b7a,#42394d)'
]

/** Ad-hoc captures can be deleted for 15 minutes after creation. */
const DELETE_WINDOW_MS = 15 * 60 * 1000

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function gpsLabel(lat: number | null | undefined, lng: number | null | undefined): string {
  if (lat == null || lng == null) return '—'
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

function timeLabel(iso: string | number, lang: Lang): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(lang === 'th' ? 'th-TH' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function agoLabel(capturedAt: number, now: number, lang: Lang): string {
  const mins = Math.floor((now - capturedAt) / 60000)
  if (mins < 1) return lang === 'th' ? 'เมื่อสักครู่' : 'just now'
  if (mins < 60) return mins + (lang === 'th' ? ' นาทีที่แล้ว' : 'm ago')
  return Math.floor(mins / 60) + (lang === 'th' ? ' ชม.ที่แล้ว' : 'h ago')
}

const CONTENT_TYPE_BY_MIME: Record<string, CreateAttendanceUploadUrlRequestContentType> =
  {
    'image/jpeg': 'image/jpeg',
    'image/png': 'image/png',
    'image/webp': 'image/webp'
  }

/**
 * CAPTURE LOG body (per the prototype `onCapture` block).
 *
 * The persisted log is derived from the signed-in employee's attendance
 * check-in / check-out photos ({@link useListFrontendAttendance}) — the real
 * source of captured imagery. Ad-hoc captures taken via the camera overlay are
 * uploaded best-effort through the attendance upload-url mechanism and shown
 * optimistically at the top of the list with a retention countdown.
 */
export function CaptureLog() {
  const { t, lang } = useI18n()
  const profile = useGetFrontendProfile()
  const attendance = useListFrontendAttendance({ perPage: 30 })
  const createUploadUrl = useCreateAttendanceUploadUrl()

  const [cameraOpen, setCameraOpen] = useState(false)
  const [adHoc, setAdHoc] = useState<LogEntry[]>([])
  const [now, setNow] = useState(() => Date.now())

  // Keep relative timestamps / delete windows fresh.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const myName = profile.data?.user.fullName ?? (lang === 'th' ? 'พนักงาน' : 'Staff')
  const myInitials = initials(myName)

  const attendanceEntries = useMemo<LogEntry[]>(() => {
    const days = attendance.data?.attendanceDays ?? []
    const entries: LogEntry[] = []
    let gi = 0
    const pushEvent = (day: AttendanceDay, ev: AttendanceEvent) => {
      if (!ev) return
      entries.push({
        id: ev.id,
        photoUrl: ev.photoUrl,
        bg: GRADIENTS[gi++ % GRADIENTS.length],
        gps: gpsLabel(ev.lat, ev.lng),
        stamp: timeLabel(ev.capturedAt, lang),
        capturedAt: new Date(ev.capturedAt).getTime(),
        who: day.user?.fullName ?? myName,
        whoInitials: initials(day.user?.fullName ?? myName),
        notes: null,
        deletable: false
      })
    }
    for (const day of days) {
      for (const ev of day.events) {
        pushEvent(day, ev)
      }
    }
    entries.sort((a, b) => b.capturedAt - a.capturedAt)
    return entries
  }, [attendance.data, lang, myName])

  const entries = useMemo<LogEntry[]>(
    () => [...adHoc, ...attendanceEntries],
    [adHoc, attendanceEntries]
  )

  const handleCapture = useCallback(
    async (photo: CapturedPhoto) => {
      const contentType = CONTENT_TYPE_BY_MIME[photo.blob.type] ?? 'image/jpeg'
      // Optimistic local entry — shown immediately regardless of upload result.
      const entry: LogEntry = {
        id: `local-${Date.now()}`,
        photoUrl: photo.previewUrl,
        bg: GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)],
        gps: gpsLabel(photo.lat, photo.lng),
        stamp: `${pad(photo.capturedAt.getHours())}:${pad(photo.capturedAt.getMinutes())}`,
        capturedAt: photo.capturedAt.getTime(),
        who: myName,
        whoInitials: myInitials,
        notes: photo.notes.trim() ? photo.notes.trim() : null,
        deletable: true
      }
      setAdHoc((prev) => [entry, ...prev])
      setCameraOpen(false)

      // Best-effort upload through the attendance upload-url mechanism.
      try {
        const { signedUploadUrl } = await createUploadUrl.mutateAsync({
          data: { type: 'CHECK_IN', contentType }
        })
        await fetch(signedUploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: photo.blob
        })
        toast.success(t.t_photo)
      } catch (error) {
        const message = error instanceof ApiError ? error.message : t.t_photo
        // Keep the optimistic entry; surface a soft notice.
        toast.success(message)
      }
    },
    [createUploadUrl, myInitials, myName, t]
  )

  const deleteEntry = useCallback(
    (id: string) => {
      setAdHoc((prev) => {
        const target = prev.find((p) => p.id === id)
        if (target?.photoUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(target.photoUrl)
        }
        return prev.filter((p) => p.id !== id)
      })
      toast.success(t.t_deleted)
    },
    [t]
  )

  return (
    <div
      style={{
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }}
    >
      <button
        type="button"
        onClick={() => setCameraOpen(true)}
        style={{
          height: 52,
          borderRadius: 4,
          background: 'var(--trinity-primary)',
          color: '#fff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        <Camera size={20} />
        {t.capture_title}
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 2
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--trinity-mfg)',
            textTransform: 'uppercase',
            letterSpacing: '.5px'
          }}
        >
          {t.log_title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--trinity-mfg2)',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <Users size={13} />
          {t.site_scoped}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {entries.map((ph) => {
          const ageMs = now - ph.capturedAt
          const canDelete = ph.deletable && ageMs < DELETE_WINDOW_MS
          const remainMin = Math.max(0, Math.ceil((DELETE_WINDOW_MS - ageMs) / 60000))
          return (
            <div
              key={ph.id}
              style={{
                background: '#fff',
                border: '1px solid var(--trinity-border)',
                borderRadius: 8,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: 124,
                  background: ph.bg,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  padding: '8px 10px'
                }}
              >
                {ph.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ph.photoUrl}
                    alt=""
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                )}
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'rgba(0,0,0,.45)',
                    color: '#fff',
                    padding: '3px 7px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 600
                  }}
                >
                  <MapPin size={11} />
                  {ph.gps}
                </div>
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    background: 'rgba(0,0,0,.45)',
                    color: '#fff',
                    padding: '3px 7px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {ph.stamp}
                </div>
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    background: 'rgba(0,0,0,.45)',
                    color: '#fff',
                    padding: '3px 7px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Camera size={11} />
                </div>
              </div>
              <div style={{ padding: '11px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'var(--trinity-primary-l)',
                      color: 'var(--trinity-primary)',
                      fontSize: 10,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {ph.whoInitials}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{ph.who}</div>
                  <div style={{ fontSize: 11, color: 'var(--trinity-mfg)' }}>
                    {agoLabel(ph.capturedAt, now, lang)}
                  </div>
                </div>
                {ph.notes && (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: '#334155',
                      marginTop: 8,
                      lineHeight: '18px'
                    }}
                  >
                    {ph.notes}
                  </div>
                )}
                {canDelete && (
                  <div
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid var(--trinity-muted)',
                      paddingTop: 9
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10.5,
                        color: 'var(--trinity-warn)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <Clock size={12} />
                      {`${t.delete_window} ${remainMin}${lang === 'th' ? ' นาที' : 'm'}`}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteEntry(ph.id)}
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: 'var(--trinity-danger)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Trash2 size={13} />
                      {t.delete}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {entries.length === 0 && !attendance.isLoading && (
          <div
            style={{
              background: '#fff',
              border: '1px solid var(--trinity-border)',
              borderRadius: 8,
              padding: '28px 16px',
              textAlign: 'center',
              fontSize: 12.5,
              color: 'var(--trinity-mfg2)'
            }}
          >
            {t.viewfinder_hint}
          </div>
        )}
      </div>

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCapture}
      />
    </div>
  )
}

alter table public.attendance_photo_uploads
  add column if not exists upload_expires_at timestamptz not null default (now() + interval '2 hours');

insert into storage.buckets (id, name, public)
values ('attendance-photos', 'attendance-photos', false)
on conflict (id) do nothing;

create table if not exists public.attendance_photo_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  storage_bucket text not null default 'attendance-photos',
  storage_path text not null unique,
  content_type text not null,
  status text not null default 'PENDING',
  expires_at timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_photo_uploads_event_type_check check (event_type in ('CHECK_IN', 'CHECK_OUT')),
  constraint attendance_photo_uploads_status_check check (status in ('PENDING', 'COMPLETED', 'CANCELLED'))
);

create table if not exists public.attendance_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null,
  check_in_event_id uuid,
  check_out_event_id uuid,
  review_status text not null default 'PENDING',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  expires_at timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, work_date),
  constraint attendance_days_review_status_check check (review_status in ('PENDING', 'APPROVED', 'REJECTED'))
);

create table if not exists public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  attendance_day_id uuid not null references public.attendance_days(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  photo_upload_id uuid references public.attendance_photo_uploads(id) on delete set null,
  photo_bucket text not null default 'attendance-photos',
  photo_path text not null,
  validation_status text not null,
  validation_reason text,
  work_area_snapshot jsonb not null,
  captured_at timestamptz not null,
  expires_at timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  constraint attendance_events_event_type_check check (event_type in ('CHECK_IN', 'CHECK_OUT')),
  constraint attendance_events_validation_status_check check (validation_status in ('VALID', 'INVALID'))
);

create unique index if not exists attendance_events_one_type_per_day
  on public.attendance_events(attendance_day_id, event_type);

alter table public.attendance_days
  drop constraint if exists attendance_days_check_in_event_id_fkey,
  add constraint attendance_days_check_in_event_id_fkey
    foreign key (check_in_event_id) references public.attendance_events(id) on delete set null;

alter table public.attendance_days
  drop constraint if exists attendance_days_check_out_event_id_fkey,
  add constraint attendance_days_check_out_event_id_fkey
    foreign key (check_out_event_id) references public.attendance_events(id) on delete set null;

create table if not exists public.emergency_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  emergency_type text,
  message text,
  status text not null default 'OPEN',
  triggered_at timestamptz not null,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  handled_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emergency_logs_status_check check (status in ('OPEN', 'ACKNOWLEDGED', 'RESOLVED'))
);

create trigger attendance_photo_uploads_set_updated_at
  before update on public.attendance_photo_uploads
  for each row execute function public.set_updated_at();

create trigger attendance_days_set_updated_at
  before update on public.attendance_days
  for each row execute function public.set_updated_at();

create trigger emergency_logs_set_updated_at
  before update on public.emergency_logs
  for each row execute function public.set_updated_at();

-- Area inspections ("ตรวจพื้นที่") — a feature separate from attendance check-in
-- photos. Staff capture ad-hoc site-condition reports; everyone assigned to the
-- same work location (site) can see them, and admins see all in the backoffice.

insert into storage.buckets (id, name, public)
values ('area-inspection-photos', 'area-inspection-photos', false)
on conflict (id) do nothing;

-- Two-step upload slots (mirrors attendance_photo_uploads): a signed upload URL
-- is issued first, then confirmed once the blob is in storage.
create table if not exists public.area_inspection_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_bucket text not null default 'area-inspection-photos',
  storage_path text not null unique,
  content_type text not null,
  status text not null default 'PENDING',
  expires_at timestamptz not null default (now() + interval '90 days'),
  upload_expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint area_inspection_uploads_status_check check (status in ('PENDING', 'COMPLETED', 'CANCELLED'))
);

create table if not exists public.area_inspections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Snapshot of the reporter's active work location (site) at capture time;
  -- site-wide visibility is scoped by this column.
  work_location_id uuid references public.work_locations(id) on delete set null,
  lat numeric(9,6),
  lng numeric(9,6),
  notes text,
  photo_upload_id uuid references public.area_inspection_uploads(id) on delete set null,
  photo_bucket text not null default 'area-inspection-photos',
  photo_path text not null,
  captured_at timestamptz not null,
  expires_at timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now()
);

create index if not exists area_inspections_location_captured_idx
  on public.area_inspections(work_location_id, captured_at desc);

create index if not exists area_inspections_user_idx
  on public.area_inspections(user_id);

create trigger area_inspection_uploads_set_updated_at
  before update on public.area_inspection_uploads
  for each row execute function public.set_updated_at();

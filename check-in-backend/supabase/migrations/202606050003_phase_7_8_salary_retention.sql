insert into storage.buckets (id, name, public)
values ('salary-uploads', 'salary-uploads', false)
on conflict (id) do nothing;

create table if not exists public.salary_upload_batches (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  storage_bucket text not null default 'salary-uploads',
  storage_path text not null unique,
  original_file_name text,
  status text not null default 'PENDING',
  total_rows integer not null default 0,
  success_rows integer not null default 0,
  error_rows integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salary_upload_batches_status_check check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'))
);

create table if not exists public.salary_records (
  id uuid primary key default gen_random_uuid(),
  upload_batch_id uuid not null references public.salary_upload_batches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  employee_code text,
  employee_email text,
  period_month text not null,
  base_salary numeric(14,2) not null default 0,
  allowance numeric(14,2) not null default 0,
  deduction numeric(14,2) not null default 0,
  net_salary numeric(14,2) not null default 0,
  accumulated_salary numeric(14,2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_month),
  constraint salary_records_period_month_check check (period_month ~ '^[0-9]{4}-[0-9]{2}$')
);

create trigger salary_upload_batches_set_updated_at
  before update on public.salary_upload_batches
  for each row execute function public.set_updated_at();

create trigger salary_records_set_updated_at
  before update on public.salary_records
  for each row execute function public.set_updated_at();

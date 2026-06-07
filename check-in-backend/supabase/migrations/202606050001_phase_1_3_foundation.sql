create extension if not exists "pgcrypto";

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_key_format check (key ~ '^[A-Z][A-Z0-9_]*$')
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  constraint permissions_key_format check (key ~ '^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$')
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  employee_code text unique,
  role_id uuid not null references public.roles(id),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  effect text not null default 'ALLOW',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  primary key (user_id, permission_id),
  constraint user_permissions_effect_check check (effect in ('ALLOW', 'DENY'))
);

create table if not exists public.device_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_uuid uuid not null,
  is_active boolean not null default true,
  bound_at timestamptz not null default now(),
  reset_at timestamptz,
  reset_by uuid references public.profiles(id) on delete set null,
  reset_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists device_bindings_one_active_per_user
  on public.device_bindings(user_id)
  where is_active;

create table if not exists public.work_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_work_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_location_id uuid not null references public.work_locations(id) on delete restrict,
  area_nodes jsonb not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_work_areas_four_nodes check (
    jsonb_typeof(area_nodes) = 'array'
    and jsonb_array_length(area_nodes) = 4
  )
);

create unique index if not exists employee_work_areas_one_active_per_user
  on public.employee_work_areas(user_id)
  where is_active;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.event_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  severity text not null default 'INFO',
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint event_logs_severity_check check (severity in ('INFO', 'WARN', 'ERROR'))
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger roles_set_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger device_bindings_set_updated_at
  before update on public.device_bindings
  for each row execute function public.set_updated_at();

create trigger work_locations_set_updated_at
  before update on public.work_locations
  for each row execute function public.set_updated_at();

create trigger employee_work_areas_set_updated_at
  before update on public.employee_work_areas
  for each row execute function public.set_updated_at();

insert into public.roles (key, name, description)
values
  ('ADMIN', 'Admin', 'Default administrator role'),
  ('USER', 'User', 'Default employee role')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description;

insert into public.permissions (key, name, description)
values
  ('users:read', 'Read users', 'View employee and user records'),
  ('users:create', 'Create users', 'Create employee and user records'),
  ('users:update', 'Update users', 'Update employee and user records'),
  ('users:reset_device', 'Reset user device', 'Reset an employee device binding'),
  ('roles:read', 'Read roles', 'View roles'),
  ('roles:assign', 'Assign roles', 'Assign roles to users'),
  ('permissions:read', 'Read permissions', 'View permissions'),
  ('permissions:update', 'Update permissions', 'Update user permission overrides'),
  ('work_areas:read', 'Read work areas', 'View work locations and assigned areas'),
  ('work_areas:manage', 'Manage work areas', 'Create and update work locations and assigned areas'),
  ('attendance:read', 'Read attendance', 'View attendance records'),
  ('attendance:review', 'Review attendance', 'Review attendance records'),
  ('salary:read', 'Read salary', 'View salary upload batches and records'),
  ('salary:upload', 'Upload salary', 'Upload and import salary spreadsheets'),
  ('salary:delete', 'Delete salary uploads', 'Delete salary upload batches and imported salary records'),
  ('logs:read', 'Read logs', 'View audit, event, and emergency logs'),
  ('emergency:read', 'Read emergency logs', 'View emergency logs'),
  ('emergency:update', 'Update emergency logs', 'Acknowledge or resolve emergency logs'),
  ('mobile:attendance', 'Mobile attendance', 'Create mobile check-in and check-out records'),
  ('mobile:emergency', 'Mobile emergency', 'Create mobile emergency records')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
cross join public.permissions
where roles.key = 'ADMIN'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions
  on permissions.key in ('mobile:attendance', 'mobile:emergency')
where roles.key = 'USER'
on conflict do nothing;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_role_id uuid;
begin
  select id into default_role_id
  from public.roles
  where key = 'USER';

  insert into public.profiles (id, email, full_name, role_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    default_role_id
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

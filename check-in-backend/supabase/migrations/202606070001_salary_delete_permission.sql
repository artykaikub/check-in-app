insert into public.permissions (key, name, description)
values
  ('salary:delete', 'Delete salary uploads', 'Delete salary upload batches and imported salary records')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.key = 'salary:delete'
where roles.key = 'ADMIN'
on conflict do nothing;

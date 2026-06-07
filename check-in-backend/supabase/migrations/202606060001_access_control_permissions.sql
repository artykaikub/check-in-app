insert into public.permissions (key, name, description)
values
  ('roles:assign', 'Assign roles', 'Assign roles to users'),
  ('permissions:update', 'Update permissions', 'Update user permission overrides')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions
  on permissions.key in ('roles:assign', 'permissions:update')
where roles.key = 'ADMIN'
on conflict do nothing;

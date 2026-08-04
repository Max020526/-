-- Read-only internal roles use the same canonical inventory.view key.
with viewer_roles(role_code) as (values
  ('warehouse_staff'), ('product_operator'), ('order_cs'), ('buyer'),
  ('finance'), ('auditor'), ('cashier')
)
insert into public.role_permissions(role_id, permission_id)
select role.id, permission.id
from viewer_roles
join public.roles role on role.code = viewer_roles.role_code
join public.permissions permission on permission.code = 'inventory.view'
on conflict do nothing;

notify pgrst, 'reload schema';

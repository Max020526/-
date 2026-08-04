create index if not exists user_warehouses_assigned_by_idx
  on public.user_warehouses(assigned_by) where assigned_by is not null;

drop policy if exists user_warehouses_manage_admin on public.user_warehouses;

create policy user_warehouses_insert_admin on public.user_warehouses
for insert to authenticated
with check (
  organization_id = (select private.current_organization_id())
  and (private.has_permission('users.manage') or private.is_global_warehouse_operator())
  and exists (
    select 1 from public.profiles profile
    where profile.id = user_id and profile.organization_id = organization_id
  )
  and exists (
    select 1 from public.warehouses warehouse
    where warehouse.id = warehouse_id and warehouse.organization_id = organization_id
  )
);

create policy user_warehouses_update_admin on public.user_warehouses
for update to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (private.has_permission('users.manage') or private.is_global_warehouse_operator())
)
with check (
  organization_id = (select private.current_organization_id())
  and (private.has_permission('users.manage') or private.is_global_warehouse_operator())
  and exists (
    select 1 from public.profiles profile
    where profile.id = user_id and profile.organization_id = organization_id
  )
  and exists (
    select 1 from public.warehouses warehouse
    where warehouse.id = warehouse_id and warehouse.organization_id = organization_id
  )
);

create policy user_warehouses_delete_admin on public.user_warehouses
for delete to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (private.has_permission('users.manage') or private.is_global_warehouse_operator())
);

notify pgrst, 'reload schema';

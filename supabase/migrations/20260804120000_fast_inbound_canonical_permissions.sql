-- Canonical quick-inbound authorization chain.
-- profiles -> user_roles -> roles -> role_permissions -> permissions
-- plus explicit per-user warehouse assignments for non-global operators.

insert into public.permissions (code, module, action, description)
values
  ('inventory.view', 'inventory', 'view', '查看库存余额与流水'),
  ('inventory.create', 'inventory', 'create', '创建仓库库存余额'),
  ('inventory.adjust', 'inventory', 'adjust', '通过受控事务调整库存'),
  ('receiving.create', 'receiving', 'create', '创建到货单与到货明细'),
  ('receiving.confirm', 'receiving', 'confirm', '确认到货并增加库存'),
  ('sku.create', 'sku', 'create', '在入库流程中创建SKU')
on conflict (code) do update
set module = excluded.module,
    action = excluded.action,
    description = excluded.description,
    updated_at = now();

with required(role_code, permission_code) as (values
  ('owner','inventory.view'),('owner','inventory.create'),('owner','inventory.adjust'),
  ('owner','receiving.create'),('owner','receiving.confirm'),('owner','sku.create'),
  ('system_admin','inventory.view'),('system_admin','inventory.create'),('system_admin','inventory.adjust'),
  ('system_admin','receiving.create'),('system_admin','receiving.confirm'),('system_admin','sku.create'),
  ('warehouse_manager','inventory.view'),('warehouse_manager','inventory.create'),('warehouse_manager','inventory.adjust'),
  ('warehouse_manager','receiving.create'),('warehouse_manager','receiving.confirm'),('warehouse_manager','sku.create')
)
insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from required
join public.roles role on role.code = required.role_code
join public.permissions permission on permission.code = required.permission_code
on conflict do nothing;

-- Owners continue to inherit every permission, including permissions added later.
insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role cross join public.permissions permission
where role.code = 'owner'
on conflict do nothing;

create table if not exists public.user_warehouses (
  user_id uuid not null references public.profiles(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  is_active boolean not null default true,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, warehouse_id)
);

create index if not exists user_warehouses_organization_idx
  on public.user_warehouses(organization_id, user_id) where is_active;
create index if not exists user_warehouses_warehouse_idx
  on public.user_warehouses(warehouse_id) where is_active;

alter table public.user_warehouses enable row level security;

create or replace function private.is_global_warehouse_operator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.is_active
      and (
        profile.role in ('owner','system_admin')
        or exists (
          select 1
          from public.user_roles user_role
          join public.roles role on role.id = user_role.role_id
          where user_role.user_id = profile.id
            and role.organization_id = profile.organization_id
            and role.code in ('owner','system_admin')
        )
      )
  );
$$;

create or replace function private.has_warehouse_access(required_warehouse_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select required_warehouse_id is not null
    and exists (
      select 1
      from public.profiles profile
      join public.warehouses warehouse
        on warehouse.id = required_warehouse_id
       and warehouse.organization_id = profile.organization_id
       and warehouse.is_active
      where profile.id = (select auth.uid())
        and profile.is_active
        and (
          private.is_global_warehouse_operator()
          or exists (
            select 1
            from public.user_warehouses assignment
            where assignment.user_id = profile.id
              and assignment.warehouse_id = warehouse.id
              and assignment.organization_id = profile.organization_id
              and assignment.is_active
          )
        )
    );
$$;

create or replace function private.has_all_permissions(required_permissions text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(bool_and(private.has_permission(permission_code)), false)
  from unnest(required_permissions) permission_code;
$$;

revoke all on function private.is_global_warehouse_operator() from public, anon;
revoke all on function private.has_warehouse_access(uuid) from public, anon;
revoke all on function private.has_all_permissions(text[]) from public, anon;
grant execute on function private.is_global_warehouse_operator() to authenticated;
grant execute on function private.has_warehouse_access(uuid) to authenticated;
grant execute on function private.has_all_permissions(text[]) to authenticated;

drop policy if exists user_warehouses_select_self on public.user_warehouses;
create policy user_warehouses_select_self on public.user_warehouses
for select to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (user_id = (select auth.uid()) or private.is_global_warehouse_operator())
);

drop policy if exists user_warehouses_manage_admin on public.user_warehouses;
create policy user_warehouses_manage_admin on public.user_warehouses
for all to authenticated
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

revoke all on table public.user_warehouses from anon;
grant select, insert, update, delete on table public.user_warehouses to authenticated;

create or replace function private.get_my_authorization()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', profile.id,
    'organization_id', profile.organization_id,
    'full_name', profile.full_name,
    'is_active', profile.is_active,
    'primary_role', profile.role,
    'roles', coalesce((
      select jsonb_agg(distinct role.code order by role.code)
      from public.user_roles user_role
      join public.roles role on role.id = user_role.role_id
      where user_role.user_id = profile.id
        and role.organization_id = profile.organization_id
    ), case when profile.role is null then '[]'::jsonb else jsonb_build_array(profile.role) end),
    'permissions', coalesce((
      select jsonb_agg(distinct permission.code order by permission.code)
      from public.roles role
      join public.role_permissions role_permission on role_permission.role_id = role.id
      join public.permissions permission on permission.id = role_permission.permission_id
      where role.organization_id = profile.organization_id
        and (role.code = profile.role or exists (
          select 1 from public.user_roles user_role
          where user_role.user_id = profile.id and user_role.role_id = role.id
        ))
    ), '[]'::jsonb),
    'all_warehouses', private.is_global_warehouse_operator(),
    'warehouse_ids', coalesce((
      select jsonb_agg(warehouse.id order by warehouse.created_at, warehouse.id)
      from public.warehouses warehouse
      where warehouse.organization_id = profile.organization_id
        and warehouse.is_active
        and (
          private.is_global_warehouse_operator()
          or exists (
            select 1 from public.user_warehouses assignment
            where assignment.user_id = profile.id
              and assignment.warehouse_id = warehouse.id
              and assignment.organization_id = profile.organization_id
              and assignment.is_active
          )
        )
    ), '[]'::jsonb)
  )
  from public.profiles profile
  where profile.id = (select auth.uid());
$$;

create or replace function public.get_my_authorization()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.get_my_authorization(); $$;

revoke all on function private.get_my_authorization() from public, anon;
grant execute on function private.get_my_authorization() to authenticated;
revoke all on function public.get_my_authorization() from public, anon;
grant execute on function public.get_my_authorization() to authenticated;

-- Replace legacy role/permission policies on the receiving and inventory chain.
drop policy if exists manage_insert_stock_receipts on public.stock_receipts;
drop policy if exists manage_update_stock_receipts on public.stock_receipts;
drop policy if exists staff_select_stock_receipts on public.stock_receipts;
create policy receiving_select_stock_receipts on public.stock_receipts
for select to authenticated
using (private.has_permission('inventory.view') and private.has_warehouse_access(warehouse_id));
create policy receiving_insert_stock_receipts on public.stock_receipts
for insert to authenticated
with check (
  private.has_permission('receiving.create')
  and private.has_warehouse_access(warehouse_id)
  and created_by = (select auth.uid())
);
create policy receiving_update_stock_receipts on public.stock_receipts
for update to authenticated
using (private.has_permission('receiving.confirm') and private.has_warehouse_access(warehouse_id))
with check (private.has_permission('receiving.confirm') and private.has_warehouse_access(warehouse_id));

drop policy if exists manage_insert_stock_receipt_items on public.stock_receipt_items;
drop policy if exists manage_update_stock_receipt_items on public.stock_receipt_items;
drop policy if exists staff_select_stock_receipt_items on public.stock_receipt_items;
create policy receiving_select_stock_receipt_items on public.stock_receipt_items
for select to authenticated
using (private.has_permission('inventory.view') and exists (
  select 1 from public.stock_receipts receipt
  where receipt.id = receipt_id and private.has_warehouse_access(receipt.warehouse_id)
));
create policy receiving_insert_stock_receipt_items on public.stock_receipt_items
for insert to authenticated
with check (private.has_permission('receiving.create') and exists (
  select 1 from public.stock_receipts receipt
  where receipt.id = receipt_id and private.has_warehouse_access(receipt.warehouse_id)
));
create policy receiving_update_stock_receipt_items on public.stock_receipt_items
for update to authenticated
using (private.has_permission('receiving.create') and exists (
  select 1 from public.stock_receipts receipt
  where receipt.id = receipt_id and private.has_warehouse_access(receipt.warehouse_id)
))
with check (private.has_permission('receiving.create') and exists (
  select 1 from public.stock_receipts receipt
  where receipt.id = receipt_id and private.has_warehouse_access(receipt.warehouse_id)
));

drop policy if exists inbound_orders_insert_draft on public.inbound_orders;
drop policy if exists inbound_orders_select on public.inbound_orders;
drop policy if exists inbound_orders_update_draft on public.inbound_orders;
create policy receiving_select_inbound_orders on public.inbound_orders
for select to authenticated
using (private.has_permission('inventory.view') and private.has_warehouse_access(warehouse_id));
create policy receiving_insert_inbound_orders on public.inbound_orders
for insert to authenticated
with check (
  private.has_permission('receiving.create')
  and private.has_warehouse_access(warehouse_id)
  and created_by = (select auth.uid())
);
create policy receiving_update_inbound_orders on public.inbound_orders
for update to authenticated
using (private.has_permission('receiving.confirm') and private.has_warehouse_access(warehouse_id))
with check (private.has_permission('receiving.confirm') and private.has_warehouse_access(warehouse_id));

drop policy if exists inbound_order_items_insert_draft on public.inbound_order_items;
drop policy if exists inbound_order_items_select on public.inbound_order_items;
drop policy if exists inbound_order_items_update_draft on public.inbound_order_items;
create policy receiving_select_inbound_order_items on public.inbound_order_items
for select to authenticated
using (private.has_permission('inventory.view') and exists (
  select 1 from public.inbound_orders receipt
  where receipt.id = inbound_order_id and private.has_warehouse_access(receipt.warehouse_id)
));
create policy receiving_insert_inbound_order_items on public.inbound_order_items
for insert to authenticated
with check (private.has_permission('receiving.create') and exists (
  select 1 from public.inbound_orders receipt
  where receipt.id = inbound_order_id and private.has_warehouse_access(receipt.warehouse_id)
));
create policy receiving_update_inbound_order_items on public.inbound_order_items
for update to authenticated
using (private.has_permission('receiving.create') and exists (
  select 1 from public.inbound_orders receipt
  where receipt.id = inbound_order_id and private.has_warehouse_access(receipt.warehouse_id)
))
with check (private.has_permission('receiving.create') and exists (
  select 1 from public.inbound_orders receipt
  where receipt.id = inbound_order_id and private.has_warehouse_access(receipt.warehouse_id)
));

drop policy if exists authenticated_staff_read_inventory on public.inventory;
drop policy if exists receiving_select_inventory on public.inventory;
drop policy if exists receiving_insert_inventory on public.inventory;
drop policy if exists receiving_update_inventory on public.inventory;
create policy receiving_select_inventory on public.inventory
for select to authenticated
using (private.has_permission('inventory.view') and private.has_warehouse_access(warehouse_id));
create policy receiving_insert_inventory on public.inventory
for insert to authenticated
with check (private.has_permission('inventory.create') and private.has_warehouse_access(warehouse_id));
create policy receiving_update_inventory on public.inventory
for update to authenticated
using (private.has_permission('inventory.adjust') and private.has_warehouse_access(warehouse_id))
with check (private.has_permission('inventory.adjust') and private.has_warehouse_access(warehouse_id));

drop policy if exists staff_select_inventory_movements on public.inventory_movements;
drop policy if exists receiving_select_inventory_movements on public.inventory_movements;
drop policy if exists receiving_insert_inventory_movements on public.inventory_movements;
create policy receiving_select_inventory_movements on public.inventory_movements
for select to authenticated
using (private.has_permission('inventory.view') and private.has_warehouse_access(warehouse_id));
create policy receiving_insert_inventory_movements on public.inventory_movements
for insert to authenticated
with check (
  private.has_permission('inventory.adjust')
  and private.has_permission('receiving.confirm')
  and private.has_warehouse_access(warehouse_id)
  and created_by = (select auth.uid())
);

-- Direct browser writes to balances and the immutable movement ledger remain
-- revoked. The SECURITY DEFINER receiving RPC below is the only atomic writer.
revoke insert, update, delete, truncate on table public.inventory_movements from anon, authenticated;
revoke insert, update, delete, truncate on table public.inventory from anon, authenticated;
grant select on table public.inventory, public.inventory_movements to authenticated;

create or replace view public.inventory_balances
with (security_invoker = true)
as
select id, organization_id, variant_id, warehouse_id as location_id,
       quantity_on_hand as on_hand, quantity_reserved as reserved, safety_stock,
       greatest(quantity_on_hand - quantity_reserved - safety_stock, 0) as available,
       low_stock_threshold, updated_at
from public.inventory;

revoke all on table public.inventory_balances from anon;
grant select on table public.inventory_balances to authenticated;

-- Patch the previously introduced atomic function in place so its business
-- implementation stays identical while authorization becomes canonical.
do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(procedure.oid)
  into function_definition
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'private'
    and procedure.proname = 'post_fast_inbound_receipt'
    and oidvectortypes(procedure.proargtypes) = 'jsonb, uuid, uuid, text, date, text, text';

  if function_definition is null then
    raise exception 'private.post_fast_inbound_receipt was not found';
  end if;

  function_definition := replace(
    function_definition,
    'not private.has_permission(''inbound.post'')',
    'not private.has_all_permissions(array[''inventory.view'',''inventory.create'',''inventory.adjust'',''receiving.create'',''receiving.confirm'',''sku.create'']::text[])'
  );
  function_definition := replace(
    function_definition,
    'and warehouse.is_active' || chr(10) || '    and (p_warehouse_id is null or warehouse.id = p_warehouse_id)',
    'and warehouse.is_active' || chr(10) || '    and private.has_warehouse_access(warehouse.id)' || chr(10) || '    and (p_warehouse_id is null or warehouse.id = p_warehouse_id)'
  );

  if function_definition like '%has_permission(''inbound.post'')%'
     or function_definition not like '%private.has_warehouse_access(warehouse.id)%' then
    raise exception 'fast inbound authorization patch did not match the installed function';
  end if;

  execute function_definition;
end $$;

revoke all on function private.post_fast_inbound_receipt(jsonb,uuid,uuid,text,date,text,text)
  from public, anon, authenticated;
revoke all on function public.rpc_post_inbound_receipt(jsonb,uuid,uuid,text,date,text,text)
  from public, anon;
grant execute on function public.rpc_post_inbound_receipt(jsonb,uuid,uuid,text,date,text,text)
  to authenticated;

notify pgrst, 'reload schema';

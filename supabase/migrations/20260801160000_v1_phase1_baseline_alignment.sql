-- NEXORA Fashion Commerce Platform V1.0 - phase 1 baseline alignment.
--
-- This migration deliberately preserves the legacy tables while establishing
-- the formal V1.0 tenant, RBAC, workflow and API contracts. New code should use
-- the canonical views/RPCs created here. Legacy names remain available only so
-- an existing installation can be upgraded without deleting business data.

-- ---------------------------------------------------------------------------
-- Tenant foundation
-- ---------------------------------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{2,32}$'),
  name text not null,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Europe/Rome',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.organizations (code, name)
values ('NEXORA', 'NEXORA Fashion Commerce')
on conflict (code) do update set name = excluded.name;

do $$
declare
  organization_id_value uuid;
  table_name_value text;
begin
  select id into organization_id_value
  from public.organizations where code = 'NEXORA';

  foreach table_name_value in array array[
    'profiles', 'roles', 'suppliers', 'brands', 'categories', 'colors', 'sizes',
    'warehouses', 'products', 'product_variants', 'product_images', 'inventory',
    'inventory_movements', 'stock_receipts', 'stock_receipt_items',
    'inbound_orders', 'inbound_order_items', 'audit_logs'
  ] loop
    execute format(
      'alter table public.%I add column if not exists organization_id uuid references public.organizations(id) on delete restrict',
      table_name_value
    );
    execute format(
      'update public.%I set organization_id = $1 where organization_id is null',
      table_name_value
    ) using organization_id_value;
    execute format(
      'alter table public.%I alter column organization_id set not null',
      table_name_value
    );
    execute format(
      'create index if not exists %I on public.%I (organization_id)',
      table_name_value || '_organization_id_idx', table_name_value
    );
  end loop;
end;
$$;

alter table public.organizations enable row level security;
revoke all on table public.organizations from anon, authenticated;
grant select on table public.organizations to authenticated;

create or replace function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organization_id
  from public.profiles p
  where p.id = (select auth.uid()) and p.is_active;
$$;

revoke all on function private.current_organization_id() from public, anon;
grant execute on function private.current_organization_id() to authenticated;

do $$
declare table_name_value text;
begin
  foreach table_name_value in array array[
    'suppliers','brands','categories','colors','sizes','warehouses','products',
    'product_variants','product_images','inventory','inventory_movements',
    'stock_receipts','stock_receipt_items','inbound_orders','inbound_order_items','audit_logs'
  ] loop
    execute format(
      'alter table public.%I alter column organization_id set default private.current_organization_id()',
      table_name_value
    );
  end loop;
end;
$$;

create policy organization_member_read on public.organizations
for select to authenticated
using (id = (select private.current_organization_id()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_id_value uuid;
begin
  select id into organization_id_value
  from public.organizations where code = 'NEXORA' limit 1;
  insert into public.profiles(id,organization_id,full_name,is_active)
  values(new.id,organization_id_value,new.raw_user_meta_data->>'full_name',true)
  on conflict(id) do update
    set full_name = coalesce(excluded.full_name,public.profiles.full_name),
        organization_id = coalesce(public.profiles.organization_id,excluded.organization_id);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Formal RBAC model
-- ---------------------------------------------------------------------------

alter table public.roles
  add column if not exists code text,
  add column if not exists display_name_zh text,
  add column if not exists is_system boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

update public.roles
set code = case name
  when 'OWNER' then 'owner'
  when 'WAREHOUSE_STAFF' then 'warehouse_staff'
  when 'PRODUCT_MANAGER' then 'product_operator'
  when 'ORDER_STAFF' then 'order_cs'
  else lower(name)
end
where code is null;

alter table public.roles alter column code set not null;
alter table public.roles drop constraint if exists roles_name_key;
create unique index if not exists roles_organization_code_key
  on public.roles (organization_id, code);

insert into public.roles (organization_id, code, name, display_name_zh, description)
select organization.id, role.code, role.name, role.display_name_zh, role.description
from public.organizations organization
cross join (values
  ('owner', 'OWNER', '所有者', '拥有平台最终管理权限'),
  ('system_admin', 'SYSTEM_ADMIN', '系统管理员', '管理账号、角色、权限和系统配置'),
  ('warehouse_manager', 'WAREHOUSE_MANAGER', '仓库主管', '审核入库、库存调整和仓库作业'),
  ('warehouse_staff', 'WAREHOUSE_STAFF', '仓库员工', '点货、保存草稿和提交入库单'),
  ('product_operator', 'PRODUCT_OPERATOR', '商品运营', '完善商品、图片、价格和上架资料'),
  ('order_cs', 'ORDER_CS', '订单与客服', '处理订单、售后和客户沟通'),
  ('buyer', 'BUYER', '采购', '管理供应商、采购单和到货计划'),
  ('finance', 'FINANCE', '财务', '查看收付款与经营财务数据'),
  ('cashier', 'CASHIER', '收银员', '执行门店销售与收款')
) as role(code, name, display_name_zh, description)
where organization.code = 'NEXORA'
on conflict (organization_id, code) do update
set name = excluded.name,
    display_name_zh = excluded.display_name_zh,
    description = excluded.description,
    updated_at = now();

alter table public.permissions
  add column if not exists module text,
  add column if not exists action text,
  add column if not exists updated_at timestamptz not null default now();

insert into public.permissions (code, module, action, description)
values
  ('workspace.admin.access', 'workspace', 'admin_access', '访问内部管理工作区'),
  ('workspace.warehouse.access', 'workspace', 'warehouse_access', '访问仓库与门店工作区'),
  ('users.manage', 'users', 'manage', '管理内部用户、角色与状态'),
  ('roles.manage', 'roles', 'manage', '管理角色权限'),
  ('suppliers.read', 'suppliers', 'read', '查看供应商'),
  ('suppliers.manage', 'suppliers', 'manage', '管理供应商'),
  ('products.read', 'products', 'read', '查看商品主档与SKU'),
  ('products.manage', 'products', 'manage', '编辑商品主档与SKU'),
  ('products.publish', 'products', 'publish', '审核并发布商品'),
  ('media.manage', 'media', 'manage', '管理商品媒体'),
  ('inventory.read', 'inventory', 'read', '查看库存余额与流水'),
  ('inventory.adjust', 'inventory', 'adjust', '通过受控事务调整库存'),
  ('inbound.create', 'inbound', 'create', '创建和编辑自己的入库草稿'),
  ('inbound.submit', 'inbound', 'submit', '提交入库单'),
  ('inbound.review', 'inbound', 'review', '审核入库单'),
  ('inbound.post', 'inbound', 'post', '确认过账并增加库存'),
  ('inbound.cancel', 'inbound', 'cancel', '取消或冲销入库单'),
  ('audit.read', 'audit', 'read', '查看审计日志')
on conflict (code) do update
set module = excluded.module,
    action = excluded.action,
    description = excluded.description,
    updated_at = now();

with role_permission(role_code, permission_code) as (values
  ('system_admin','workspace.admin.access'),('system_admin','workspace.warehouse.access'),
  ('system_admin','users.manage'),('system_admin','roles.manage'),
  ('system_admin','suppliers.read'),('system_admin','suppliers.manage'),
  ('system_admin','products.read'),('system_admin','products.manage'),('system_admin','products.publish'),
  ('system_admin','media.manage'),('system_admin','inventory.read'),('system_admin','inventory.adjust'),
  ('system_admin','inbound.create'),('system_admin','inbound.submit'),('system_admin','inbound.review'),
  ('system_admin','inbound.post'),('system_admin','inbound.cancel'),('system_admin','audit.read'),
  ('warehouse_manager','workspace.warehouse.access'),('warehouse_manager','suppliers.read'),
  ('warehouse_manager','products.read'),('warehouse_manager','inventory.read'),('warehouse_manager','inventory.adjust'),
  ('warehouse_manager','inbound.create'),('warehouse_manager','inbound.submit'),('warehouse_manager','inbound.review'),
  ('warehouse_manager','inbound.post'),('warehouse_manager','inbound.cancel'),
  ('warehouse_staff','workspace.warehouse.access'),('warehouse_staff','suppliers.read'),
  ('warehouse_staff','products.read'),('warehouse_staff','inventory.read'),
  ('warehouse_staff','inbound.create'),('warehouse_staff','inbound.submit'),
  ('product_operator','workspace.admin.access'),('product_operator','products.read'),
  ('product_operator','products.manage'),('product_operator','products.publish'),('product_operator','media.manage'),
  ('product_operator','inventory.read'),
  ('order_cs','workspace.admin.access'),('order_cs','products.read'),('order_cs','inventory.read'),
  ('buyer','workspace.admin.access'),('buyer','workspace.warehouse.access'),('buyer','suppliers.read'),
  ('buyer','suppliers.manage'),('buyer','products.read'),('buyer','inventory.read'),('buyer','inbound.review'),
  ('finance','workspace.admin.access'),('finance','inventory.read'),('finance','audit.read'),
  ('cashier','workspace.warehouse.access'),('cashier','products.read'),('cashier','inventory.read')
)
insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from role_permission mapping
join public.organizations organization on organization.code = 'NEXORA'
join public.roles role
  on role.organization_id = organization.id and role.code = mapping.role_code
join public.permissions permission on permission.code = mapping.permission_code
on conflict do nothing;

-- Owner inherits every permission without copying authorization into user metadata.
insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
cross join public.permissions permission
where role.code = 'owner'
on conflict do nothing;

alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles
set role = case role when 'admin' then 'system_admin' when 'employee' then 'warehouse_staff' else role end;
alter table public.profiles
  add constraint profiles_role_check check (
    role is null or role in (
      'owner','system_admin','warehouse_manager','warehouse_staff',
      'product_operator','order_cs','buyer','finance','cashier'
    )
  );

-- Keep old RPCs operational during the compatibility window while making the
-- formal role codes authoritative for all new assignments.
create or replace function private.has_app_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.is_active
        and (
          profile.role = any(required_roles)
          or ('admin' = any(required_roles) and profile.role in ('owner','system_admin'))
          or ('employee' = any(required_roles) and profile.role in ('owner','system_admin','warehouse_manager','warehouse_staff','buyer','cashier'))
        )
    );
$$;

revoke all on function private.has_app_role(text[]) from public, anon;
grant execute on function private.has_app_role(text[]) to authenticated;

create or replace function private.has_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1 from public.user_roles user_role
      join public.roles role on role.id = user_role.role_id
      where user_role.user_id = (select auth.uid())
        and (role.name = any(required_roles) or upper(role.code) = any(required_roles))
    )
    or exists (
      select 1 from public.profiles profile
      where profile.id = (select auth.uid()) and profile.is_active and (
        ('OWNER' = any(required_roles) and profile.role in ('owner','system_admin'))
        or ('WAREHOUSE_STAFF' = any(required_roles) and profile.role in ('owner','system_admin','warehouse_manager','warehouse_staff','buyer','cashier'))
        or ('PRODUCT_MANAGER' = any(required_roles) and profile.role in ('owner','system_admin','product_operator'))
        or ('ORDER_STAFF' = any(required_roles) and profile.role in ('owner','system_admin','order_cs'))
      )
    )
  );
$$;

revoke all on function private.has_role(text[]) from public, anon;
grant execute on function private.has_role(text[]) to authenticated;

create or replace function private.has_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.is_active
        and (
          exists (
            select 1
            from public.user_roles user_role
            join public.roles role on role.id = user_role.role_id
            join public.role_permissions role_permission on role_permission.role_id = role.id
            join public.permissions permission on permission.id = role_permission.permission_id
            where user_role.user_id = profile.id
              and role.organization_id = profile.organization_id
              and permission.code = required_permission
          )
          or exists (
            select 1
            from public.roles role
            join public.role_permissions role_permission on role_permission.role_id = role.id
            join public.permissions permission on permission.id = role_permission.permission_id
            where role.organization_id = profile.organization_id
              and role.code = profile.role
              and permission.code = required_permission
          )
        )
    );
$$;

revoke all on function private.has_permission(text) from public, anon;
grant execute on function private.has_permission(text) to authenticated;

create or replace function public.get_my_authorization()
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
    ), case when profile.role is null then '[]'::jsonb else jsonb_build_array(profile.role) end),
    'permissions', coalesce((
      select jsonb_agg(distinct permission.code order by permission.code)
      from public.roles role
      join public.role_permissions role_permission on role_permission.role_id = role.id
      join public.permissions permission on permission.id = role_permission.permission_id
      where role.organization_id = profile.organization_id
        and (
          role.code = profile.role
          or exists (
            select 1 from public.user_roles user_role
            where user_role.user_id = profile.id and user_role.role_id = role.id
          )
        )
    ), '[]'::jsonb)
  )
  from public.profiles profile
  where profile.id = (select auth.uid());
$$;

revoke all on function public.get_my_authorization() from public, anon;
grant execute on function public.get_my_authorization() to authenticated;

-- ---------------------------------------------------------------------------
-- Canonical phase-1 workflow contracts
-- ---------------------------------------------------------------------------

alter table public.inventory
  add column if not exists safety_stock integer not null default 0
    check (safety_stock >= 0);

alter table public.stock_receipts
  add column if not exists supplier_reference text,
  add column if not exists idempotency_key text,
  add column if not exists workflow_status text not null default 'draft',
  add column if not exists counting_started_at timestamptz,
  add column if not exists ready_to_post_at timestamptz,
  add column if not exists posted_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

update public.stock_receipts
set workflow_status = case status::text
  when 'DRAFT' then 'draft'
  when 'PARSING' then 'counting'
  when 'PENDING_REVIEW' then 'counting'
  when 'RECEIVING' then 'counting'
  when 'HAS_EXCEPTIONS' then 'counting'
  when 'READY_TO_CONFIRM' then 'ready_to_post'
  when 'COMPLETED' then 'posted'
  when 'CANCELLED' then 'cancelled'
  else workflow_status
end,
posted_at = case when status::text = 'COMPLETED' then coalesce(confirmed_at, created_at) else posted_at end;

alter table public.stock_receipts drop constraint if exists stock_receipts_workflow_status_check;
alter table public.stock_receipts add constraint stock_receipts_workflow_status_check
  check (workflow_status in ('draft','counting','ready_to_post','posted','cancelled'));
create unique index if not exists stock_receipts_creator_idempotency_key
  on public.stock_receipts (organization_id, created_by, idempotency_key)
  where idempotency_key is not null;

create or replace function private.sync_inbound_workflow_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.workflow_status := case new.status::text
      when 'DRAFT' then 'draft'
      when 'PARSING' then 'counting'
      when 'PENDING_REVIEW' then 'counting'
      when 'RECEIVING' then 'counting'
      when 'HAS_EXCEPTIONS' then 'counting'
      when 'READY_TO_CONFIRM' then 'ready_to_post'
      when 'COMPLETED' then 'posted'
      when 'CANCELLED' then 'cancelled'
      else new.workflow_status
    end;
    if new.workflow_status = 'counting' and new.counting_started_at is null then new.counting_started_at := now(); end if;
    if new.workflow_status = 'ready_to_post' and new.ready_to_post_at is null then new.ready_to_post_at := now(); end if;
    if new.workflow_status = 'posted' and new.posted_at is null then new.posted_at := coalesce(new.confirmed_at,now()); end if;
    if new.workflow_status = 'cancelled' and new.cancelled_at is null then new.cancelled_at := now(); end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.sync_inbound_workflow_status() from public,anon,authenticated;
drop trigger if exists stock_receipts_sync_workflow_status on public.stock_receipts;
create trigger stock_receipts_sync_workflow_status
before insert or update of status on public.stock_receipts
for each row execute function private.sync_inbound_workflow_status();

alter table public.inbound_orders drop constraint if exists inbound_orders_status_check;
alter table public.inbound_orders drop constraint if exists inbound_orders_check;
alter table public.inbound_orders
  add column if not exists arrival_date date not null default current_date,
  add column if not exists supplier_reference text;
update public.inbound_orders set status = 'posted' where status = 'confirmed';
alter table public.inbound_orders add constraint inbound_orders_status_check
  check (status in ('draft','counting','ready_to_post','posted','cancelled'));

alter table public.inbound_order_items
  add column if not exists size_id uuid references public.sizes(id) on delete restrict;
update public.inbound_order_items item
set size_id = variant.size_id
from public.product_variants variant
where item.size_id is null and variant.id = item.variant_id;
alter table public.inbound_order_items alter column size_id set not null;

create or replace function private.transition_inbound_receipt(
  p_receipt_id uuid,
  p_target_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  receipt public.stock_receipts%rowtype;
  allowed boolean := false;
begin
  if caller_id is null then raise exception '请先登录'; end if;
  if p_target_status not in ('counting','ready_to_post','cancelled') then
    raise exception '不支持的入库状态';
  end if;

  select * into receipt from public.stock_receipts
  where id = p_receipt_id
    and organization_id = private.current_organization_id()
  for update;
  if not found then raise exception '入库单不存在或无权访问'; end if;

  allowed := case
    when receipt.workflow_status = 'draft' and p_target_status = 'counting'
      then private.has_permission('inbound.submit')
    when receipt.workflow_status = 'counting' and p_target_status = 'ready_to_post'
      then private.has_permission('inbound.review')
    when receipt.workflow_status in ('draft','counting','ready_to_post') and p_target_status = 'cancelled'
      then private.has_permission('inbound.cancel')
    else false
  end;
  if not allowed then raise exception '当前状态不能执行该操作，或账号权限不足'; end if;
  if p_target_status = 'cancelled' and nullif(trim(coalesce(p_reason,'')), '') is null then
    raise exception '取消入库必须填写原因';
  end if;

  update public.stock_receipts
  set status = case p_target_status
        when 'counting' then 'RECEIVING'::public.receipt_status
        when 'ready_to_post' then 'READY_TO_CONFIRM'::public.receipt_status
        when 'cancelled' then 'CANCELLED'::public.receipt_status
        else status end,
      workflow_status = p_target_status,
      counting_started_at = case when p_target_status = 'counting' then now() else counting_started_at end,
      ready_to_post_at = case when p_target_status = 'ready_to_post' then now() else ready_to_post_at end,
      cancelled_at = case when p_target_status = 'cancelled' then now() else cancelled_at end,
      cancellation_reason = case when p_target_status = 'cancelled' then trim(p_reason) else cancellation_reason end,
      updated_at = now(), updated_by = caller_id
  where id = p_receipt_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,old_data,new_data)
  values(receipt.organization_id,caller_id,'TRANSITION_INBOUND_RECEIPT','inbound_receipt',receipt.id,
    jsonb_build_object('status',receipt.workflow_status),jsonb_build_object('status',p_target_status,'reason',p_reason));
  return jsonb_build_object('receipt_id',receipt.id,'status',p_target_status);
end;
$$;

create or replace function public.rpc_transition_inbound_receipt(
  p_receipt_id uuid,
  p_target_status text,
  p_reason text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.transition_inbound_receipt(p_receipt_id,p_target_status,p_reason); $$;

revoke all on function private.transition_inbound_receipt(uuid,text,text) from public, anon, authenticated;
revoke all on function public.rpc_transition_inbound_receipt(uuid,text,text) from public, anon;
grant execute on function public.rpc_transition_inbound_receipt(uuid,text,text) to authenticated;

-- Canonical read contracts. They do not duplicate business data and obey the
-- RLS policies of their source tables.
create or replace view public.locations
with (security_invoker = true)
as
select id, organization_id, code, name, 'warehouse'::text as type,
       address, is_active, created_at
from public.warehouses;

create or replace view public.inventory_balances
with (security_invoker = true)
as
select id, organization_id, variant_id, warehouse_id as location_id,
       quantity_on_hand as on_hand, quantity_reserved as reserved,
       safety_stock,
       greatest(quantity_on_hand - quantity_reserved - safety_stock, 0) as available,
       low_stock_threshold, updated_at
from public.inventory;

create or replace view public.product_media
with (security_invoker = true)
as
select id, organization_id, product_id, variant_id, storage_path,
       image_type as media_type, sort_order, is_primary,
       created_by, created_at
from public.product_images;

create or replace view public.inbound_receipts
with (security_invoker = true)
as
select receipt.id, receipt.organization_id, receipt.inbound_number as receipt_no,
       receipt.arrival_date, receipt.supplier_id, receipt.warehouse_id as location_id,
       receipt.supplier_reference, receipt.status,
       receipt.total_quantity as expected_quantity,
       receipt.total_quantity as received_quantity,
       receipt.notes, receipt.idempotency_key, receipt.created_by,
       receipt.confirmed_by as posted_by, receipt.created_at, receipt.updated_at,
       receipt.confirmed_at as posted_at, receipt.cancelled_at,
       receipt.cancellation_reason, 'quick'::text as source_mode,
       coalesce(profile.full_name, '仓库员工')::text as party,
       coalesce(warehouse.name, '默认仓库')::text as location_name
from public.inbound_orders receipt
left join public.profiles profile on profile.id = receipt.created_by
left join public.warehouses warehouse on warehouse.id = receipt.warehouse_id
union all
select receipt.id, receipt.organization_id, receipt.receipt_no,
       receipt.receipt_date as arrival_date, receipt.supplier_id,
       receipt.warehouse_id as location_id, receipt.supplier_reference,
       receipt.workflow_status as status, receipt.expected_quantity,
       receipt.received_quantity, receipt.notes, receipt.idempotency_key,
       receipt.created_by, receipt.confirmed_by as posted_by,
       receipt.created_at, receipt.updated_at, receipt.posted_at,
       receipt.cancelled_at, receipt.cancellation_reason,
       'controlled'::text as source_mode,
       coalesce(supplier.name, profile.full_name, '未指定供应商')::text as party,
       coalesce(warehouse.name, '默认仓库')::text as location_name
from public.stock_receipts receipt
left join public.suppliers supplier on supplier.id = receipt.supplier_id
left join public.profiles profile on profile.id = receipt.created_by
left join public.warehouses warehouse on warehouse.id = receipt.warehouse_id;

create or replace view public.inbound_receipt_lines
with (security_invoker = true)
as
select item.id, item.organization_id, item.inbound_order_id as receipt_id,
       item.product_id, item.variant_id,
       product.style_no as model_code,
       coalesce(color.name_zh, color.name) as color_name,
       coalesce(size.name, 'ONE_SIZE') as size_name,
       item.quantity, 'RESTOCK_OR_CREATE'::text as match_type,
       'POSTED'::text as status, null::text as notes, item.created_at
from public.inbound_order_items item
join public.products product on product.id = item.product_id
join public.colors color on color.id = item.color_id
left join public.sizes size on size.id = item.size_id
union all
select item.id, item.organization_id, item.receipt_id,
       item.product_id, item.variant_id,
       item.normalized_style_no as model_code,
       item.normalized_color as color_name,
       item.normalized_size as size_name,
       coalesce(item.received_quantity,item.expected_quantity,0) as quantity,
       item.match_type::text as match_type, item.status, item.notes, item.created_at
from public.stock_receipt_items item;

revoke all on public.locations, public.inventory_balances, public.product_media,
  public.inbound_receipts, public.inbound_receipt_lines from anon, authenticated;
grant select on public.locations, public.inventory_balances, public.product_media,
  public.inbound_receipts, public.inbound_receipt_lines to authenticated;

-- Posting is a manager operation. Warehouse staff may create, count and
-- submit a receipt but cannot bypass approval through the legacy RPC.
create or replace function public.confirm_stock_receipt(p_receipt_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.has_permission('inbound.post') then
    raise exception '当前账号没有确认入库权限，请由仓库经理审核后过账';
  end if;
  return private.confirm_stock_receipt(p_receipt_id);
end;
$$;

revoke all on function public.confirm_stock_receipt(uuid) from public, anon;
grant execute on function public.confirm_stock_receipt(uuid) to authenticated;

-- Organization isolation is restrictive so it remains effective even while
-- legacy permissive role policies are kept during the compatibility window.
do $$
declare table_name_value text;
begin
  foreach table_name_value in array array[
    'profiles','roles','suppliers','brands','categories','colors','sizes','warehouses',
    'products','product_variants','product_images','inventory','inventory_movements',
    'stock_receipts','stock_receipt_items','inbound_orders','inbound_order_items','audit_logs'
  ] loop
    execute format('drop policy if exists organization_isolation_%1$s on public.%1$I',table_name_value);
    execute format(
      'create policy organization_isolation_%1$s on public.%1$I as restrictive for all to authenticated using (organization_id = (select private.current_organization_id())) with check (organization_id = (select private.current_organization_id()))',
      table_name_value
    );
  end loop;
end;
$$;

-- Immutable facts: application roles can only read; controlled functions own
-- every stock mutation and audit write.
revoke insert, update, delete, truncate on table public.inventory from anon, authenticated;
revoke insert, update, delete, truncate on table public.inventory_movements from anon, authenticated;
revoke insert, update, delete, truncate on table public.audit_logs from anon, authenticated;
grant select on table public.inventory, public.inventory_movements to authenticated;

-- Supabase Data API defaults changed in 2026; exposure is therefore explicit.
grant select on table public.profiles, public.roles, public.permissions,
  public.user_roles, public.role_permissions, public.suppliers, public.brands,
  public.categories, public.colors, public.sizes, public.warehouses,
  public.products, public.product_variants, public.product_images,
  public.stock_receipts, public.stock_receipt_items,
  public.inbound_orders, public.inbound_order_items to authenticated;
grant insert, update on table public.stock_receipts, public.stock_receipt_items to authenticated;

-- Product media is private in phase 1. Authenticated users receive short-lived
-- signed URLs and write only below <organization-id>/products/<product-id>/.
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'product-images';

drop policy if exists product_images_public_read on storage.objects;
drop policy if exists product_images_staff_insert on storage.objects;
drop policy if exists product_images_staff_update on storage.objects;
drop policy if exists product_images_staff_delete on storage.objects;
drop policy if exists product_media_member_read on storage.objects;
drop policy if exists product_media_operator_insert on storage.objects;
drop policy if exists product_media_operator_update on storage.objects;
drop policy if exists product_media_operator_delete on storage.objects;

create policy product_media_member_read on storage.objects
for select to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = private.current_organization_id()::text
  and private.has_permission('products.read')
);
create policy product_media_operator_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = private.current_organization_id()::text
  and (storage.foldername(name))[2] = 'products'
  and private.has_permission('media.manage')
);
create policy product_media_operator_update on storage.objects
for update to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = private.current_organization_id()::text
  and private.has_permission('media.manage')
)
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = private.current_organization_id()::text
  and private.has_permission('media.manage')
);
create policy product_media_operator_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = private.current_organization_id()::text
  and private.has_permission('media.manage')
);

notify pgrst, 'reload schema';

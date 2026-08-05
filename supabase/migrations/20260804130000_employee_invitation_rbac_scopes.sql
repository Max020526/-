-- NEXORA employee invitation registration + RBAC/data-scope foundation.
-- Browser clients never receive service_role credentials and cannot read invite rows directly.

alter table public.permissions add column if not exists name text;
update public.permissions set name = coalesce(name, description, code) where name is null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (
  role is null or role in (
    'owner','system_admin','warehouse_manager','warehouse_staff','merchandiser',
    'product_operator','order_cs','buyer','finance','auditor','cashier'
  )
);

create table if not exists public.employees (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  employee_name text not null,
  status text not null default 'active' check (status in ('active','disabled')),
  warehouse_scope text not null default 'none' check (warehouse_scope in ('all','selected','none')),
  category_scope text not null default 'all' check (category_scope in ('all','selected','none')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table if not exists public.user_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  effect text not null check (effect in ('allow','deny')),
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, permission_id)
);

create table if not exists public.user_category_scopes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

create table if not exists public.employee_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  token text not null unique check (length(token) between 43 and 172),
  token_hash text not null unique check (length(token_hash) = 64),
  email text not null check (email = lower(trim(email)) and length(email) between 5 and 254),
  employee_name text not null check (length(trim(employee_name)) between 1 and 100),
  role_id uuid not null references public.roles(id) on delete restrict,
  warehouse_id uuid references public.warehouses(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  invited_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index if not exists employees_org_idx on public.employees(organization_id);
create index if not exists user_permissions_permission_idx on public.user_permissions(permission_id);
create index if not exists user_category_scopes_org_category_idx on public.user_category_scopes(organization_id, category_id);
create index if not exists employee_invitations_org_email_idx on public.employee_invitations(organization_id, email, created_at desc);
create index if not exists employee_invitations_pending_idx on public.employee_invitations(expires_at) where status = 'pending';

alter table public.employees enable row level security;
alter table public.user_permissions enable row level security;
alter table public.user_category_scopes enable row level security;
alter table public.employee_invitations enable row level security;

revoke all on public.employee_invitations from anon, authenticated;
revoke all on public.employees from anon;
revoke all on public.user_permissions from anon;
revoke all on public.user_category_scopes from anon;
grant all on public.employee_invitations to service_role;
grant all on public.employees to service_role;
grant all on public.user_permissions to service_role;
grant all on public.user_category_scopes to service_role;

drop policy if exists employee_invitations_deny_direct_access on public.employee_invitations;
create policy employee_invitations_deny_direct_access on public.employee_invitations for all to authenticated using (false) with check (false);

-- Canonical permission catalogue.
insert into public.permissions(id, code, module, action, name, description)
select extensions.gen_random_uuid(), item.code, split_part(item.code,'.',1), substring(item.code from position('.' in item.code)+1), item.name, item.name
from (values
  ('receiving.view','查看到货'),('receiving.create','新建到货'),('receiving.edit','编辑到货'),('receiving.confirm','确认入库'),('receiving.delete','删除到货'),
  ('inventory.view','查看库存'),('inventory.create','快速入库'),('inventory.adjust','调整库存'),('inventory.approve','审核库存'),('inventory.delete','删除库存'),('inventory.export','导出库存'),
  ('product.view','查看商品'),('product.create','创建商品'),('product.edit','编辑商品'),('product.delete','删除商品'),('product.price.edit','修改价格'),('product.publish','上架商品'),('product.unpublish','下架商品'),
  ('sku.view','查看 SKU'),('sku.create','创建 SKU'),('sku.edit','编辑 SKU'),('sku.delete','删除 SKU'),
  ('order.view','查看订单'),('order.process','处理订单'),('order.refund','订单退款'),
  ('finance.view','查看财务'),('finance.edit','编辑财务'),('finance.export','导出财务'),
  ('employee.view','查看员工'),('employee.create','邀请员工'),('employee.edit','编辑员工权限'),('employee.disable','停用员工'),
  ('system.settings.view','查看系统设置'),('system.settings.edit','编辑系统设置'),('audit.view','查看操作日志')
) as item(code,name)
where not exists (select 1 from public.permissions p where p.code=item.code);

insert into public.roles(id, organization_id, code, name, display_name_zh, description, is_system)
select extensions.gen_random_uuid(), o.id, 'merchandiser', 'Merchandiser', '商品运营', '按商品分类范围管理商品与 SKU', true
from public.organizations o
where not exists (select 1 from public.roles r where r.organization_id=o.id and r.code='merchandiser');

-- Role templates. Owner/Super Admin are also bypassed by private.has_permission.
insert into public.role_permissions(role_id, permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.code in ('owner','system_admin')
on conflict do nothing;

insert into public.role_permissions(role_id, permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.code = any(array[
  'receiving.view','receiving.create','receiving.edit','receiving.confirm',
  'inventory.view','inventory.create','inventory.adjust','inventory.export',
  'product.view','sku.view','sku.create','sku.edit'
]) where r.code='warehouse_manager' on conflict do nothing;

insert into public.role_permissions(role_id, permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.code = any(array[
  'receiving.view','receiving.create','inventory.view','inventory.create','product.view','sku.view','sku.create'
]) where r.code='warehouse_staff' on conflict do nothing;

insert into public.role_permissions(role_id, permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.code = any(array[
  'product.view','product.create','product.edit','product.price.edit','product.publish','product.unpublish','sku.view','sku.edit'
]) where r.code in ('merchandiser','product_operator') on conflict do nothing;

-- Compatibility: old pages now resolve to the same canonical capabilities.
insert into public.role_permissions(role_id, permission_id)
select rp.role_id, canonical.id
from public.role_permissions rp
join public.permissions legacy on legacy.id=rp.permission_id
join public.permissions canonical on canonical.code = case legacy.code
  when 'products.read' then 'product.view'
  when 'products.manage' then 'product.edit'
  when 'products.publish' then 'product.publish'
  when 'orders.read' then 'order.view'
  when 'orders.manage' then 'order.process'
  when 'refunds.manage' then 'order.refund'
  when 'finance.read' then 'finance.view'
  when 'finance.manage' then 'finance.edit'
  when 'audit.read' then 'audit.view'
  when 'users.manage' then 'employee.edit'
  else null end
where canonical.id is not null on conflict do nothing;

-- Existing accounts receive explicit data-scope records without changing login emails.
insert into public.employees(user_id,organization_id,email,employee_name,status,warehouse_scope,category_scope)
select p.id,p.organization_id,lower(u.email),coalesce(p.full_name,u.email),case when p.is_active then 'active' else 'disabled' end,
  case when p.role in ('owner','system_admin') then 'all'
       when exists(select 1 from public.user_warehouses uw where uw.user_id=p.id and uw.is_active) then 'selected' else 'none' end,
  case when p.role in ('owner','system_admin','warehouse_manager','warehouse_staff') then 'all' else 'none' end
from public.profiles p join auth.users u on u.id=p.id
where p.organization_id is not null
on conflict (user_id) do update set
  email=excluded.email, employee_name=excluded.employee_name, status=excluded.status,
  warehouse_scope=case when excluded.warehouse_scope='all' then 'all' else public.employees.warehouse_scope end,
  category_scope=case when excluded.category_scope='all' then 'all' else public.employees.category_scope end,
  updated_at=now();

create or replace function private.is_global_operator()
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.is_active and p.role in ('owner','system_admin')
  ) or exists (
    select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id
    join public.profiles p on p.id=ur.user_id and p.organization_id=r.organization_id
    where ur.user_id=(select auth.uid()) and p.is_active and r.code in ('owner','system_admin')
  );
$$;

create or replace function private.has_permission(required_permission text)
returns boolean language sql stable security definer set search_path=''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active and (
      private.is_global_operator()
      or (
        not exists (
          select 1 from public.user_permissions up join public.permissions permission on permission.id=up.permission_id
          where up.user_id=p.id and permission.code=required_permission and up.effect='deny'
        ) and (
          exists (
            select 1 from public.user_permissions up join public.permissions permission on permission.id=up.permission_id
            where up.user_id=p.id and permission.code=required_permission and up.effect='allow'
          ) or exists (
            select 1 from public.roles r join public.role_permissions rp on rp.role_id=r.id
            join public.permissions permission on permission.id=rp.permission_id
            where r.organization_id=p.organization_id and permission.code=required_permission
              and (r.code=p.role or exists(select 1 from public.user_roles ur where ur.user_id=p.id and ur.role_id=r.id))
          )
        )
      )
    )
  );
$$;

create or replace function private.has_warehouse_access(required_warehouse_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select required_warehouse_id is not null and exists (
    select 1 from public.profiles p join public.warehouses w on w.id=required_warehouse_id and w.organization_id=p.organization_id and w.is_active
    left join public.employees e on e.user_id=p.id
    where p.id=(select auth.uid()) and p.is_active and (
      private.is_global_operator() or e.warehouse_scope='all' or (
        e.warehouse_scope='selected' and exists (
          select 1 from public.user_warehouses uw where uw.user_id=p.id and uw.warehouse_id=w.id
            and uw.organization_id=p.organization_id and uw.is_active
        )
      )
    )
  );
$$;

create or replace function private.has_category_access(required_category_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select required_category_id is not null and exists (
    select 1 from public.profiles p join public.categories c on c.id=required_category_id and c.organization_id=p.organization_id
    left join public.employees e on e.user_id=p.id
    where p.id=(select auth.uid()) and p.is_active and (
      private.is_global_operator() or e.category_scope='all' or (
        e.category_scope='selected' and exists (
          select 1 from public.user_category_scopes ucs where ucs.user_id=p.id and ucs.category_id=c.id and ucs.organization_id=p.organization_id
        )
      )
    )
  );
$$;

create or replace function private.get_my_authorization()
returns jsonb language sql stable security definer set search_path=''
as $$
with me as (
  select p.*,e.warehouse_scope,e.category_scope from public.profiles p left join public.employees e on e.user_id=p.id
  where p.id=(select auth.uid())
), role_codes as (
  select distinct r.code from me join public.roles r on r.organization_id=me.organization_id
  where r.code=me.role or exists(select 1 from public.user_roles ur where ur.user_id=me.id and ur.role_id=r.id)
), effective_permissions as (
  select permission.code from public.permissions permission, me
  where me.is_active and (
    private.is_global_operator() or (
      not exists(select 1 from public.user_permissions up where up.user_id=me.id and up.permission_id=permission.id and up.effect='deny')
      and (exists(select 1 from public.user_permissions up where up.user_id=me.id and up.permission_id=permission.id and up.effect='allow')
        or exists(select 1 from role_codes rc join public.roles r on r.code=rc.code and r.organization_id=me.organization_id
          join public.role_permissions rp on rp.role_id=r.id where rp.permission_id=permission.id))
    )
  )
)
select jsonb_build_object(
  'user_id',me.id,'organization_id',me.organization_id,'full_name',me.full_name,'is_active',me.is_active,
  'primary_role',me.role,'roles',coalesce((select jsonb_agg(code order by code) from role_codes),'[]'::jsonb),
  'permissions',coalesce((select jsonb_agg(code order by code) from effective_permissions),'[]'::jsonb),
  'all_warehouses',private.is_global_operator() or me.warehouse_scope='all',
  'warehouse_scope',coalesce(me.warehouse_scope,'none'),
  'warehouse_ids',coalesce((select jsonb_agg(w.id order by w.created_at,w.id) from public.warehouses w
    where w.organization_id=me.organization_id and w.is_active and private.has_warehouse_access(w.id)),'[]'::jsonb),
  'all_categories',private.is_global_operator() or me.category_scope='all',
  'category_scope',coalesce(me.category_scope,'none'),
  'category_ids',coalesce((select jsonb_agg(c.id order by c.created_at,c.id) from public.categories c
    where c.organization_id=me.organization_id and private.has_category_access(c.id)),'[]'::jsonb)
) from me;
$$;

create or replace function public.get_my_authorization()
returns jsonb language sql stable set search_path='' as $$ select private.get_my_authorization(); $$;
grant execute on function public.get_my_authorization() to authenticated;

-- Atomic database half of registration. Auth creation is compensated by the server if this transaction fails.
create or replace function public.rpc_complete_employee_registration(
  p_token_hash text, p_auth_user_id uuid, p_email text, p_employee_name text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  invitation public.employee_invitations%rowtype;
  role_code_value text;
  warehouse_scope_value text;
  category_scope_value text;
begin
  select * into invitation from public.employee_invitations i where i.token_hash=p_token_hash for update;
  if invitation.id is null then raise exception using message='INVITATION_NOT_FOUND'; end if;
  if invitation.status='revoked' then raise exception using message='INVITATION_REVOKED'; end if;
  if invitation.status='accepted' or invitation.used_at is not null then raise exception using message='INVITATION_USED'; end if;
  if invitation.status='expired' or invitation.expires_at<=now() then
    update public.employee_invitations set status='expired',updated_at=now() where id=invitation.id;
    raise exception using message='INVITATION_EXPIRED';
  end if;
  if invitation.status<>'pending' then raise exception using message='INVITATION_INVALID'; end if;
  if lower(trim(p_email))<>invitation.email then raise exception using message='EMAIL_MISMATCH'; end if;
  if not exists(select 1 from auth.users u where u.id=p_auth_user_id and lower(u.email)=invitation.email) then
    raise exception using message='AUTH_USER_INVALID';
  end if;
  select r.code into role_code_value from public.roles r where r.id=invitation.role_id and r.organization_id=invitation.organization_id;
  if role_code_value is null then raise exception using message='ROLE_INVALID'; end if;
  if invitation.warehouse_id is not null and not exists(
    select 1 from public.warehouses w where w.id=invitation.warehouse_id and w.organization_id=invitation.organization_id and w.is_active
  ) then raise exception using message='WAREHOUSE_INVALID'; end if;

  warehouse_scope_value := case when role_code_value in ('owner','system_admin') then 'all' when invitation.warehouse_id is null then 'none' else 'selected' end;
  category_scope_value := case when role_code_value in ('owner','system_admin','warehouse_manager','warehouse_staff') then 'all' else 'none' end;

  insert into public.profiles(id,organization_id,full_name,role,is_active)
  values(p_auth_user_id,invitation.organization_id,trim(p_employee_name),role_code_value,true)
  on conflict(id) do update set organization_id=excluded.organization_id,full_name=excluded.full_name,role=excluded.role,is_active=true,updated_at=now();

  insert into public.employees(user_id,organization_id,email,employee_name,status,warehouse_scope,category_scope,invited_by)
  values(p_auth_user_id,invitation.organization_id,invitation.email,trim(p_employee_name),'active',warehouse_scope_value,category_scope_value,invitation.invited_by)
  on conflict(user_id) do update set employee_name=excluded.employee_name,status='active',warehouse_scope=excluded.warehouse_scope,
    category_scope=excluded.category_scope,updated_at=now();

  delete from public.user_roles where user_id=p_auth_user_id;
  insert into public.user_roles(user_id,role_id,assigned_by) values(p_auth_user_id,invitation.role_id,invitation.invited_by);
  delete from public.user_warehouses where user_id=p_auth_user_id;
  if invitation.warehouse_id is not null and warehouse_scope_value='selected' then
    insert into public.user_warehouses(user_id,warehouse_id,organization_id,is_active,assigned_by)
    values(p_auth_user_id,invitation.warehouse_id,invitation.organization_id,true,invitation.invited_by);
  end if;

  update public.employee_invitations set status='accepted',used_at=now(),used_by=p_auth_user_id,updated_at=now() where id=invitation.id;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data,organization_id)
  values(p_auth_user_id,'employee_registration_completed','employee',p_auth_user_id,
    jsonb_build_object('invitation_id',invitation.id,'role',role_code_value,'warehouse_id',invitation.warehouse_id),invitation.organization_id);
  return jsonb_build_object('ok',true,'invitation_id',invitation.id,'role',role_code_value,'warehouse_id',invitation.warehouse_id);
end;
$$;
revoke all on function public.rpc_complete_employee_registration(text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.rpc_complete_employee_registration(text,uuid,text,text) to service_role;
do $$
begin
  if to_regprocedure('public.rpc_validate_staff_invitation(text,text)') is not null then
    execute 'revoke execute on function public.rpc_validate_staff_invitation(text,text) from anon, authenticated';
  end if;
end;
$$;

-- Self/admin metadata visibility. Invite rows remain service-only.
drop policy if exists employees_self_or_admin on public.employees;
create policy employees_self_or_admin on public.employees for select to authenticated using (
  user_id=(select auth.uid()) or private.has_permission('employee.view')
);
drop policy if exists user_permissions_self_or_admin on public.user_permissions;
create policy user_permissions_self_or_admin on public.user_permissions for select to authenticated using (
  user_id=(select auth.uid()) or private.has_permission('employee.view')
);
drop policy if exists user_category_scopes_self_or_admin on public.user_category_scopes;
create policy user_category_scopes_self_or_admin on public.user_category_scopes for select to authenticated using (
  user_id=(select auth.uid()) or private.has_permission('employee.view')
);

-- Fix ambiguous organization comparisons in the previous user_warehouses policy migration.
drop policy if exists user_warehouses_insert_admin on public.user_warehouses;
drop policy if exists user_warehouses_update_admin on public.user_warehouses;
create policy user_warehouses_insert_admin on public.user_warehouses for insert to authenticated with check (
  user_warehouses.organization_id=(select private.current_organization_id())
  and private.has_permission('employee.edit')
  and exists(select 1 from public.profiles p where p.id=user_warehouses.user_id and p.organization_id=user_warehouses.organization_id)
  and exists(select 1 from public.warehouses w where w.id=user_warehouses.warehouse_id and w.organization_id=user_warehouses.organization_id)
);
create policy user_warehouses_update_admin on public.user_warehouses for update to authenticated using (
  user_warehouses.organization_id=(select private.current_organization_id()) and private.has_permission('employee.edit')
) with check (
  user_warehouses.organization_id=(select private.current_organization_id())
  and private.has_permission('employee.edit')
  and exists(select 1 from public.profiles p where p.id=user_warehouses.user_id and p.organization_id=user_warehouses.organization_id)
  and exists(select 1 from public.warehouses w where w.id=user_warehouses.warehouse_id and w.organization_id=user_warehouses.organization_id)
);

-- Remove broad OR-bypass policies and enforce canonical scopes on core tables.
drop policy if exists organization_isolation_inbound_orders on public.inbound_orders;
drop policy if exists organization_isolation_inbound_order_items on public.inbound_order_items;
drop policy if exists organization_isolation_stock_receipts on public.stock_receipts;
drop policy if exists organization_isolation_stock_receipt_items on public.stock_receipt_items;
drop policy if exists organization_isolation_inventory on public.inventory;
drop policy if exists organization_isolation_inventory_movements on public.inventory_movements;
drop policy if exists organization_isolation_products on public.products;
drop policy if exists organization_isolation_product_variants on public.product_variants;
drop policy if exists organization_isolation_warehouses on public.warehouses;
drop policy if exists organization_isolation_categories on public.categories;

drop policy if exists manage_insert_products on public.products;
drop policy if exists manage_update_products on public.products;
drop policy if exists manage_delete_products on public.products;
drop policy if exists manage_insert_product_variants on public.product_variants;
drop policy if exists manage_update_product_variants on public.product_variants;
drop policy if exists manage_delete_product_variants on public.product_variants;
drop policy if exists manage_insert_categories on public.categories;
drop policy if exists manage_update_categories on public.categories;
drop policy if exists manage_delete_categories on public.categories;
drop policy if exists manage_insert_warehouses on public.warehouses;
drop policy if exists manage_update_warehouses on public.warehouses;
drop policy if exists manage_delete_warehouses on public.warehouses;
drop policy if exists manage_delete_stock_receipts on public.stock_receipts;
drop policy if exists manage_delete_stock_receipt_items on public.stock_receipt_items;

drop policy if exists authenticated_staff_read_products on public.products;
drop policy if exists rbac_products_select on public.products;
create policy rbac_products_select on public.products for select to authenticated using (
  organization_id=(select private.current_organization_id()) and private.has_permission('product.view') and private.has_category_access(category_id)
);
drop policy if exists rbac_products_insert on public.products;
create policy rbac_products_insert on public.products for insert to authenticated with check (
  organization_id=(select private.current_organization_id()) and private.has_permission('product.create') and private.has_category_access(category_id)
);
drop policy if exists rbac_products_update on public.products;
create policy rbac_products_update on public.products for update to authenticated using (
  organization_id=(select private.current_organization_id()) and private.has_permission('product.edit') and private.has_category_access(category_id)
) with check (
  organization_id=(select private.current_organization_id()) and private.has_permission('product.edit') and private.has_category_access(category_id)
);
drop policy if exists rbac_products_delete on public.products;
create policy rbac_products_delete on public.products for delete to authenticated using (
  organization_id=(select private.current_organization_id()) and private.has_permission('product.delete') and private.has_category_access(category_id)
);

drop policy if exists authenticated_staff_read_variants on public.product_variants;
drop policy if exists rbac_variants_select on public.product_variants;
create policy rbac_variants_select on public.product_variants for select to authenticated using (
  organization_id=(select private.current_organization_id()) and private.has_permission('sku.view') and exists(
    select 1 from public.products p where p.id=product_variants.product_id and private.has_category_access(p.category_id)
  )
);
drop policy if exists rbac_variants_insert on public.product_variants;
create policy rbac_variants_insert on public.product_variants for insert to authenticated with check (
  organization_id=(select private.current_organization_id()) and private.has_permission('sku.create') and exists(
    select 1 from public.products p where p.id=product_variants.product_id and private.has_category_access(p.category_id)
  )
);

drop policy if exists authenticated_read_categories on public.categories;
drop policy if exists rbac_categories_select on public.categories;
create policy rbac_categories_select on public.categories for select to authenticated using (
  organization_id=(select private.current_organization_id()) and private.has_category_access(id)
  and (private.has_permission('product.view') or private.has_permission('inventory.view') or private.has_permission('receiving.view'))
);

drop policy if exists staff_select_warehouses on public.warehouses;
drop policy if exists rbac_warehouses_select on public.warehouses;
create policy rbac_warehouses_select on public.warehouses for select to authenticated using (
  organization_id=(select private.current_organization_id()) and private.has_warehouse_access(id)
);

alter view public.inventory_balances set (security_invoker = true);
drop policy if exists receiving_select_inventory on public.inventory;
create policy receiving_select_inventory on public.inventory for select to authenticated using (
  organization_id=(select private.current_organization_id()) and private.has_permission('inventory.view') and private.has_warehouse_access(warehouse_id)
  and exists(select 1 from public.product_variants v join public.products p on p.id=v.product_id
    where v.id=inventory.variant_id and private.has_category_access(p.category_id))
);
drop policy if exists receiving_insert_inventory on public.inventory;
create policy receiving_insert_inventory on public.inventory for insert to authenticated with check (
  organization_id=(select private.current_organization_id()) and private.has_permission('inventory.create') and private.has_warehouse_access(warehouse_id)
  and exists(select 1 from public.product_variants v join public.products p on p.id=v.product_id
    where v.id=inventory.variant_id and private.has_category_access(p.category_id))
);
drop policy if exists receiving_update_inventory on public.inventory;
create policy receiving_update_inventory on public.inventory for update to authenticated using (
  organization_id=(select private.current_organization_id()) and private.has_permission('inventory.adjust') and private.has_warehouse_access(warehouse_id)
) with check (
  organization_id=(select private.current_organization_id()) and private.has_permission('inventory.adjust') and private.has_warehouse_access(warehouse_id)
  and exists(select 1 from public.product_variants v join public.products p on p.id=v.product_id
    where v.id=inventory.variant_id and private.has_category_access(p.category_id))
);

-- Category scope is also enforced for movement visibility and writes.
drop policy if exists receiving_select_inventory_movements on public.inventory_movements;
create policy receiving_select_inventory_movements on public.inventory_movements for select to authenticated using (
  organization_id=(select private.current_organization_id()) and private.has_permission('inventory.view') and private.has_warehouse_access(warehouse_id)
  and exists(select 1 from public.product_variants v join public.products p on p.id=v.product_id
    where v.id=inventory_movements.variant_id and private.has_category_access(p.category_id))
);
drop policy if exists receiving_insert_inventory_movements on public.inventory_movements;
create policy receiving_insert_inventory_movements on public.inventory_movements for insert to authenticated with check (
  organization_id=(select private.current_organization_id()) and private.has_permission('inventory.adjust') and private.has_permission('receiving.confirm')
  and private.has_warehouse_access(warehouse_id) and created_by=(select auth.uid())
  and exists(select 1 from public.product_variants v join public.products p on p.id=v.product_id
    where v.id=inventory_movements.variant_id and private.has_category_access(p.category_id))
);

-- All staff permission changes are server-side and recorded in audit_logs by the API.

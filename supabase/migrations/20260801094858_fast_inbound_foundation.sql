-- Phase 2: compatibility foundation for the fast inbound workflow.
-- Existing catalogue, warehouse, order, and storefront tables remain intact.

-- ---------------------------------------------------------------------------
-- Internal roles
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists role text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role is null or role in ('employee', 'admin'));
  end if;
end;
$$;

-- Shared Supabase Auth also contains storefront customers. Only users that
-- already hold an internal legacy role are promoted into the two-role model.
update public.profiles p
set role = case
  when exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = p.id and r.name = 'OWNER'
  ) then 'admin'
  when exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = p.id
      and r.name in ('WAREHOUSE_STAFF', 'PRODUCT_MANAGER', 'ORDER_STAFF')
  ) then 'employee'
  else null
end
where p.role is null;

create index if not exists profiles_internal_role_idx
  on public.profiles (role, is_active)
  where role is not null;

create or replace function private.has_app_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.is_active
        and p.role = any(required_roles)
    );
$$;

revoke all on function private.has_app_role(text[]) from public, anon;
grant execute on function private.has_app_role(text[]) to authenticated;

-- Preserve all legacy policies while allowing the new two-role model to use
-- the existing warehouse and owner permission sets.
create or replace function private.has_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (
      exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = (select auth.uid())
          and r.name = any(required_roles)
      )
      or exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.is_active
          and (
            (p.role = 'admin' and 'OWNER' = any(required_roles))
            or (p.role = 'employee' and 'WAREHOUSE_STAFF' = any(required_roles))
          )
      )
    );
$$;

revoke all on function private.has_role(text[]) from public, anon;
grant execute on function private.has_role(text[]) to authenticated;

create or replace function private.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and not private.has_app_role(array['admin'])
     and (
       new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or new.created_at is distinct from old.created_at
     ) then
    raise exception '你没有权限修改员工角色或账号状态';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_profile_security_fields() from public, anon, authenticated;

drop trigger if exists profiles_protect_security_fields on public.profiles;
create trigger profiles_protect_security_fields
before update on public.profiles
for each row execute function private.protect_profile_security_fields();

drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated
before update on public.profiles
for each row execute function private.set_updated_at();

drop policy if exists profile_self_read on public.profiles;
drop policy if exists profile_self_update on public.profiles;

create policy profile_internal_read on public.profiles
for select to authenticated
using (
  (select auth.uid()) = id
  or (select private.has_app_role(array['admin']))
);

create policy profile_internal_update on public.profiles
for update to authenticated
using (
  (select auth.uid()) = id
  or (select private.has_app_role(array['admin']))
)
with check (
  (select auth.uid()) = id
  or (select private.has_app_role(array['admin']))
);

-- ---------------------------------------------------------------------------
-- Catalogue compatibility fields
-- ---------------------------------------------------------------------------

alter table public.products
  add column if not exists model_number text,
  add column if not exists name_zh text,
  add column if not exists name_it text,
  add column if not exists name_en text,
  add column if not exists internal_name text,
  add column if not exists subcategory_id uuid references public.categories(id) on delete set null,
  add column if not exists brand text,
  add column if not exists year integer,
  add column if not exists gender text,
  add column if not exists fit text,
  add column if not exists thickness text,
  add column if not exists elasticity text,
  add column if not exists washing_instructions text,
  add column if not exists origin_country text,
  add column if not exists short_description text,
  add column if not exists promotional_price numeric(12,2),
  add column if not exists currency text not null default 'EUR';

update public.products
set model_number = upper(regexp_replace(style_no, '\s+', '', 'g')),
    name_zh = coalesce(name_zh, name),
    washing_instructions = coalesce(washing_instructions, care_instructions),
    origin_country = coalesce(origin_country, origin),
    promotional_price = coalesce(promotional_price, sale_price)
where model_number is null
   or name_zh is null
   or washing_instructions is null
   or origin_country is null
   or promotional_price is null;

alter table public.products
  alter column model_number set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_model_number_key'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_model_number_key unique (model_number);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_model_number_format_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_model_number_format_check
      check (model_number ~ '^[A-Z0-9_-]{2,50}$');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_year_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_year_check
      check (year is null or year between 1900 and 2100);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_promotional_price_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_promotional_price_check
      check (promotional_price is null or promotional_price >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_currency_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_currency_check
      check (currency ~ '^[A-Z]{3}$');
  end if;
end;
$$;

create index if not exists products_subcategory_id_idx on public.products (subcategory_id);
create index if not exists products_status_created_at_idx on public.products (status, created_at desc) where deleted_at is null;
create index if not exists products_category_status_idx on public.products (category_id, status) where deleted_at is null;

create or replace function private.normalize_product_identifiers()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  normalized_style text;
  normalized_model text;
begin
  normalized_style := upper(regexp_replace(coalesce(new.style_no, ''), '\s+', '', 'g'));
  normalized_model := upper(regexp_replace(coalesce(new.model_number, ''), '\s+', '', 'g'));

  if normalized_style = '' then normalized_style := normalized_model; end if;
  if normalized_model = '' then normalized_model := normalized_style; end if;
  if normalized_style <> normalized_model then
    raise exception '款号字段不一致，请重新检查';
  end if;
  if normalized_style !~ '^[A-Z0-9_-]{2,50}$' then
    raise exception '款号只能包含字母、数字、短横线和下划线';
  end if;

  new.style_no := normalized_style;
  new.model_number := normalized_model;
  return new;
end;
$$;

revoke all on function private.normalize_product_identifiers() from public, anon, authenticated;

drop trigger if exists products_normalize_identifiers on public.products;
create trigger products_normalize_identifiers
before insert or update of style_no, model_number on public.products
for each row execute function private.normalize_product_identifiers();

alter table public.colors
  add column if not exists name_zh text,
  add column if not exists name_it text,
  add column if not exists name_en text,
  add column if not exists hex_value text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

update public.colors set name_zh = coalesce(name_zh, name);

create unique index if not exists colors_code_unique_idx
  on public.colors (upper(code))
  where code is not null;
create index if not exists colors_active_sort_idx
  on public.colors (is_active, sort_order, name);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'colors_code_format_check'
      and conrelid = 'public.colors'::regclass
  ) then
    alter table public.colors
      add constraint colors_code_format_check
      check (code is null or code ~ '^[A-Z0-9]{2,8}$');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'colors_hex_value_check'
      and conrelid = 'public.colors'::regclass
  ) then
    alter table public.colors
      add constraint colors_hex_value_check
      check (hex_value is null or hex_value ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end;
$$;

drop trigger if exists colors_updated on public.colors;
create trigger colors_updated
before update on public.colors
for each row execute function private.set_updated_at();

alter table public.categories
  add column if not exists name_zh text,
  add column if not exists name_it text,
  add column if not exists name_en text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

update public.categories set name_zh = coalesce(name_zh, name);

create index if not exists categories_parent_sort_idx
  on public.categories (parent_id, sort_order)
  where is_active;

drop trigger if exists categories_updated on public.categories;
create trigger categories_updated
before update on public.categories
for each row execute function private.set_updated_at();

alter table public.suppliers
  add column if not exists supplier_code text,
  add column if not exists supplier_name text,
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

update public.suppliers set supplier_name = coalesce(supplier_name, name);

create unique index if not exists suppliers_code_unique_idx
  on public.suppliers (upper(supplier_code))
  where supplier_code is not null and deleted_at is null;

drop trigger if exists suppliers_updated on public.suppliers;
create trigger suppliers_updated
before update on public.suppliers
for each row execute function private.set_updated_at();

alter table public.product_variants
  add column if not exists is_visible_online boolean not null default false;

create or replace function private.normalize_variant_sku()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.sku := upper(regexp_replace(trim(new.sku), '\s+', '', 'g'));
  if new.sku !~ '^[A-Z0-9_-]{2,100}$' then
    raise exception 'SKU只能包含字母、数字、短横线和下划线';
  end if;
  return new;
end;
$$;

revoke all on function private.normalize_variant_sku() from public, anon, authenticated;

drop trigger if exists product_variants_normalize_sku on public.product_variants;
create trigger product_variants_normalize_sku
before insert or update of sku on public.product_variants
for each row execute function private.normalize_variant_sku();

alter table public.product_images
  add column if not exists storage_path text generated always as (file_path) stored;

alter table public.inventory_movements
  add column if not exists inventory_item_id uuid references public.inventory(id) on delete restrict,
  add column if not exists reason text;

update public.inventory_movements m
set inventory_item_id = i.id,
    reason = coalesce(m.reason, m.notes)
from public.inventory i
where m.inventory_item_id is null
  and i.variant_id = m.variant_id
  and i.warehouse_id = m.warehouse_id;

create index if not exists inventory_movements_inventory_item_created_idx
  on public.inventory_movements (inventory_item_id, created_at desc);
create index if not exists inventory_movements_reference_idx
  on public.inventory_movements (reference_type, reference_id)
  where reference_id is not null;

-- Reserve the requested movement vocabulary without removing the legacy values.
alter type public.movement_type add value if not exists 'INBOUND';
alter type public.movement_type add value if not exists 'ADJUSTMENT_IN';
alter type public.movement_type add value if not exists 'ADJUSTMENT_OUT';
alter type public.movement_type add value if not exists 'SALE';
alter type public.movement_type add value if not exists 'RETURN';
alter type public.movement_type add value if not exists 'RESERVATION';
alter type public.movement_type add value if not exists 'RESERVATION_RELEASE';

-- Inventory quantities and their audit trail may only be changed by controlled
-- database functions. Existing security-definer RPCs continue to work.
revoke insert, update, delete on public.inventory from authenticated, anon;
revoke insert, update, delete on public.inventory_movements from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Fast inbound records
-- ---------------------------------------------------------------------------

create table public.inbound_orders (
  id uuid primary key default gen_random_uuid(),
  inbound_number text not null unique,
  status text not null default 'draft'
    check (status in ('draft', 'confirmed', 'cancelled')),
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null,
  total_quantity integer not null default 0 check (total_quantity >= 0),
  notes text,
  idempotency_key text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  confirmed_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  check (
    (status = 'draft' and confirmed_at is null and cancelled_at is null)
    or (status = 'confirmed' and confirmed_at is not null and cancelled_at is null)
    or (status = 'cancelled' and cancelled_at is not null and nullif(trim(cancellation_reason), '') is not null)
  )
);

create unique index inbound_orders_creator_idempotency_idx
  on public.inbound_orders (created_by, idempotency_key)
  where idempotency_key is not null;
create index inbound_orders_created_by_created_at_idx
  on public.inbound_orders (created_by, created_at desc);
create index inbound_orders_status_created_at_idx
  on public.inbound_orders (status, created_at desc);
create index inbound_orders_warehouse_id_idx on public.inbound_orders (warehouse_id);
create index inbound_orders_supplier_id_idx on public.inbound_orders (supplier_id);
create index inbound_orders_confirmed_by_idx on public.inbound_orders (confirmed_by) where confirmed_by is not null;

create table public.inbound_order_items (
  id uuid primary key default gen_random_uuid(),
  inbound_order_id uuid not null references public.inbound_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  color_id uuid not null references public.colors(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  sku text not null,
  quantity integer not null check (quantity between 1 and 99999),
  quantity_before integer not null check (quantity_before >= 0),
  quantity_after integer not null check (quantity_after >= 0),
  created_at timestamptz not null default now(),
  unique (inbound_order_id, variant_id),
  check (quantity_after = quantity_before + quantity)
);

create index inbound_order_items_order_idx on public.inbound_order_items (inbound_order_id);
create index inbound_order_items_product_idx on public.inbound_order_items (product_id);
create index inbound_order_items_color_idx on public.inbound_order_items (color_id);
create index inbound_order_items_variant_idx on public.inbound_order_items (variant_id);

drop trigger if exists inbound_orders_updated on public.inbound_orders;
create trigger inbound_orders_updated
before update on public.inbound_orders
for each row execute function private.set_updated_at();

create table private.inbound_number_counters (
  inbound_date date primary key,
  last_value integer not null check (last_value > 0),
  updated_at timestamptz not null default now()
);

create or replace function private.next_inbound_number(p_inbound_date date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_value integer;
begin
  if p_inbound_date is null then
    raise exception '入库日期不能为空';
  end if;

  insert into private.inbound_number_counters (inbound_date, last_value)
  values (p_inbound_date, 1)
  on conflict (inbound_date) do update
    set last_value = private.inbound_number_counters.last_value + 1,
        updated_at = now()
  returning last_value into next_value;

  return 'IN-' || to_char(p_inbound_date, 'YYYYMMDD') || '-' || lpad(next_value::text, 4, '0');
end;
$$;

revoke all on function private.next_inbound_number(date) from public, anon, authenticated;

alter table public.inbound_orders enable row level security;
alter table public.inbound_order_items enable row level security;

create policy inbound_orders_select on public.inbound_orders
for select to authenticated
using (
  (select private.has_app_role(array['admin']))
  or (
    (select private.has_app_role(array['employee']))
    and created_by = (select auth.uid())
  )
);

create policy inbound_orders_insert_draft on public.inbound_orders
for insert to authenticated
with check (
  (select private.has_app_role(array['employee', 'admin']))
  and created_by = (select auth.uid())
  and status = 'draft'
  and confirmed_at is null
  and cancelled_at is null
);

create policy inbound_orders_update_draft on public.inbound_orders
for update to authenticated
using (
  status = 'draft'
  and (
    (select private.has_app_role(array['admin']))
    or (
      (select private.has_app_role(array['employee']))
      and created_by = (select auth.uid())
    )
  )
)
with check (
  status = 'draft'
  and (
    (select private.has_app_role(array['admin']))
    or (
      (select private.has_app_role(array['employee']))
      and created_by = (select auth.uid())
    )
  )
);

create policy inbound_order_items_select on public.inbound_order_items
for select to authenticated
using (
  exists (
    select 1 from public.inbound_orders io
    where io.id = inbound_order_id
      and (
        (select private.has_app_role(array['admin']))
        or (
          (select private.has_app_role(array['employee']))
          and io.created_by = (select auth.uid())
        )
      )
  )
);

create policy inbound_order_items_insert_draft on public.inbound_order_items
for insert to authenticated
with check (
  exists (
    select 1 from public.inbound_orders io
    where io.id = inbound_order_id
      and io.status = 'draft'
      and (
        (select private.has_app_role(array['admin']))
        or (
          (select private.has_app_role(array['employee']))
          and io.created_by = (select auth.uid())
        )
      )
  )
);

create policy inbound_order_items_update_draft on public.inbound_order_items
for update to authenticated
using (
  exists (
    select 1 from public.inbound_orders io
    where io.id = inbound_order_id
      and io.status = 'draft'
      and (
        (select private.has_app_role(array['admin']))
        or (
          (select private.has_app_role(array['employee']))
          and io.created_by = (select auth.uid())
        )
      )
  )
)
with check (
  exists (
    select 1 from public.inbound_orders io
    where io.id = inbound_order_id
      and io.status = 'draft'
      and (
        (select private.has_app_role(array['admin']))
        or (
          (select private.has_app_role(array['employee']))
          and io.created_by = (select auth.uid())
        )
      )
  )
);

revoke all on public.inbound_orders, public.inbound_order_items from anon;
revoke all on public.inbound_orders, public.inbound_order_items from authenticated;
grant select, insert, update on public.inbound_orders, public.inbound_order_items to authenticated;

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

insert into public.sizes (name, normalized_name, sort_order, is_active)
values ('ONE_SIZE', 'ONE_SIZE', 5, true)
on conflict (normalized_name) do update
set is_active = true, sort_order = excluded.sort_order;

create temporary table fast_inbound_color_seed (
  name text not null,
  normalized_name text not null,
  name_zh text not null,
  name_en text not null,
  name_it text not null,
  code text not null,
  hex_value text not null,
  sort_order integer not null,
  is_active boolean not null
) on commit drop;

insert into fast_inbound_color_seed
  (name, normalized_name, name_zh, name_en, name_it, code, hex_value, sort_order, is_active)
values
  ('黑色', '黑色', '黑色', 'Black', 'Nero', 'BLK', '#000000', 10, true),
  ('白色', '白色', '白色', 'White', 'Bianco', 'WHT', '#FFFFFF', 20, true),
  ('米白色', '米白色', '米白', 'Ivory', 'Avorio', 'IVY', '#FFFFF0', 30, true),
  ('奶白', '奶白', '奶白', 'Cream', 'Crema', 'CRM', '#FFFDD0', 40, true),
  ('棕色', '棕色', '棕色', 'Brown', 'Marrone', 'BRN', '#7A4A2E', 50, true),
  ('深棕色', '深棕色', '深棕', 'Dark Brown', 'Marrone scuro', 'DBR', '#4B2E20', 60, true),
  ('浅棕色', '浅棕色', '浅棕', 'Light Brown', 'Marrone chiaro', 'LBR', '#B78A68', 70, true),
  ('红色', '红色', '红色', 'Red', 'Rosso', 'RED', '#D32F2F', 80, true),
  ('酒红色', '酒红色', '酒红', 'Wine', 'Bordeaux', 'WIN', '#722F37', 90, true),
  ('粉色', '粉色', '粉色', 'Pink', 'Rosa', 'PNK', '#F4A6B8', 100, true),
  ('蓝色', '蓝色', '蓝色', 'Blue', 'Blu', 'BLU', '#2563EB', 110, true),
  ('深蓝色', '深蓝色', '深蓝', 'Navy', 'Blu navy', 'NVY', '#1E3A5F', 120, true),
  ('浅蓝色', '浅蓝色', '浅蓝', 'Light Blue', 'Azzurro', 'LBL', '#9CC9E8', 130, true),
  ('绿色', '绿色', '绿色', 'Green', 'Verde', 'GRN', '#2E7D32', 140, true),
  ('深绿色', '深绿色', '深绿', 'Dark Green', 'Verde scuro', 'DGR', '#1B5E20', 150, true),
  ('灰色', '灰色', '灰色', 'Gray', 'Grigio', 'GRY', '#808080', 160, true),
  ('深灰色', '深灰色', '深灰', 'Dark Gray', 'Grigio scuro', 'DGY', '#4A4A4A', 170, true),
  ('浅灰色', '浅灰色', '浅灰', 'Light Gray', 'Grigio chiaro', 'LGY', '#C7C7C7', 180, true),
  ('卡其色', '卡其色', '卡其', 'Khaki', 'Kaki', 'KHK', '#B5A26F', 190, true),
  ('米色', '米色', '米色', 'Beige', 'Beige', 'BGE', '#D9C3A5', 200, true),
  ('黄色', '黄色', '黄色', 'Yellow', 'Giallo', 'YLW', '#F4D03F', 210, true),
  ('橙色', '橙色', '橙色', 'Orange', 'Arancione', 'ORG', '#F28C28', 220, true),
  ('紫色', '紫色', '紫色', 'Purple', 'Viola', 'PUR', '#7E57C2', 230, true),
  ('金色', '金色', '金色', 'Gold', 'Oro', 'GLD', '#D4AF37', 240, true),
  ('银色', '银色', '银色', 'Silver', 'Argento', 'SLV', '#C0C0C0', 250, true),
  ('彩色', '彩色', '彩色', 'Multicolor', 'Multicolore', 'MUL', '#9C6ADE', 260, true);

update public.colors c
set name_zh = s.name_zh,
    name_en = s.name_en,
    name_it = s.name_it,
    code = case
      when exists (
        select 1 from public.product_variants pv where pv.color_id = c.id
      ) then c.code
      else s.code
    end,
    hex_value = s.hex_value,
    sort_order = s.sort_order,
    is_active = true
from fast_inbound_color_seed s
where c.normalized_name = s.normalized_name
   or upper(c.code) = s.code;

insert into public.colors
  (name, normalized_name, name_zh, name_en, name_it, code, hex_value, sort_order, is_active)
select
  s.name, s.normalized_name, s.name_zh, s.name_en, s.name_it,
  s.code, s.hex_value, s.sort_order, true
from fast_inbound_color_seed s
where not exists (
  select 1
  from public.colors c
  where c.normalized_name = s.normalized_name
     or upper(c.code) = s.code
);

insert into public.categories
  (name, slug, name_zh, name_en, name_it, sort_order, is_active)
values
  ('上装', 'tops', '上装', 'Tops', 'Top', 10, true),
  ('下装', 'bottoms', '下装', 'Bottoms', 'Pantaloni e gonne', 20, true),
  ('连衣裙', 'dresses', '连衣裙', 'Dresses', 'Abiti', 30, true),
  ('外套', 'outerwear', '外套', 'Outerwear', 'Capispalla', 40, true),
  ('配饰', 'accessories', '配饰', 'Accessories', 'Accessori', 50, true)
on conflict (slug) do update
set name_zh = excluded.name_zh,
    name_en = excluded.name_en,
    name_it = excluded.name_it,
    sort_order = excluded.sort_order,
    is_active = true;

-- The image bucket already exists; keep its upload contract explicit.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images', 'product-images', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

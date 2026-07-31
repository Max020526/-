-- NEXORA Wholesale System V1.0
-- Core schema, RLS, audit trail, and atomic inventory workflows.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.product_status as enum ('DRAFT','PENDING_DETAILS','PENDING_IMAGES','PENDING_PRICE','PENDING_REVIEW','READY_TO_PUBLISH','PUBLISHED','SOLD_OUT','UNPUBLISHED','ARCHIVED');
create type public.receipt_status as enum ('DRAFT','PARSING','PENDING_REVIEW','RECEIVING','HAS_EXCEPTIONS','READY_TO_CONFIRM','COMPLETED','CANCELLED');
create type public.order_status as enum ('PENDING_PAYMENT','PAID','PICKING','PACKED','READY_FOR_PICKUP','SHIPPED','COMPLETED','CANCELLED','REFUND_REQUESTED','REFUNDED');
create type public.movement_type as enum ('PURCHASE_IN','ONLINE_SALE','WHOLESALE_SALE','CUSTOMER_RETURN','SUPPLIER_RETURN','DAMAGE','STOCKTAKE_ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT');
create type public.match_type as enum ('NEW_PRODUCT','NEW_COLOR_VARIANT','NEW_SIZE_VARIANT','RESTOCK_EXISTING_SKU','PENDING');

create table public.roles (
  id uuid primary key default gen_random_uuid(), name text unique not null,
  description text, created_at timestamptz not null default now()
);
create table public.permissions (
  id uuid primary key default gen_random_uuid(), code text unique not null,
  description text, created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_by uuid references public.profiles(id), assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);
create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.brands (id uuid primary key default gen_random_uuid(), name text unique not null, created_at timestamptz not null default now());
create table public.categories (id uuid primary key default gen_random_uuid(), parent_id uuid references public.categories(id), name text not null, slug text unique not null, is_active boolean not null default true, created_at timestamptz not null default now());
create table public.suppliers (id uuid primary key default gen_random_uuid(), name text unique not null, contact_name text, phone text, email text, notes text, created_at timestamptz not null default now(), deleted_at timestamptz);
create table public.warehouses (id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, address text, is_active boolean not null default true, created_at timestamptz not null default now());
create table public.colors (id uuid primary key default gen_random_uuid(), name text unique not null, normalized_name text unique not null, code text, is_active boolean not null default true, created_at timestamptz not null default now());
create table public.sizes (id uuid primary key default gen_random_uuid(), name text unique not null, normalized_name text unique not null, sort_order integer not null default 0, is_active boolean not null default true, created_at timestamptz not null default now());

create table public.products (
  id uuid primary key default gen_random_uuid(), style_no text unique not null,
  name text, subtitle text, brand_id uuid references public.brands(id), category_id uuid references public.categories(id), supplier_id uuid references public.suppliers(id),
  season text, material text, origin text, description text, care_instructions text, internal_notes text,
  cost_price numeric(12,2) check (cost_price is null or cost_price >= 0), wholesale_price numeric(12,2) check (wholesale_price is null or wholesale_price >= 0),
  suggested_retail_price numeric(12,2) check (suggested_retail_price is null or suggested_retail_price >= 0), retail_price numeric(12,2) check (retail_price is null or retail_price >= 0),
  sale_price numeric(12,2) check (sale_price is null or sale_price >= 0), tax_rate numeric(5,2) not null default 22 check (tax_rate >= 0),
  slug text unique, seo_title text, seo_description text, status public.product_status not null default 'PENDING_DETAILS',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.product_variants (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete restrict,
  color_id uuid not null references public.colors(id), size_id uuid not null references public.sizes(id),
  sku text unique not null, barcode text unique, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(product_id,color_id,size_id)
);
create table public.product_images (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null, file_path text unique not null, public_url text not null,
  image_type text not null check (image_type in ('MAIN','DETAIL','VARIANT')), sort_order integer not null default 0, is_primary boolean not null default false,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create unique index product_single_primary_image on public.product_images(product_id) where is_primary;
create table public.product_tags (id uuid primary key default gen_random_uuid(), name text unique not null, created_at timestamptz not null default now());
create table public.product_tag_relations (product_id uuid references public.products(id) on delete cascade, tag_id uuid references public.product_tags(id) on delete cascade, primary key(product_id,tag_id));

create table public.inventory (
  id uuid primary key default gen_random_uuid(), variant_id uuid not null references public.product_variants(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0 and quantity_reserved <= quantity_on_hand),
  quantity_available integer generated always as (quantity_on_hand - quantity_reserved) stored,
  online_quantity_limit integer not null default 0 check (online_quantity_limit >= 0), low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now(), unique(variant_id,warehouse_id)
);
create table public.stock_receipts (
  id uuid primary key default gen_random_uuid(), receipt_no text unique not null default 'PENDING', receipt_date date not null default current_date,
  supplier_id uuid references public.suppliers(id), warehouse_id uuid not null references public.warehouses(id), source_type text,
  source_file_url text, status public.receipt_status not null default 'DRAFT', expected_quantity integer not null default 0 check(expected_quantity >= 0),
  received_quantity integer not null default 0 check(received_quantity >= 0), exception_count integer not null default 0 check(exception_count >= 0), notes text,
  created_by uuid not null references public.profiles(id), confirmed_by uuid references public.profiles(id), created_at timestamptz not null default now(), confirmed_at timestamptz
);
create table public.stock_receipt_raw_lines (
  id uuid primary key default gen_random_uuid(), receipt_id uuid not null references public.stock_receipts(id) on delete cascade,
  line_number integer not null, raw_text text not null, recognized_data jsonb, parse_status text not null default 'PENDING', error_reason text,
  created_at timestamptz not null default now(), unique(receipt_id,line_number)
);
create table public.stock_receipt_items (
  id uuid primary key default gen_random_uuid(), receipt_id uuid not null references public.stock_receipts(id) on delete cascade,
  raw_line_number integer, product_id uuid references public.products(id), variant_id uuid references public.product_variants(id),
  raw_style_no text not null, normalized_style_no text not null, raw_color text, normalized_color text not null,
  raw_size text, normalized_size text not null, expected_quantity integer check(expected_quantity > 0), received_quantity integer check(received_quantity >= 0),
  difference_quantity integer, match_type public.match_type not null default 'PENDING', status text not null default 'PENDING', notes text,
  created_at timestamptz not null default now()
);
create index stock_receipt_items_receipt_idx on public.stock_receipt_items(receipt_id);
create table public.stock_receipt_exceptions (id uuid primary key default gen_random_uuid(), receipt_id uuid not null references public.stock_receipts(id) on delete cascade, item_id uuid references public.stock_receipt_items(id) on delete cascade, exception_type text not null, message text not null, resolved_at timestamptz, resolved_by uuid references public.profiles(id), created_at timestamptz not null default now());
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(), variant_id uuid not null references public.product_variants(id), warehouse_id uuid not null references public.warehouses(id),
  movement_type public.movement_type not null, quantity_change integer not null check(quantity_change <> 0), quantity_before integer not null check(quantity_before >= 0), quantity_after integer not null check(quantity_after >= 0),
  reference_type text, reference_id uuid, reference_no text, notes text, created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create index inventory_movements_variant_created_idx on public.inventory_movements(variant_id,created_at desc);
create table public.stock_adjustments (id uuid primary key default gen_random_uuid(), variant_id uuid not null references public.product_variants(id), warehouse_id uuid not null references public.warehouses(id), quantity_change integer not null check(quantity_change <> 0), reason text not null, status text not null default 'DRAFT', created_by uuid not null references public.profiles(id), approved_by uuid references public.profiles(id), created_at timestamptz not null default now());

create table public.online_listings (
  id uuid primary key default gen_random_uuid(), product_id uuid unique not null references public.products(id) on delete cascade,
  title text not null, slug text unique not null, short_description text, description text not null, retail_price numeric(12,2) not null check(retail_price > 0), sale_price numeric(12,2) check(sale_price is null or sale_price > 0),
  listing_status text not null default 'DRAFT' check(listing_status in ('DRAFT','PUBLISHED','UNPUBLISHED')),
  is_new boolean not null default true, is_featured boolean not null default false, is_bestseller boolean not null default false,
  published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.customers (id uuid primary key references auth.users(id) on delete cascade, full_name text, phone text, email text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.customer_addresses (id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id) on delete cascade, label text, country text not null, city text not null, postal_code text not null, address_line text not null, is_default boolean not null default false, created_at timestamptz not null default now());
create table public.shopping_carts (id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id) on delete cascade, status text not null default 'ACTIVE', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(customer_id,status));
create table public.shopping_cart_items (id uuid primary key default gen_random_uuid(), cart_id uuid not null references public.shopping_carts(id) on delete cascade, variant_id uuid not null references public.product_variants(id), quantity integer not null check(quantity > 0), unit_price numeric(12,2) not null check(unit_price > 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(cart_id,variant_id));
create table public.orders (
  id uuid primary key default gen_random_uuid(), order_no text unique not null default 'PENDING', customer_id uuid references public.customers(id),
  status public.order_status not null default 'PENDING_PAYMENT', subtotal numeric(12,2) not null check(subtotal >= 0), shipping_fee numeric(12,2) not null default 0 check(shipping_fee >= 0),
  discount_amount numeric(12,2) not null default 0 check(discount_amount >= 0), tax_amount numeric(12,2) not null default 0 check(tax_amount >= 0), total_amount numeric(12,2) not null check(total_amount >= 0),
  payment_status text not null default 'PENDING', fulfillment_type text not null check(fulfillment_type in ('DELIVERY','PICKUP')), shipping_address jsonb, customer_note text,
  idempotency_key text unique not null, created_at timestamptz not null default now(), paid_at timestamptz, shipped_at timestamptz, completed_at timestamptz, cancelled_at timestamptz
);
create table public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict, variant_id uuid not null references public.product_variants(id), warehouse_id uuid not null references public.warehouses(id), product_title text not null, sku text not null, color_name text not null, size_name text not null, unit_price numeric(12,2) not null check(unit_price > 0), quantity integer not null check(quantity > 0), line_total numeric(12,2) not null check(line_total >= 0), created_at timestamptz not null default now());
create table public.payments (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), provider text, provider_reference text, amount numeric(12,2) not null check(amount >= 0), status text not null, paid_at timestamptz, created_at timestamptz not null default now());
create table public.shipments (id uuid primary key default gen_random_uuid(), order_id uuid unique not null references public.orders(id), carrier text, tracking_no text, status text not null default 'PENDING', shipped_at timestamptz, delivered_at timestamptz, created_at timestamptz not null default now());
create table public.returns (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), status text not null default 'REQUESTED', reason text, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), completed_at timestamptz);

create table public.audit_logs (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), action text not null, entity_type text not null, entity_id uuid, old_data jsonb, new_data jsonb, ip_address inet, user_agent text, created_at timestamptz not null default now());
create table public.settings (key text primary key, value jsonb not null, updated_by uuid references public.profiles(id), updated_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id), title text not null, body text, read_at timestamptz, created_at timestamptz not null default now());

-- Identity helpers. Authorization data is stored in tables, never user_metadata.
create or replace function private.has_role(required_roles text[]) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=(select auth.uid()) and r.name=any(required_roles));
$$;
revoke all on function private.has_role(text[]) from public, anon;
grant execute on function private.has_role(text[]) to authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,full_name) values(new.id,new.raw_user_meta_data->>'full_name') on conflict do nothing;
  insert into public.customers(id,full_name,email) values(new.id,new.raw_user_meta_data->>'full_name',new.email) on conflict do nothing;
  return new;
end; $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function private.set_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end; $$;
create trigger products_updated before update on public.products for each row execute function private.set_updated_at();
create trigger variants_updated before update on public.product_variants for each row execute function private.set_updated_at();
create trigger inventory_updated before update on public.inventory for each row execute function private.set_updated_at();
create trigger listings_updated before update on public.online_listings for each row execute function private.set_updated_at();

create or replace function private.number_receipt() returns trigger language plpgsql set search_path='' as $$
declare seq_no integer;
begin
  if new.receipt_no='PENDING' then
    perform pg_advisory_xact_lock(hashtext('receipt:'||new.receipt_date::text));
    select count(*)+1 into seq_no from public.stock_receipts where receipt_date=new.receipt_date;
    new.receipt_no='RK-'||to_char(new.receipt_date,'YYYYMMDD')||'-'||lpad(seq_no::text,3,'0');
  end if; return new;
end; $$;
create trigger stock_receipt_number before insert on public.stock_receipts for each row execute function private.number_receipt();

create or replace function private.number_order() returns trigger language plpgsql set search_path='' as $$
declare seq_no integer;
begin
  if new.order_no='PENDING' then
    perform pg_advisory_xact_lock(hashtext('order:'||current_date::text));
    select count(*)+1 into seq_no from public.orders where created_at::date=current_date;
    new.order_no='WEB-'||to_char(current_date,'YYYYMMDD')||'-'||lpad(seq_no::text,3,'0');
  end if; return new;
end; $$;
create trigger order_number before insert on public.orders for each row execute function private.number_order();

-- Atomic, idempotent purchase receipt confirmation.
create or replace function public.confirm_stock_receipt(p_receipt_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.stock_receipts%rowtype; item public.stock_receipt_items%rowtype; p_id uuid; c_id uuid; s_id uuid; v_id uuid; inv public.inventory%rowtype; before_qty integer; new_products integer:=0; new_variants integer:=0; total_qty integer:=0; matched public.match_type;
begin
  if (select auth.uid()) is null or not private.has_role(array['OWNER','WAREHOUSE_STAFF']) then raise exception '没有确认入库权限'; end if;
  select * into r from public.stock_receipts where id=p_receipt_id for update;
  if not found then raise exception '入库单不存在'; end if;
  if r.status='COMPLETED' then raise exception '该入库单已经确认，不能重复入库'; end if;
  if r.status<>'READY_TO_CONFIRM' then raise exception '入库单尚未完成实收核对'; end if;
  if exists(select 1 from public.stock_receipt_items where receipt_id=r.id and (received_quantity is null or received_quantity<0 or status='ERROR')) then raise exception '仍有未核对或错误记录'; end if;
  for item in select * from public.stock_receipt_items where receipt_id=r.id and received_quantity>0 order by id loop
    select id into p_id from public.products where style_no=item.normalized_style_no and deleted_at is null;
    if p_id is null then insert into public.products(style_no,supplier_id,status,created_by) values(item.normalized_style_no,r.supplier_id,'PENDING_DETAILS',(select auth.uid())) returning id into p_id; new_products:=new_products+1; matched:='NEW_PRODUCT'; else matched:='RESTOCK_EXISTING_SKU'; end if;
    insert into public.colors(name,normalized_name) values(item.normalized_color,item.normalized_color) on conflict(normalized_name) do update set name=excluded.name returning id into c_id;
    insert into public.sizes(name,normalized_name) values(item.normalized_size,item.normalized_size) on conflict(normalized_name) do update set name=excluded.name returning id into s_id;
    select id into v_id from public.product_variants where product_id=p_id and color_id=c_id and size_id=s_id;
    if v_id is null then
      insert into public.product_variants(product_id,color_id,size_id,sku) values(p_id,c_id,s_id,regexp_replace(item.normalized_style_no,'[^A-Za-z0-9]+','-','g')||'-'||upper(left(c_id::text,6))||'-'||item.normalized_size) returning id into v_id;
      new_variants:=new_variants+1; if matched<>'NEW_PRODUCT' then matched:='NEW_COLOR_VARIANT'; end if;
    end if;
    insert into public.inventory(variant_id,warehouse_id,quantity_on_hand) values(v_id,r.warehouse_id,item.received_quantity)
      on conflict(variant_id,warehouse_id) do update set quantity_on_hand=public.inventory.quantity_on_hand+excluded.quantity_on_hand
      returning * into inv;
    before_qty:=inv.quantity_on_hand-item.received_quantity;
    insert into public.inventory_movements(variant_id,warehouse_id,movement_type,quantity_change,quantity_before,quantity_after,reference_type,reference_id,reference_no,created_by)
      values(v_id,r.warehouse_id,'PURCHASE_IN',item.received_quantity,before_qty,inv.quantity_on_hand,'STOCK_RECEIPT',r.id,r.receipt_no,(select auth.uid()));
    update public.stock_receipt_items set product_id=p_id,variant_id=v_id,match_type=matched,status='COMPLETED' where id=item.id;
    total_qty:=total_qty+item.received_quantity;
  end loop;
  update public.stock_receipts set status='COMPLETED',received_quantity=total_qty,confirmed_by=(select auth.uid()),confirmed_at=now() where id=r.id;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data) values((select auth.uid()),'CONFIRM_STOCK_RECEIPT','stock_receipt',r.id,jsonb_build_object('receipt_no',r.receipt_no,'total_quantity',total_qty));
  return jsonb_build_object('receipt_id',r.id,'receipt_no',r.receipt_no,'total_quantity',total_qty,'new_products',new_products,'new_variants',new_variants);
end; $$;
revoke all on function public.confirm_stock_receipt(uuid) from public, anon;
grant execute on function public.confirm_stock_receipt(uuid) to authenticated;

-- Publishing can only happen after every required field passes a database check.
create or replace function public.publish_product(p_product_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.products%rowtype; errors text[]:=array[]::text[];
begin
  if (select auth.uid()) is null or not private.has_role(array['OWNER','PRODUCT_MANAGER']) then raise exception '没有商品上架权限'; end if;
  select * into p from public.products where id=p_product_id and deleted_at is null for update;
  if not found then raise exception '商品不存在'; end if;
  if coalesce(trim(p.name),'')='' then errors:=array_append(errors,'商品名称不能为空'); end if;
  if p.category_id is null then errors:=array_append(errors,'请选择商品分类'); end if;
  if coalesce(p.retail_price,0)<=0 then errors:=array_append(errors,'网店零售价必须大于0'); end if;
  if coalesce(trim(p.description),'')='' then errors:=array_append(errors,'请填写商品描述'); end if;
  if coalesce(trim(p.slug),'')='' then errors:=array_append(errors,'请设置URL Slug'); end if;
  if not exists(select 1 from public.product_images where product_id=p.id and is_primary) then errors:=array_append(errors,'请至少上传一张商品主图'); end if;
  if not exists(select 1 from public.product_images where product_id=p.id and image_type='DETAIL') then errors:=array_append(errors,'请至少上传一张商品详情图'); end if;
  if not exists(select 1 from public.product_variants where product_id=p.id and is_active) then errors:=array_append(errors,'请至少启用一个SKU'); end if;
  if not exists(select 1 from public.product_variants v join public.inventory i on i.variant_id=v.id where v.product_id=p.id and v.is_active and least(i.quantity_available,i.online_quantity_limit)>0) then errors:=array_append(errors,'请至少设置一个SKU的网店可售库存'); end if;
  if array_length(errors,1)>0 then raise exception '%',array_to_string(errors,'；'); end if;
  insert into public.online_listings(product_id,title,slug,short_description,description,retail_price,sale_price,listing_status,published_at)
    values(p.id,p.name,p.slug,p.subtitle,p.description,p.retail_price,p.sale_price,'PUBLISHED',now())
    on conflict(product_id) do update set title=excluded.title,slug=excluded.slug,short_description=excluded.short_description,description=excluded.description,retail_price=excluded.retail_price,sale_price=excluded.sale_price,listing_status='PUBLISHED',published_at=now();
  update public.products set status='PUBLISHED' where id=p.id;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data) values((select auth.uid()),'PUBLISH_PRODUCT','product',p.id,jsonb_build_object('status','PUBLISHED'));
  return jsonb_build_object('ok',true,'message','商品已成功上架');
end; $$;
revoke all on function public.publish_product(uuid) from public, anon;
grant execute on function public.publish_product(uuid) to authenticated;

-- Atomic order creation; prices are read from listings, never trusted from clients.
create or replace function public.create_online_order(p_items jsonb,p_fulfillment_type text,p_shipping_address jsonb,p_shipping_fee numeric,p_customer_note text,p_idempotency_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare existing uuid; o_id uuid; line jsonb; v public.product_variants%rowtype; listing public.online_listings%rowtype; inv public.inventory%rowtype; qty integer; subtotal_value numeric:=0; unit_value numeric;
begin
  if (select auth.uid()) is null then raise exception '请先登录'; end if;
  select id into existing from public.orders where idempotency_key=p_idempotency_key;
  if existing is not null then return jsonb_build_object('order_id',existing,'idempotent',true); end if;
  if jsonb_array_length(p_items)=0 then raise exception '订单中没有商品'; end if;
  if p_fulfillment_type not in ('DELIVERY','PICKUP') then raise exception '配送方式无效'; end if;
  insert into public.orders(customer_id,subtotal,shipping_fee,total_amount,fulfillment_type,shipping_address,customer_note,idempotency_key) values((select auth.uid()),0,greatest(coalesce(p_shipping_fee,0),0),greatest(coalesce(p_shipping_fee,0),0),p_fulfillment_type,p_shipping_address,p_customer_note,p_idempotency_key) returning id into o_id;
  for line in select * from jsonb_array_elements(p_items) loop
    qty:=(line->>'quantity')::integer; if qty<=0 then raise exception '商品数量必须大于0'; end if;
    select * into v from public.product_variants where id=(line->>'variant_id')::uuid and is_active;
    select l.* into listing from public.online_listings l where l.product_id=v.product_id and l.listing_status='PUBLISHED';
    if not found then raise exception '商品未上架或已下架'; end if;
    select i.* into inv from public.inventory i where i.variant_id=v.id and least(i.quantity_available,i.online_quantity_limit)>=qty order by i.quantity_available desc limit 1 for update;
    if not found then raise exception '库存不足，无法创建订单'; end if;
    update public.inventory set quantity_reserved=quantity_reserved+qty where id=inv.id;
    unit_value:=coalesce(listing.sale_price,listing.retail_price); subtotal_value:=subtotal_value+unit_value*qty;
    insert into public.order_items(order_id,variant_id,warehouse_id,product_title,sku,color_name,size_name,unit_price,quantity,line_total)
      select o_id,v.id,inv.warehouse_id,listing.title,v.sku,c.name,s.name,unit_value,qty,unit_value*qty from public.colors c,public.sizes s where c.id=v.color_id and s.id=v.size_id;
  end loop;
  update public.orders set subtotal=subtotal_value,total_amount=subtotal_value+greatest(coalesce(p_shipping_fee,0),0) where id=o_id;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data) values((select auth.uid()),'CREATE_ORDER','order',o_id,jsonb_build_object('subtotal',subtotal_value));
  return jsonb_build_object('order_id',o_id,'idempotent',false);
end; $$;
revoke all on function public.create_online_order(jsonb,text,jsonb,numeric,text,text) from public, anon;
grant execute on function public.create_online_order(jsonb,text,jsonb,numeric,text,text) to authenticated;

create or replace function public.transition_order_inventory(p_order_id uuid,p_target_status public.order_status) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; line public.order_items%rowtype; inv public.inventory%rowtype; before_qty integer;
begin
  if (select auth.uid()) is null then raise exception '请先登录'; end if;
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception '订单不存在'; end if;
  if not (o.customer_id=(select auth.uid()) and p_target_status='CANCELLED' and o.status='PENDING_PAYMENT') and not private.has_role(array['OWNER','ORDER_STAFF']) then raise exception '没有订单处理权限'; end if;
  if p_target_status='CANCELLED' then
    if o.status in ('CANCELLED','SHIPPED','COMPLETED','REFUNDED') then raise exception '当前订单状态不能取消'; end if;
    for line in select * from public.order_items where order_id=o.id loop update public.inventory set quantity_reserved=quantity_reserved-line.quantity where variant_id=line.variant_id and warehouse_id=line.warehouse_id; end loop;
    update public.orders set status='CANCELLED',cancelled_at=now() where id=o.id;
  elsif p_target_status='SHIPPED' then
    if o.status not in ('PAID','PICKING','PACKED') then raise exception '订单尚未进入可发货状态'; end if;
    for line in select * from public.order_items where order_id=o.id loop
      select * into inv from public.inventory where variant_id=line.variant_id and warehouse_id=line.warehouse_id for update; before_qty:=inv.quantity_on_hand;
      update public.inventory set quantity_on_hand=quantity_on_hand-line.quantity,quantity_reserved=quantity_reserved-line.quantity where id=inv.id;
      insert into public.inventory_movements(variant_id,warehouse_id,movement_type,quantity_change,quantity_before,quantity_after,reference_type,reference_id,reference_no,created_by) values(line.variant_id,line.warehouse_id,'ONLINE_SALE',-line.quantity,before_qty,before_qty-line.quantity,'ORDER',o.id,o.order_no,(select auth.uid()));
    end loop;
    update public.orders set status='SHIPPED',shipped_at=now() where id=o.id;
  else raise exception '该库存状态变更不受支持'; end if;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data) values((select auth.uid()),'ORDER_STATUS_CHANGE','order',o.id,jsonb_build_object('from',o.status,'to',p_target_status));
  return jsonb_build_object('ok',true,'status',p_target_status);
end; $$;
revoke all on function public.transition_order_inventory(uuid,public.order_status) from public, anon;
grant execute on function public.transition_order_inventory(uuid,public.order_status) to authenticated;

-- RLS on every table in exposed public schema.
do $$ declare t text; begin foreach t in array array['roles','permissions','profiles','user_roles','role_permissions','brands','categories','suppliers','warehouses','colors','sizes','products','product_variants','product_images','product_tags','product_tag_relations','inventory','stock_receipts','stock_receipt_raw_lines','stock_receipt_items','stock_receipt_exceptions','inventory_movements','stock_adjustments','online_listings','customers','customer_addresses','shopping_carts','shopping_cart_items','orders','order_items','payments','shipments','returns','audit_logs','settings','notifications'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;

-- Public storefront reads only fully published records.
create policy public_read_listings on public.online_listings for select to anon,authenticated using (listing_status='PUBLISHED');
create policy public_read_published_products on public.products for select to anon,authenticated using (status='PUBLISHED' and deleted_at is null);
create policy public_read_published_variants on public.product_variants for select to anon,authenticated using (is_active and exists(select 1 from public.products p where p.id=product_id and p.status='PUBLISHED'));
create policy public_read_published_images on public.product_images for select to anon,authenticated using (exists(select 1 from public.products p where p.id=product_id and p.status='PUBLISHED'));
create policy public_read_colors on public.colors for select to anon,authenticated using (is_active);
create policy public_read_sizes on public.sizes for select to anon,authenticated using (is_active);
create policy public_read_categories on public.categories for select to anon,authenticated using (is_active);
create policy public_read_online_inventory on public.inventory for select to anon,authenticated using (exists(select 1 from public.product_variants v join public.products p on p.id=v.product_id where v.id=variant_id and p.status='PUBLISHED'));

-- Staff access is role based and customer records remain owner scoped.
do $$ declare t text; begin foreach t in array array['brands','categories','suppliers','warehouses','colors','sizes','products','product_variants','product_images','product_tags','product_tag_relations','inventory','stock_receipts','stock_receipt_raw_lines','stock_receipt_items','stock_receipt_exceptions','inventory_movements','stock_adjustments','online_listings','orders','order_items','payments','shipments','returns','notifications'] loop execute format('create policy staff_all_%1$s on public.%1$I for all to authenticated using (private.has_role(array[''OWNER'',''WAREHOUSE_STAFF'',''PRODUCT_MANAGER'',''ORDER_STAFF''])) with check (private.has_role(array[''OWNER'',''WAREHOUSE_STAFF'',''PRODUCT_MANAGER'',''ORDER_STAFF'']))',t); end loop; end $$;
create policy profile_self_read on public.profiles for select to authenticated using ((select auth.uid())=id or private.has_role(array['OWNER']));
create policy profile_self_update on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy owner_roles on public.roles for all to authenticated using (private.has_role(array['OWNER'])) with check (private.has_role(array['OWNER']));
create policy owner_permissions on public.permissions for all to authenticated using (private.has_role(array['OWNER'])) with check (private.has_role(array['OWNER']));
create policy owner_user_roles on public.user_roles for all to authenticated using (private.has_role(array['OWNER'])) with check (private.has_role(array['OWNER']));
create policy owner_role_permissions on public.role_permissions for all to authenticated using (private.has_role(array['OWNER'])) with check (private.has_role(array['OWNER']));
create policy customer_self on public.customers for all to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy addresses_self on public.customer_addresses for all to authenticated using (customer_id=(select auth.uid())) with check (customer_id=(select auth.uid()));
create policy carts_self on public.shopping_carts for all to authenticated using (customer_id=(select auth.uid())) with check (customer_id=(select auth.uid()));
create policy cart_items_self on public.shopping_cart_items for all to authenticated using (exists(select 1 from public.shopping_carts c where c.id=cart_id and c.customer_id=(select auth.uid()))) with check (exists(select 1 from public.shopping_carts c where c.id=cart_id and c.customer_id=(select auth.uid())));
create policy orders_self_read on public.orders for select to authenticated using (customer_id=(select auth.uid()));
create policy order_items_self_read on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and o.customer_id=(select auth.uid())));
create policy audit_owner_read on public.audit_logs for select to authenticated using (private.has_role(array['OWNER']));
create policy settings_owner on public.settings for all to authenticated using (private.has_role(array['OWNER'])) with check (private.has_role(array['OWNER']));

-- Storage bucket and role-gated image policies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-images','product-images',true,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy product_images_public_read on storage.objects for select to anon,authenticated using (bucket_id='product-images');
create policy product_images_staff_insert on storage.objects for insert to authenticated with check (bucket_id='product-images' and private.has_role(array['OWNER','PRODUCT_MANAGER']));
create policy product_images_staff_update on storage.objects for update to authenticated using (bucket_id='product-images' and private.has_role(array['OWNER','PRODUCT_MANAGER'])) with check (bucket_id='product-images' and private.has_role(array['OWNER','PRODUCT_MANAGER']));
create policy product_images_staff_delete on storage.objects for delete to authenticated using (bucket_id='product-images' and private.has_role(array['OWNER','PRODUCT_MANAGER']));

-- Explicit Data API grants; RLS remains the row-level boundary.
grant select on public.online_listings,public.products,public.product_variants,public.product_images,public.colors,public.sizes,public.categories,public.inventory to anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant usage,select on all sequences in schema public to authenticated;

insert into public.roles(name,description) values
('OWNER','全部权限'),('WAREHOUSE_STAFF','仓库入库员工'),('PRODUCT_MANAGER','商品管理员'),('ORDER_STAFF','订单处理员工'),('CUSTOMER','网店顾客') on conflict(name) do nothing;
insert into public.warehouses(code,name) values('MAIN','主仓库') on conflict(code) do nothing;
insert into public.sizes(name,normalized_name,sort_order) values('XS','XS',10),('S','S',20),('M','M',30),('L','L',40),('XL','XL',50),('XXL','XXL',60),('SM','SM',70),('ML','ML',80),('UNI','UNI',90) on conflict(normalized_name) do nothing;
insert into public.colors(name,normalized_name,code) values('黑色','黑色','BLK'),('白色','白色','WHT'),('红色','红色','RED'),('绿色','绿色','GRN'),('蓝色','蓝色','BLU'),('棕色','棕色','BRN'),('灰色','灰色','GRY'),('米色','米色','BEI'),('米白色','米白色','OWH'),('浅棕色','浅棕色','LBR'),('酒红色','酒红色','BUR'),('浅牛仔色','浅牛仔色','LDB'),('深牛仔色','深牛仔色','DDB') on conflict(normalized_name) do nothing;

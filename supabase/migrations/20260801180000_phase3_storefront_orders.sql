-- NEXORA V1.0 Phase 3: safe retail catalogue, guest/customer checkout,
-- immutable reservation records and customer-owned account data.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm with schema extensions;

alter table public.customers
  add column if not exists preferred_locale text not null default 'zh-CN',
  add column if not exists marketing_consent boolean not null default false,
  add column if not exists marketing_consent_at timestamptz;

alter table public.customer_addresses
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists region text,
  add column if not exists address_line_2 text,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists customer_addresses_one_default_idx
  on public.customer_addresses(customer_id) where is_default;

drop trigger if exists customer_addresses_updated on public.customer_addresses;
create trigger customer_addresses_updated before update on public.customer_addresses
for each row execute function private.set_updated_at();

alter table public.orders
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict,
  add column if not exists channel_id uuid references public.channels(id) on delete restrict,
  add column if not exists currency text not null default 'EUR',
  add column if not exists customer_name text,
  add column if not exists customer_email text,
  add column if not exists customer_phone text,
  add column if not exists contact_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists billing_address_snapshot jsonb,
  add column if not exists shipping_address_snapshot jsonb,
  add column if not exists guest_session_hash text,
  add column if not exists lookup_token_hash text,
  add column if not exists request_id uuid,
  add column if not exists payment_adapter text not null default 'manual',
  add column if not exists updated_at timestamptz not null default now();

create index if not exists orders_organization_created_idx
  on public.orders(organization_id,created_at desc);
create index if not exists orders_channel_created_idx
  on public.orders(channel_id,created_at desc);
create index if not exists orders_customer_email_created_idx
  on public.orders(lower(customer_email),created_at desc) where customer_email is not null;
create unique index if not exists orders_request_id_unique_idx
  on public.orders(request_id) where request_id is not null;

drop trigger if exists orders_updated on public.orders;
create trigger orders_updated before update on public.orders
for each row execute function private.set_updated_at();

alter table public.order_items
  add column if not exists product_id uuid references public.products(id) on delete restrict,
  add column if not exists currency text not null default 'EUR',
  add column if not exists discount_amount numeric(12,2) not null default 0,
  add column if not exists tax_amount numeric(12,2) not null default 0,
  add column if not exists product_slug text,
  add column if not exists image_media_id uuid references public.product_images(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='order_items_discount_amount_check') then
    alter table public.order_items add constraint order_items_discount_amount_check
      check (discount_amount>=0);
  end if;
  if not exists (select 1 from pg_constraint where conname='order_items_tax_amount_check') then
    alter table public.order_items add constraint order_items_tax_amount_check
      check (tax_amount>=0);
  end if;
end;
$$;

create table if not exists public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  inventory_id uuid not null references public.inventory(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  quantity integer not null check (quantity>0),
  status text not null default 'active'
    check (status in ('active','consumed','released','expired')),
  idempotency_key text not null,
  expires_at timestamptz not null,
  released_at timestamptz,
  consumed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_item_id),
  unique(organization_id,idempotency_key,order_item_id)
);

create index if not exists stock_reservations_order_idx
  on public.stock_reservations(order_id,status);
create index if not exists stock_reservations_inventory_active_idx
  on public.stock_reservations(inventory_id,expires_at)
  where status='active';
create index if not exists stock_reservations_expiry_idx
  on public.stock_reservations(expires_at,id)
  where status='active';
create index if not exists stock_reservations_variant_idx
  on public.stock_reservations(variant_id);
create index if not exists stock_reservations_warehouse_idx
  on public.stock_reservations(warehouse_id);
create index if not exists stock_reservations_created_by_idx
  on public.stock_reservations(created_by) where created_by is not null;
create index if not exists order_items_product_idx
  on public.order_items(product_id) where product_id is not null;
create index if not exists order_items_image_media_idx
  on public.order_items(image_media_id) where image_media_id is not null;

drop trigger if exists stock_reservations_updated on public.stock_reservations;
create trigger stock_reservations_updated before update on public.stock_reservations
for each row execute function private.set_updated_at();

create table if not exists private.storefront_request_limits (
  request_id uuid primary key,
  action text not null,
  fingerprint_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists storefront_request_limits_window_idx
  on private.storefront_request_limits(fingerprint_hash,action,created_at desc);
revoke all on private.storefront_request_limits from public,anon,authenticated,service_role;

create or replace function private.check_storefront_rate_limit(
  p_request_id uuid,
  p_action text,
  p_guest_session_id text default null
) returns void
language plpgsql
security definer
set search_path='extensions'
as $$
declare
  request_headers jsonb := coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
  actor_id uuid := (select auth.uid());
  source_value text;
  fingerprint_value text;
  recent_count integer;
  window_value interval;
  limit_value integer;
begin
  if p_request_id is null then raise exception '请求标识无效'; end if;
  if p_action not in ('checkout','order_lookup','cart_merge') then raise exception '请求类型无效'; end if;
  source_value := concat_ws('|',
    nullif(split_part(coalesce(request_headers->>'x-forwarded-for',request_headers->>'cf-connecting-ip',''),',',1),''),
    left(coalesce(request_headers->>'user-agent','unknown'),160),
    coalesce(actor_id::text,nullif(trim(p_guest_session_id),''),'guest')
  );
  fingerprint_value := encode(digest(source_value,'sha256'),'hex');
  window_value := case when p_action='checkout' then interval '10 minutes' else interval '1 minute' end;
  limit_value := case p_action when 'checkout' then 8 when 'order_lookup' then 30 else 12 end;
  delete from private.storefront_request_limits where created_at<now()-interval '24 hours';
  select count(*) into recent_count from private.storefront_request_limits
  where fingerprint_hash=fingerprint_value and action=p_action
    and created_at>now()-window_value;
  if recent_count>=limit_value then
    raise exception '操作过于频繁，请稍后再试';
  end if;
  insert into private.storefront_request_limits(request_id,action,fingerprint_hash)
  values(p_request_id,p_action,fingerprint_value)
  on conflict(request_id) do nothing;
end;
$$;
revoke all on function private.check_storefront_rate_limit(uuid,text,text)
  from public,anon,authenticated,service_role;

-- Safe, denormalized retail projections. These are the only catalogue objects
-- the standalone storefront needs to query.
create or replace function private.storefront_available_quantity(p_variant_id uuid)
returns integer
language sql
stable
security definer
set search_path=''
as $$
  select greatest(coalesce(sum(least(
    greatest(inventory.quantity_on_hand-inventory.quantity_reserved-inventory.safety_stock,0),
    inventory.online_quantity_limit
  )),0),0)::integer
  from public.inventory inventory
  where inventory.variant_id=p_variant_id
    and exists (
      select 1 from public.product_variants variant
      join public.products product on product.id=variant.product_id
      join public.product_publications publication on publication.product_id=product.id
      join public.channels channel on channel.id=publication.channel_id
      where variant.id=p_variant_id and variant.is_active and variant.is_visible_online
        and product.workflow_status='published' and product.deleted_at is null
        and publication.status='published' and channel.is_active and channel.channel_type='retail'
    );
$$;
revoke all on function private.storefront_available_quantity(uuid)
  from public,anon,authenticated,service_role;
grant execute on function private.storefront_available_quantity(uuid)
  to anon,authenticated,service_role;

create or replace view public.storefront_catalog_products
with (security_invoker=true)
as
select
  product.id,
  product.style_no,
  product.slug,
  coalesce(product.name_zh,product.name) as title,
  product.name_it,
  product.name_en,
  coalesce(product.short_description_zh,product.short_description) as short_description,
  coalesce(product.description_zh,product.description) as description,
  product.material,
  coalesce(product.washing_instructions,product.care_instructions) as care_instructions,
  product.fit,
  product.season,
  product.gender,
  product.is_new,
  product.is_featured,
  product.is_bestseller,
  category.id as category_id,
  category.slug as category_slug,
  coalesce(category.name_zh,category.name) as category_name,
  brand.name as brand_name,
  channel.id as channel_id,
  channel.code as channel_code,
  publication.published_at,
  price.currency,
  price.unit_price,
  price.compare_at_price
from public.products product
join public.product_publications publication
  on publication.product_id=product.id
 and publication.organization_id=product.organization_id
 and publication.status='published'
join public.channels channel
  on channel.id=publication.channel_id and channel.is_active and channel.channel_type='retail'
left join public.categories category on category.id=product.category_id and category.is_active
left join public.brands brand on brand.id=product.brand_id
left join lateral (
  select book.currency,item.unit_price,item.compare_at_price
  from public.price_books book
  join public.price_book_items item on item.price_book_id=book.id
  where book.organization_id=product.organization_id
    and book.channel_id=channel.id and book.is_default and book.is_active
    and item.product_id=product.id and item.variant_id is null and item.is_active
    and (item.valid_from is null or item.valid_from<=now())
    and (item.valid_until is null or item.valid_until>now())
  order by item.valid_from desc nulls last,item.created_at desc
  limit 1
) price on true
where product.deleted_at is null and product.workflow_status='published'
  and price.unit_price is not null;

create or replace view public.storefront_catalog_variants
with (security_invoker=true)
as
select
  variant.id,
  variant.product_id,
  variant.sku,
  variant.barcode,
  variant.sort_order,
  color.id as color_id,
  coalesce(color.name_zh,color.name) as color_name,
  color.name_it as color_name_it,
  color.name_en as color_name_en,
  color.hex_value,
  size.id as size_id,
  size.name as size_name,
  size.sort_order as size_sort_order,
  private.storefront_available_quantity(variant.id) as available_quantity
from public.product_variants variant
join public.colors color on color.id=variant.color_id and color.is_active
join public.sizes size on size.id=variant.size_id and size.is_active
where variant.is_active and variant.is_visible_online
  and exists (
    select 1 from public.product_publications publication
    join public.channels channel on channel.id=publication.channel_id and channel.is_active
    where publication.product_id=variant.product_id and publication.status='published'
      and channel.channel_type='retail'
  )
;

create or replace view public.storefront_catalog_media
with (security_invoker=true)
as
select
  media.id,
  media.product_id,
  media.variant_id,
  lower(media.image_type) as media_type,
  media.sort_order,
  media.is_primary,
  media.width,
  media.height,
  coalesce(media.alt_text_zh,product.name_zh,product.name) as alt_text,
  ('/api/catalog/media/'||media.id::text)::text as media_path
from public.product_images media
join public.products product on product.id=media.product_id
where media.deleted_at is null and exists (
  select 1 from public.product_publications publication
  join public.channels channel on channel.id=publication.channel_id and channel.is_active
  where publication.product_id=media.product_id and publication.status='published'
    and channel.channel_type='retail'
);

revoke all on public.storefront_catalog_products,public.storefront_catalog_variants,
  public.storefront_catalog_media from public,anon,authenticated;

-- The browser receives one deliberately narrow document instead of direct
-- table/view access. This also prevents an authenticated retail customer from
-- inheriting internal product columns such as cost prices through the generic
-- `authenticated` PostgREST role.
create or replace function private.get_storefront_catalog(
  p_slug text default null,
  p_limit integer default 200
) returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  with selected_products as (
    select product_view.*
    from public.storefront_catalog_products product_view
    where p_slug is null or product_view.slug=p_slug
    order by product_view.published_at desc
    limit greatest(1,least(coalesce(p_limit,200),200))
  )
  select jsonb_build_object(
    'products',coalesce(jsonb_agg(
      to_jsonb(product_row) ||
      jsonb_build_object(
        'variants',coalesce((
          select jsonb_agg(to_jsonb(variant_row) order by variant_row.sort_order,variant_row.size_sort_order)
          from public.storefront_catalog_variants variant_row
          where variant_row.product_id=product_row.id
        ),'[]'::jsonb),
        'media',coalesce((
          select jsonb_agg(to_jsonb(media_row) order by media_row.sort_order,media_row.id)
          from public.storefront_catalog_media media_row
          where media_row.product_id=product_row.id
        ),'[]'::jsonb)
      )
      order by product_row.published_at desc
    ),'[]'::jsonb)
  )
  from selected_products product_row;
$$;

create or replace function public.rpc_get_storefront_catalog(
  p_slug text default null,
  p_limit integer default 200
) returns jsonb
language sql
stable
security definer
set search_path=''
as $$ select private.get_storefront_catalog(p_slug,p_limit); $$;

revoke all on function private.get_storefront_catalog(text,integer)
  from public,anon,authenticated,service_role;
grant execute on function private.get_storefront_catalog(text,integer)
  to anon,authenticated,service_role;
revoke all on function public.rpc_get_storefront_catalog(text,integer)
  from public,anon,authenticated,service_role;
grant execute on function public.rpc_get_storefront_catalog(text,integer)
  to anon,authenticated,service_role;

revoke all on public.products,public.product_variants,public.product_images,
  public.product_publications,public.channels,public.price_books,
  public.price_book_items,public.inventory from anon;
drop policy if exists anon_read_published_products on public.products;
drop policy if exists anon_read_published_variants on public.product_variants;
drop policy if exists anon_read_published_images on public.product_images;
drop policy if exists anon_read_published_publications on public.product_publications;
drop policy if exists anon_read_active_channels on public.channels;
drop policy if exists anon_read_active_price_books on public.price_books;
drop policy if exists anon_read_active_price_items on public.price_book_items;
drop policy if exists anon_read_online_inventory on public.inventory;

drop policy if exists authenticated_read_products on public.products;
create policy authenticated_staff_read_products on public.products for select to authenticated
using ((select private.has_permission('products.read')));
drop policy if exists authenticated_read_variants on public.product_variants;
create policy authenticated_staff_read_variants on public.product_variants for select to authenticated
using ((select private.has_permission('products.read')));
drop policy if exists authenticated_read_images on public.product_images;
create policy authenticated_staff_read_images on public.product_images for select to authenticated
using ((select private.has_permission('products.read')));

grant select (id,name) on public.brands to anon,authenticated;
grant select (id,slug,name,name_zh,name_it,name_en,is_active)
  on public.categories to anon,authenticated;
drop policy if exists anon_read_brands on public.brands;
drop policy if exists authenticated_read_brands on public.brands;
create policy anon_read_brands on public.brands for select to anon using (true);
create policy authenticated_read_brands on public.brands for select to authenticated using (true);
revoke all on table public.inventory from anon;
drop policy if exists authenticated_read_inventory on public.inventory;
create policy authenticated_staff_read_inventory on public.inventory for select to authenticated
using ((select private.has_permission('inventory.read')));

create index if not exists products_storefront_title_trgm_idx
  on public.products using gin ((coalesce(name_zh,name,'')) extensions.gin_trgm_ops)
  where deleted_at is null;
create index if not exists products_storefront_style_trgm_idx
  on public.products using gin (style_no extensions.gin_trgm_ops)
  where deleted_at is null;
create index if not exists product_publications_public_lookup_idx
  on public.product_publications(product_id,channel_id,published_at desc)
  where status='published';

create or replace function private.create_storefront_order(
  p_items jsonb,
  p_fulfillment_method text,
  p_contact jsonb,
  p_shipping_address jsonb,
  p_customer_note text,
  p_idempotency_key text,
  p_guest_session_id text,
  p_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path='extensions'
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_customer_id uuid;
  existing_order public.orders%rowtype;
  order_id_value uuid;
  order_no_value text;
  organization_value uuid;
  channel_value uuid;
  line jsonb;
  variant_row record;
  inventory_row public.inventory%rowtype;
  order_item_id_value uuid;
  quantity_value integer;
  item_count integer;
  total_quantity integer;
  unit_value numeric(12,2);
  line_total_value numeric(12,2);
  line_tax_value numeric(12,2);
  subtotal_value numeric(12,2) := 0;
  tax_value numeric(12,2) := 0;
  fee_value numeric(12,2) := 0;
  total_value numeric(12,2) := 0;
  tax_rate_value numeric(5,2) := 22;
  shop_config jsonb := '{}'::jsonb;
  timeout_minutes integer := 30;
  free_shipping_threshold numeric(12,2) := 99;
  pending_limit integer := 3;
  pending_count integer := 0;
  expiry_value timestamptz;
  guest_hash_value text;
  lookup_token_value text;
  lookup_hash_value text;
  contact_name text := nullif(trim(coalesce(p_contact->>'full_name','')),'');
  contact_email text := lower(nullif(trim(coalesce(p_contact->>'email','')),''));
  contact_phone text := nullif(trim(coalesce(p_contact->>'phone','')),'');
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key))<16 or length(p_idempotency_key)>128 then
    raise exception '订单请求标识无效';
  end if;
  if actor_id is null then
    if p_guest_session_id is null or p_guest_session_id !~ '^[0-9a-fA-F-]{36}$' then raise exception '访客会话无效'; end if;
    guest_hash_value := encode(digest(trim(p_guest_session_id),'sha256'),'hex');
    -- Derive a stable high-entropy lookup token so a safe idempotent retry can
    -- return the same credential even when the first HTTP response was lost.
    lookup_token_value := encode(hmac(trim(p_idempotency_key),trim(p_guest_session_id),'sha256'),'hex');
    lookup_hash_value := encode(digest(lookup_token_value,'sha256'),'hex');
  else
    actor_customer_id := actor_id;
  end if;

  select * into existing_order from public.orders where idempotency_key=trim(p_idempotency_key);
  if found then
    if (actor_id is not null and existing_order.customer_id is distinct from actor_id)
       or (actor_id is null and existing_order.guest_session_hash is distinct from guest_hash_value) then
      raise exception '订单请求标识无效';
    end if;
    return jsonb_build_object(
      'order_id',existing_order.id,'order_no',existing_order.order_no,'idempotent',true,
      'subtotal',existing_order.subtotal,'shipping_fee',existing_order.shipping_fee,
      'tax_amount',existing_order.tax_amount,'total_amount',existing_order.total_amount,
      'currency',existing_order.currency,'status',existing_order.status,
      'expires_at',existing_order.expires_at,
      'lookup_token',case when actor_id is null then lookup_token_value else null end
    );
  end if;

  perform private.check_storefront_rate_limit(p_request_id,'checkout',p_guest_session_id);
  if coalesce(jsonb_typeof(p_items),'')<>'array' then raise exception '订单商品格式无效'; end if;
  item_count := jsonb_array_length(p_items);
  if item_count<1 or item_count>20 then raise exception '每笔订单须包含 1 至 20 个商品规格'; end if;
  if p_fulfillment_method not in ('DELIVERY','PICKUP') then raise exception '配送方式无效'; end if;
  if contact_name is null or contact_phone is null or contact_email is null
     or contact_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception '请填写有效的姓名、邮箱和联系电话';
  end if;
  if length(contact_name)>120 or length(contact_phone)>40 or length(contact_email)>254 then
    raise exception '联系信息长度无效';
  end if;
  if p_fulfillment_method='DELIVERY' and (
    nullif(trim(coalesce(p_shipping_address->>'country','')),'') is null or
    nullif(trim(coalesce(p_shipping_address->>'city','')),'') is null or
    nullif(trim(coalesce(p_shipping_address->>'postal_code','')),'') is null or
    nullif(trim(coalesce(p_shipping_address->>'address_line','')),'') is null
  ) then raise exception '请填写完整配送地址'; end if;
  if length(coalesce(p_customer_note,''))>500 then raise exception '订单备注不能超过 500 个字符'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) item group by item->>'variant_id' having count(*)>1) then
    raise exception '订单中存在重复商品规格';
  end if;
  if exists(select 1 from jsonb_array_elements(p_items) item where
    coalesce(item->>'variant_id','')!~'^[0-9a-fA-F-]{36}$' or
    coalesce(item->>'quantity','')!~'^[0-9]+$' or
    (item->>'quantity')::integer<1 or (item->>'quantity')::integer>10
  ) then raise exception '订单商品规格或数量无效'; end if;
  select coalesce(sum((item->>'quantity')::integer),0)::integer into total_quantity
  from jsonb_array_elements(p_items) item;
  if total_quantity<1 or total_quantity>30 then raise exception '每笔订单商品总数须在 1 至 30 件之间'; end if;

  perform private.expire_stale_orders(100);
  select coalesce(value,'{}'::jsonb) into shop_config from public.settings where key='shop';
  timeout_minutes := greatest(5,least(120,coalesce((shop_config->>'payment_timeout_minutes')::integer,30)));
  pending_limit := greatest(1,least(10,coalesce((shop_config->>'max_pending_orders_per_customer')::integer,3)));
  free_shipping_threshold := greatest(0,coalesce((shop_config->>'free_shipping_threshold')::numeric,99));
  tax_rate_value := greatest(0,least(100,coalesce((shop_config->>'tax_rate')::numeric,22)));
  expiry_value := now()+make_interval(mins=>timeout_minutes);

  if actor_id is not null then
    insert into public.customers(id,full_name,phone,email)
    select actor_id,contact_name,contact_phone,contact_email
    where exists(select 1 from auth.users where id=actor_id)
    on conflict(id) do update set full_name=excluded.full_name,phone=excluded.phone,
      email=excluded.email,updated_at=now();
    select count(*) into pending_count from public.orders
    where customer_id=actor_id and status='PENDING_PAYMENT';
    if pending_count>=pending_limit then
      raise exception '您已有待付款订单，请先完成付款或取消后再下单';
    end if;
  else
    select count(*) into pending_count from public.orders
    where guest_session_hash=guest_hash_value and status='PENDING_PAYMENT';
    if pending_count>=pending_limit then
      raise exception '当前访客会话已有待付款订单，请先完成后再下单';
    end if;
  end if;

  -- Discover the retail channel from the first requested variant. Every later
  -- line is required to resolve to the same organization and channel.
  select product.organization_id,channel.id into organization_value,channel_value
  from jsonb_array_elements(p_items) requested
  join public.product_variants variant on variant.id=(requested->>'variant_id')::uuid
  join public.products product on product.id=variant.product_id
  join public.product_publications publication on publication.product_id=product.id
    and publication.organization_id=product.organization_id and publication.status='published'
  join public.channels channel on channel.id=publication.channel_id and channel.is_active
    and channel.code='retail-web' and channel.channel_type='retail'
  where product.workflow_status='published' and product.deleted_at is null
  order by requested->>'variant_id' limit 1;
  if organization_value is null or channel_value is null then raise exception '商品未在零售网站发布'; end if;

  insert into public.orders(
    customer_id,organization_id,channel_id,subtotal,shipping_fee,discount_amount,tax_amount,total_amount,
    currency,payment_status,fulfillment_type,shipping_address,shipping_address_snapshot,
    contact_snapshot,customer_name,customer_email,customer_phone,customer_note,idempotency_key,
    guest_session_hash,lookup_token_hash,request_id,payment_adapter,expires_at
  ) values (
    actor_customer_id,organization_value,channel_value,0,0,0,0,0,
    coalesce(shop_config->>'currency','EUR'),'PENDING',p_fulfillment_method,
    case when p_fulfillment_method='DELIVERY' then p_shipping_address else null end,
    case when p_fulfillment_method='DELIVERY' then p_shipping_address else null end,
    jsonb_build_object('full_name',contact_name,'email',contact_email,'phone',contact_phone),
    contact_name,contact_email,contact_phone,nullif(trim(p_customer_note),''),trim(p_idempotency_key),
    guest_hash_value,lookup_hash_value,p_request_id,'manual',expiry_value
  ) returning id,order_no into order_id_value,order_no_value;

  for line in select value from jsonb_array_elements(p_items) order by value->>'variant_id'
  loop
    quantity_value := (line->>'quantity')::integer;
    select
      variant.id,variant.product_id,variant.sku,variant.color_id,variant.size_id,
      product.slug,coalesce(product.name_zh,product.name) as title,product.tax_rate,
      coalesce(color.name_zh,color.name) as color_name,size.name as size_name,
      price.unit_price,price.currency,
      (select media.id from public.product_images media where media.product_id=product.id
        and media.deleted_at is null order by media.is_primary desc,media.sort_order,media.created_at limit 1) as media_id
    into variant_row
    from public.product_variants variant
    join public.products product on product.id=variant.product_id and product.organization_id=organization_value
      and product.workflow_status='published' and product.deleted_at is null
    join public.colors color on color.id=variant.color_id and color.is_active
    join public.sizes size on size.id=variant.size_id and size.is_active
    join public.product_publications publication on publication.product_id=product.id
      and publication.channel_id=channel_value and publication.status='published'
    join lateral (
      select book.currency,item.unit_price
      from public.price_books book
      join public.price_book_items item on item.price_book_id=book.id
      where book.organization_id=organization_value and book.channel_id=channel_value
        and book.is_default and book.is_active and item.product_id=product.id
        and item.is_active and (item.variant_id=variant.id or item.variant_id is null)
        and (item.valid_from is null or item.valid_from<=now())
        and (item.valid_until is null or item.valid_until>now())
      order by (item.variant_id=variant.id) desc,item.valid_from desc nulls last,item.created_at desc
      limit 1
    ) price on true
    where variant.id=(line->>'variant_id')::uuid and variant.is_active and variant.is_visible_online;
    if not found then raise exception '商品规格不存在、未发布或价格已失效'; end if;

    select * into inventory_row from public.inventory inventory
    where inventory.organization_id=organization_value and inventory.variant_id=variant_row.id
      and least(
        greatest(inventory.quantity_on_hand-inventory.quantity_reserved-inventory.safety_stock,0),
        inventory.online_quantity_limit
      )>=quantity_value
    order by inventory.id limit 1 for update;
    if not found then raise exception '库存不足，请返回购物袋调整数量'; end if;

    unit_value := variant_row.unit_price;
    line_total_value := round(unit_value*quantity_value,2);
    line_tax_value := case when coalesce(variant_row.tax_rate,tax_rate_value)>0
      then round(line_total_value*coalesce(variant_row.tax_rate,tax_rate_value)/(100+coalesce(variant_row.tax_rate,tax_rate_value)),2)
      else 0 end;
    subtotal_value := subtotal_value+line_total_value;
    tax_value := tax_value+line_tax_value;

    insert into public.order_items(
      order_id,product_id,variant_id,warehouse_id,product_title,product_slug,sku,color_name,size_name,
      currency,unit_price,discount_amount,tax_amount,quantity,line_total,image_media_id
    ) values (
      order_id_value,variant_row.product_id,variant_row.id,inventory_row.warehouse_id,
      variant_row.title,variant_row.slug,variant_row.sku,variant_row.color_name,variant_row.size_name,
      variant_row.currency,unit_value,0,line_tax_value,quantity_value,line_total_value,variant_row.media_id
    ) returning id into order_item_id_value;

    update public.inventory set quantity_reserved=quantity_reserved+quantity_value
    where id=inventory_row.id
      and quantity_on_hand-quantity_reserved-safety_stock>=quantity_value;
    if not found then raise exception '库存刚刚发生变化，请重试结账'; end if;

    insert into public.stock_reservations(
      organization_id,order_id,order_item_id,inventory_id,variant_id,warehouse_id,
      quantity,status,idempotency_key,expires_at,created_by
    ) values (
      organization_value,order_id_value,order_item_id_value,inventory_row.id,variant_row.id,
      inventory_row.warehouse_id,quantity_value,'active',trim(p_idempotency_key),expiry_value,actor_id
    );
  end loop;

  fee_value := case
    when p_fulfillment_method='PICKUP' then greatest(0,coalesce((shop_config->>'pickup_fee')::numeric,0))
    when subtotal_value>=free_shipping_threshold then 0
    else greatest(0,coalesce((shop_config->>'delivery_fee')::numeric,6.90)) end;
  total_value := subtotal_value+fee_value;
  update public.orders set subtotal=subtotal_value,shipping_fee=fee_value,tax_amount=tax_value,
    total_amount=total_value where id=order_id_value returning order_no into order_no_value;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,new_data)
  values(organization_value,actor_id,'CREATE_STOREFRONT_ORDER','order',order_id_value,
    jsonb_build_object('order_no',order_no_value,'item_count',item_count,'total_quantity',total_quantity,
      'total_amount',total_value,'currency',coalesce(shop_config->>'currency','EUR'),
      'fulfillment_method',p_fulfillment_method,'guest',actor_id is null,'request_id',p_request_id));

  return jsonb_build_object(
    'order_id',order_id_value,'order_no',order_no_value,'idempotent',false,
    'subtotal',subtotal_value,'shipping_fee',fee_value,'tax_amount',tax_value,
    'total_amount',total_value,'currency',coalesce(shop_config->>'currency','EUR'),
    'status','PENDING_PAYMENT','payment_status','PENDING','payment_adapter','manual',
    'expires_at',expiry_value,'lookup_token',lookup_token_value
  );
end;
$$;

create or replace function public.rpc_create_storefront_order(
  p_items jsonb,
  p_fulfillment_method text,
  p_contact jsonb,
  p_shipping_address jsonb default null,
  p_customer_note text default null,
  p_idempotency_key text default null,
  p_guest_session_id text default null,
  p_request_id uuid default gen_random_uuid()
) returns jsonb
language sql
security invoker
set search_path=''
as $$
  select private.create_storefront_order(
    p_items,p_fulfillment_method,p_contact,p_shipping_address,p_customer_note,
    p_idempotency_key,p_guest_session_id,p_request_id
  );
$$;

revoke all on function private.create_storefront_order(jsonb,text,jsonb,jsonb,text,text,text,uuid)
  from public,anon,authenticated,service_role;
grant execute on function private.create_storefront_order(jsonb,text,jsonb,jsonb,text,text,text,uuid)
  to anon,authenticated,service_role;
revoke all on function public.rpc_create_storefront_order(jsonb,text,jsonb,jsonb,text,text,text,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.rpc_create_storefront_order(jsonb,text,jsonb,jsonb,text,text,text,uuid)
  to anon,authenticated,service_role;

create or replace function private.get_storefront_order(
  p_order_id uuid,
  p_lookup_token text default null,
  p_request_id uuid default gen_random_uuid()
) returns jsonb
language plpgsql
security definer
set search_path='extensions'
as $$
declare
  actor_id uuid := (select auth.uid());
  order_row public.orders%rowtype;
  token_hash text;
begin
  perform private.check_storefront_rate_limit(p_request_id,'order_lookup',null);
  select * into order_row from public.orders where id=p_order_id;
  if not found then raise exception '订单不存在或查询信息无效'; end if;
  if actor_id is null then
    if p_lookup_token is null then raise exception '订单不存在或查询信息无效'; end if;
    token_hash := encode(digest(trim(p_lookup_token),'sha256'),'hex');
    if order_row.lookup_token_hash is distinct from token_hash then raise exception '订单不存在或查询信息无效'; end if;
  elsif order_row.customer_id is distinct from actor_id
    and not private.has_permission('orders.read') then
    raise exception '没有查看该订单的权限';
  end if;
  return jsonb_build_object(
    'id',order_row.id,'order_no',order_row.order_no,'status',order_row.status,
    'payment_status',order_row.payment_status,'payment_adapter',order_row.payment_adapter,
    'fulfillment_method',order_row.fulfillment_type,'subtotal',order_row.subtotal,
    'shipping_fee',order_row.shipping_fee,'discount_amount',order_row.discount_amount,
    'tax_amount',order_row.tax_amount,'total_amount',order_row.total_amount,
    'currency',order_row.currency,'contact',order_row.contact_snapshot,
    'shipping_address',order_row.shipping_address_snapshot,'created_at',order_row.created_at,
    'expires_at',order_row.expires_at,
    'items',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',item.id,'product_title',item.product_title,'product_slug',item.product_slug,
      'sku',item.sku,'color_name',item.color_name,'size_name',item.size_name,
      'unit_price',item.unit_price,'quantity',item.quantity,'line_total',item.line_total,
      'currency',item.currency,'image_media_id',item.image_media_id
    ) order by item.created_at,item.id),'[]'::jsonb) from public.order_items item where item.order_id=order_row.id)
  );
end;
$$;

create or replace function public.rpc_get_storefront_order(
  p_order_id uuid,
  p_lookup_token text default null,
  p_request_id uuid default gen_random_uuid()
) returns jsonb
language sql
security invoker
set search_path=''
as $$ select private.get_storefront_order(p_order_id,p_lookup_token,p_request_id); $$;

revoke all on function private.get_storefront_order(uuid,text,uuid)
  from public,anon,authenticated,service_role;
grant execute on function private.get_storefront_order(uuid,text,uuid)
  to anon,authenticated,service_role;
revoke all on function public.rpc_get_storefront_order(uuid,text,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.rpc_get_storefront_order(uuid,text,uuid)
  to anon,authenticated,service_role;

create or replace function private.merge_customer_cart(p_items jsonb,p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  actor_id uuid := (select auth.uid());
  cart_id_value uuid;
  item jsonb;
  variant_id_value uuid;
  quantity_value integer;
  unit_value numeric(12,2);
begin
  if actor_id is null then raise exception '请先登录'; end if;
  perform private.check_storefront_rate_limit(p_request_id,'cart_merge',null);
  if coalesce(jsonb_typeof(p_items),'')<>'array' or jsonb_array_length(p_items)>20 then
    raise exception '购物袋数据无效';
  end if;
  insert into public.customers(id,email)
  select actor_id,email from auth.users where id=actor_id on conflict(id) do nothing;
  insert into public.shopping_carts(customer_id,status) values(actor_id,'ACTIVE')
  on conflict(customer_id,status) do update set updated_at=now()
  returning id into cart_id_value;
  for item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(item->>'variant_id','')!~'^[0-9a-fA-F-]{36}$'
       or coalesce(item->>'quantity','')!~'^[0-9]+$' then raise exception '购物袋数据无效'; end if;
    variant_id_value := (item->>'variant_id')::uuid;
    quantity_value := greatest(1,least(10,(item->>'quantity')::integer));
    select product_view.unit_price into unit_value
    from public.storefront_catalog_products product_view
    join public.storefront_catalog_variants variant_view on variant_view.product_id=product_view.id
    where variant_view.id=variant_id_value limit 1;
    if unit_value is null then continue; end if;
    insert into public.shopping_cart_items(cart_id,variant_id,quantity,unit_price)
    values(cart_id_value,variant_id_value,quantity_value,unit_value)
    on conflict(cart_id,variant_id) do update
      set quantity=least(10,greatest(public.shopping_cart_items.quantity,excluded.quantity)),
          unit_price=excluded.unit_price,updated_at=now();
  end loop;
  return jsonb_build_object('cart_id',cart_id_value,'merged',true);
end;
$$;

create or replace function public.rpc_merge_customer_cart(
  p_items jsonb,
  p_request_id uuid default gen_random_uuid()
) returns jsonb
language sql
security invoker
set search_path=''
as $$ select private.merge_customer_cart(p_items,p_request_id); $$;

revoke all on function private.merge_customer_cart(jsonb,uuid)
  from public,anon,authenticated,service_role;
grant execute on function private.merge_customer_cart(jsonb,uuid) to authenticated,service_role;
revoke all on function public.rpc_merge_customer_cart(jsonb,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.rpc_merge_customer_cart(jsonb,uuid) to authenticated,service_role;

-- Expiry now treats reservation rows as the source for releasing reserved
-- quantities. Existing pre-Phase-3 orders keep the order-line fallback.
create or replace function private.expire_stale_orders(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  stale_order record;
  reservation_row record;
  fallback_row record;
  expired_count integer := 0;
begin
  if p_limit is null or p_limit<1 or p_limit>500 then raise exception 'Invalid expiry batch size'; end if;
  for stale_order in
    select id,order_no from public.orders
    where status='PENDING_PAYMENT' and expires_at is not null and expires_at<=now()
    order by expires_at,id limit p_limit for update skip locked
  loop
    if exists(select 1 from public.stock_reservations where order_id=stale_order.id and status='active') then
      for reservation_row in
        select reservation.id,reservation.inventory_id,reservation.quantity
        from public.stock_reservations reservation
        join public.inventory inventory on inventory.id=reservation.inventory_id
        where reservation.order_id=stale_order.id and reservation.status='active'
        order by reservation.inventory_id for update of inventory,reservation
      loop
        update public.inventory set quantity_reserved=quantity_reserved-reservation_row.quantity
        where id=reservation_row.inventory_id and quantity_reserved>=reservation_row.quantity;
        if not found then raise exception '订单预占库存数据异常'; end if;
        update public.stock_reservations set status='expired',released_at=now()
        where id=reservation_row.id and status='active';
      end loop;
    else
      for fallback_row in
        select inventory.id,sum(item.quantity)::integer as quantity
        from public.order_items item join public.inventory inventory
          on inventory.variant_id=item.variant_id and inventory.warehouse_id=item.warehouse_id
        where item.order_id=stale_order.id group by inventory.id order by inventory.id
        for update of inventory
      loop
        update public.inventory set quantity_reserved=quantity_reserved-fallback_row.quantity
        where id=fallback_row.id and quantity_reserved>=fallback_row.quantity;
        if not found then raise exception '订单预占库存数据异常'; end if;
      end loop;
    end if;
    update public.orders set status='CANCELLED',cancelled_at=now(),expired_at=now(),expires_at=null
    where id=stale_order.id;
    insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,new_data)
    select organization_id,null,'ORDER_AUTO_EXPIRED','order',id,
      jsonb_build_object('order_no',order_no,'reason','payment_timeout')
    from public.orders where id=stale_order.id;
    expired_count := expired_count+1;
  end loop;
  return expired_count;
end;
$$;
revoke all on function private.expire_stale_orders(integer)
  from public,anon,authenticated,service_role;

alter table public.stock_reservations enable row level security;
drop policy if exists stock_reservations_customer_or_staff_select on public.stock_reservations;
create policy stock_reservations_customer_or_staff_select on public.stock_reservations
for select to authenticated using (
  exists(select 1 from public.orders where orders.id=stock_reservations.order_id
    and orders.customer_id=(select auth.uid()))
  or (select private.has_permission('orders.read'))
);

revoke all on table public.stock_reservations from public,anon,authenticated;
grant select on table public.stock_reservations to authenticated;
grant select,insert,update,delete on table public.stock_reservations to service_role;

-- Customer PII remains owner-only. No anonymous table grant is introduced;
-- guest orders are created and queried only through the narrow RPCs above.
revoke all on table public.customers,public.customer_addresses,public.shopping_carts,
  public.shopping_cart_items,public.orders,public.order_items from anon;
grant select,insert,update on table public.customers,public.customer_addresses,
  public.shopping_carts,public.shopping_cart_items to authenticated;
grant delete on table public.customer_addresses,public.shopping_cart_items to authenticated;
grant select on table public.orders,public.order_items to authenticated;

insert into public.settings(key,value)
values('shop',jsonb_build_object(
  'delivery_fee',6.90,'pickup_fee',0,'currency','EUR','tax_rate',22,
  'payment_timeout_minutes',30,'free_shipping_threshold',99,
  'max_pending_orders_per_customer',3
))
on conflict(key) do update set value=public.settings.value||excluded.value,updated_at=now();

notify pgrst,'reload schema';

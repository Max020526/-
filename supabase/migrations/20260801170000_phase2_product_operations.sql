-- NEXORA V1.0 Phase 2: product operations, channel pricing, publication
-- validation and the anonymous storefront read boundary.

alter table public.products
  add column if not exists workflow_status text not null default 'draft',
  add column if not exists short_description_zh text,
  add column if not exists short_description_it text,
  add column if not exists short_description_en text,
  add column if not exists description_zh text,
  add column if not exists description_it text,
  add column if not exists description_en text,
  add column if not exists seo_title_zh text,
  add column if not exists seo_title_it text,
  add column if not exists seo_title_en text,
  add column if not exists seo_description_zh text,
  add column if not exists seo_description_it text,
  add column if not exists seo_description_en text,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists archived_at timestamptz;

update public.products
set workflow_status = case status::text
  when 'DRAFT' then 'draft'
  when 'PENDING_DETAILS' then 'enriching'
  when 'PENDING_IMAGES' then 'enriching'
  when 'PENDING_PRICE' then 'enriching'
  when 'PENDING_REVIEW' then 'enriching'
  when 'READY_TO_PUBLISH' then 'ready'
  when 'PUBLISHED' then 'published'
  when 'SOLD_OUT' then 'published'
  when 'UNPUBLISHED' then 'ready'
  when 'ARCHIVED' then 'archived'
  else 'draft'
end,
short_description_zh = coalesce(short_description_zh, short_description, subtitle),
description_zh = coalesce(description_zh, description),
seo_title_zh = coalesce(seo_title_zh, seo_title),
seo_description_zh = coalesce(seo_description_zh, seo_description);

alter table public.products drop constraint if exists products_workflow_status_check;
alter table public.products add constraint products_workflow_status_check
  check (workflow_status in ('draft','enriching','ready','published','archived'));

create index if not exists products_workflow_updated_idx
  on public.products (organization_id, workflow_status, updated_at desc)
  where deleted_at is null;

alter table public.product_variants
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

alter table public.product_images
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists alt_text_zh text,
  add column if not exists alt_text_it text,
  add column if not exists alt_text_en text,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table public.product_images drop constraint if exists product_images_file_size_check;
alter table public.product_images add constraint product_images_file_size_check
  check (file_size_bytes is null or file_size_bytes between 1 and 10485760);
alter table public.product_images drop constraint if exists product_images_dimensions_check;
alter table public.product_images add constraint product_images_dimensions_check
  check ((width is null and height is null) or (width > 0 and height > 0));
alter table public.product_images drop constraint if exists product_images_mime_type_check;
alter table public.product_images add constraint product_images_mime_type_check
  check (mime_type is null or mime_type in ('image/jpeg','image/png','image/webp'));

create index if not exists product_images_active_sort_idx
  on public.product_images (organization_id, product_id, sort_order)
  where deleted_at is null;

alter table public.brands
  add column if not exists name_zh text,
  add column if not exists name_it text,
  add column if not exists name_en text,
  add column if not exists slug text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

update public.brands
set name_zh = coalesce(name_zh, name),
    slug = coalesce(
      slug,
      nullif(lower(trim(both '-' from regexp_replace(name, '[^A-Za-z0-9]+', '-', 'g'))), '')
    );

create unique index if not exists brands_org_slug_unique_idx
  on public.brands (organization_id, slug)
  where slug is not null;
create index if not exists brands_active_sort_idx
  on public.brands (organization_id, is_active, sort_order, name);

alter table public.sizes
  add column if not exists code text,
  add column if not exists name_zh text,
  add column if not exists name_it text,
  add column if not exists name_en text,
  add column if not exists updated_at timestamptz not null default now();

update public.sizes
set code = coalesce(
      code,
      nullif(upper(trim(both '_' from regexp_replace(normalized_name, '[^A-Za-z0-9]+', '_', 'g'))), '')
    ),
    name_zh = coalesce(name_zh, name);

create unique index if not exists sizes_org_code_unique_idx
  on public.sizes (organization_id, upper(code))
  where code is not null;

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null,
  name text not null,
  channel_type text not null check (channel_type in ('retail','pos','b2b','marketplace')),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.price_books (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  channel_id uuid not null references public.channels(id) on delete restrict,
  code text not null,
  name text not null,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  is_default boolean not null default false,
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until > valid_from),
  unique (organization_id, code)
);

create unique index if not exists price_books_default_channel_idx
  on public.price_books (organization_id, channel_id)
  where is_default and is_active;

create table if not exists public.price_book_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  price_book_id uuid not null references public.price_books(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  unit_price numeric(12,2) not null check (unit_price > 0),
  compare_at_price numeric(12,2),
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (compare_at_price is null or compare_at_price >= unit_price),
  check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create unique index if not exists price_book_items_product_unique_idx
  on public.price_book_items (price_book_id, product_id)
  where variant_id is null;
create unique index if not exists price_book_items_variant_unique_idx
  on public.price_book_items (price_book_id, variant_id)
  where variant_id is not null;
create index if not exists price_book_items_active_lookup_idx
  on public.price_book_items (organization_id, product_id, variant_id, is_active, valid_from, valid_until);

create table if not exists public.product_publications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  channel_id uuid not null references public.channels(id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft','scheduled','published','unpublished')),
  slug text not null,
  scheduled_at timestamptz,
  published_at timestamptz,
  unpublished_at timestamptz,
  last_validated_at timestamptz,
  validation_errors jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, product_id, channel_id),
  unique (organization_id, channel_id, slug)
);

create index if not exists product_publications_queue_idx
  on public.product_publications (organization_id, channel_id, status, updated_at desc);

drop trigger if exists channels_updated on public.channels;
create trigger channels_updated before update on public.channels
for each row execute function private.set_updated_at();
drop trigger if exists price_books_updated on public.price_books;
create trigger price_books_updated before update on public.price_books
for each row execute function private.set_updated_at();
drop trigger if exists price_book_items_updated on public.price_book_items;
create trigger price_book_items_updated before update on public.price_book_items
for each row execute function private.set_updated_at();
drop trigger if exists product_publications_updated on public.product_publications;
create trigger product_publications_updated before update on public.product_publications
for each row execute function private.set_updated_at();
drop trigger if exists product_images_updated on public.product_images;
create trigger product_images_updated before update on public.product_images
for each row execute function private.set_updated_at();

insert into public.channels (organization_id, code, name, channel_type, currency)
select organization.id, 'retail-web', 'NEXORA 顾客零售网站', 'retail', 'EUR'
from public.organizations organization
on conflict (organization_id, code) do update
set name = excluded.name, channel_type = excluded.channel_type, is_active = true;

insert into public.price_books (organization_id, channel_id, code, name, currency, is_default)
select channel.organization_id, channel.id, 'retail-eur', '零售网站 EUR 价目表', 'EUR', true
from public.channels channel
where channel.code = 'retail-web'
on conflict (organization_id, code) do update
set channel_id = excluded.channel_id, name = excluded.name, is_default = true, is_active = true;

insert into public.price_book_items (
  organization_id, price_book_id, product_id, unit_price, compare_at_price
)
select product.organization_id, price_book.id, product.id,
       coalesce(product.sale_price, product.promotional_price, product.retail_price),
       case
         when coalesce(product.sale_price, product.promotional_price) is not null
           and product.retail_price >= coalesce(product.sale_price, product.promotional_price)
         then product.retail_price else null
       end
from public.products product
join public.price_books price_book
  on price_book.organization_id = product.organization_id
 and price_book.code = 'retail-eur'
where coalesce(product.sale_price, product.promotional_price, product.retail_price) > 0
on conflict (price_book_id, product_id) where variant_id is null do nothing;

insert into public.product_publications (
  organization_id, product_id, channel_id, status, slug,
  published_at, validation_errors, created_at, updated_at
)
select product.organization_id, product.id, channel.id,
       case listing.listing_status
         when 'PUBLISHED' then 'published'
         when 'UNPUBLISHED' then 'unpublished'
         else 'draft'
       end,
       listing.slug, listing.published_at, '[]'::jsonb,
       listing.created_at, listing.updated_at
from public.online_listings listing
join public.products product on product.id = listing.product_id
join public.channels channel
  on channel.organization_id = product.organization_id
 and channel.code = 'retail-web'
on conflict (organization_id, product_id, channel_id) do nothing;

insert into public.permissions (code, module, action, description)
values
  ('prices.manage','prices','manage','管理渠道价目表与商品价格'),
  ('channels.manage','channels','manage','管理销售渠道'),
  ('products.archive','products','archive','归档和恢复商品')
on conflict (code) do update set
  module = excluded.module, action = excluded.action, description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.code in (
  'prices.manage','channels.manage','products.archive'
)
where role.code in ('owner','system_admin')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.code in (
  'prices.manage','products.archive'
)
where role.code = 'product_operator'
on conflict do nothing;

do $$
declare table_name_value text;
begin
  foreach table_name_value in array array[
    'channels','price_books','price_book_items','product_publications'
  ] loop
    execute format('alter table public.%I enable row level security', table_name_value);
    execute format('drop policy if exists organization_isolation_%1$s on public.%1$I', table_name_value);
    execute format(
      'create policy organization_isolation_%1$s on public.%1$I as restrictive for all to authenticated using (organization_id = (select private.current_organization_id())) with check (organization_id = (select private.current_organization_id()))',
      table_name_value
    );
    execute format('drop policy if exists internal_read_%1$s on public.%1$I', table_name_value);
    execute format(
      'create policy internal_read_%1$s on public.%1$I for select to authenticated using ((select private.has_permission(''products.read'')))',
      table_name_value
    );
  end loop;
end;
$$;

-- The browser cannot mutate catalog facts directly. Product operations use
-- narrow RPCs below; inventory remains owned exclusively by inventory RPCs.
revoke insert, update, delete, truncate on public.products,
  public.product_variants, public.product_images, public.channels,
  public.price_books, public.price_book_items, public.product_publications
from anon, authenticated;

grant select on public.channels, public.price_books, public.price_book_items,
  public.product_publications to authenticated;

notify pgrst, 'reload schema';

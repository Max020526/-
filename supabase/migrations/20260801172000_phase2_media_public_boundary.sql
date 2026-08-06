-- NEXORA V1 Phase 2: controlled product media and storefront-safe read models.

drop index if exists public.product_single_primary_image;
create unique index product_single_primary_image
  on public.product_images(product_id)
  where is_primary and deleted_at is null;

create or replace function private.register_product_media(
  p_product_id uuid,
  p_variant_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_file_size bigint,
  p_width integer default null,
  p_height integer default null,
  p_media_type text default 'DETAIL',
  p_alt_text_zh text default null,
  p_alt_text_it text default null,
  p_alt_text_en text default null,
  p_is_primary boolean default false
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  organization_value uuid := private.current_organization_id();
  media_id uuid;
  sort_value integer;
  make_primary boolean;
begin
  if actor_id is null or organization_value is null
     or not private.has_permission('media.manage') then
    raise exception '当前账号没有商品图片管理权限';
  end if;
  if not exists (
    select 1 from public.products
    where id = p_product_id and organization_id = organization_value and deleted_at is null
  ) then raise exception '商品不存在或不属于当前组织'; end if;
  if p_variant_id is not null and not exists (
    select 1 from public.product_variants
    where id = p_variant_id and product_id = p_product_id
      and organization_id = organization_value
  ) then raise exception '商品规格不存在或不属于该商品'; end if;
  if p_storage_path is null
     or p_storage_path !~ ('^' || organization_value::text || '/products/' || p_product_id::text || '/[A-Za-z0-9._/-]+$') then
    raise exception '图片存储路径无效';
  end if;
  if p_mime_type not in ('image/jpeg','image/png','image/webp') then
    raise exception '图片仅支持 JPG、PNG 或 WEBP';
  end if;
  if p_file_size is null or p_file_size < 1 or p_file_size > 10485760 then
    raise exception '单张图片必须小于 10MB';
  end if;
  if p_media_type not in ('MAIN','DETAIL','VARIANT') then
    raise exception '图片类型无效';
  end if;
  if (select count(*) from public.product_images
      where organization_id = organization_value and product_id = p_product_id
        and deleted_at is null) >= 20 then
    raise exception '每个商品最多保留 20 张有效图片';
  end if;

  select coalesce(max(sort_order), -1) + 1 into sort_value
  from public.product_images
  where organization_id = organization_value and product_id = p_product_id
    and deleted_at is null;
  make_primary := p_is_primary or not exists (
    select 1 from public.product_images
    where organization_id = organization_value and product_id = p_product_id
      and is_primary and deleted_at is null
  );
  if make_primary then
    update public.product_images set is_primary = false, updated_by = actor_id, updated_at = now()
    where organization_id = organization_value and product_id = p_product_id
      and is_primary and deleted_at is null;
  end if;

  insert into public.product_images (
    organization_id, product_id, variant_id, file_path, public_url,
    image_type, sort_order, is_primary, mime_type, file_size_bytes, width, height,
    alt_text_zh, alt_text_it, alt_text_en, created_by, updated_by
  ) values (
    organization_value, p_product_id, p_variant_id, p_storage_path, '',
    case when make_primary then 'MAIN' else p_media_type end, sort_value, make_primary,
    p_mime_type, p_file_size, p_width, p_height,
    nullif(trim(p_alt_text_zh),''), nullif(trim(p_alt_text_it),''),
    nullif(trim(p_alt_text_en),''), actor_id, actor_id
  ) returning id into media_id;

  insert into public.audit_logs (
    organization_id,user_id,action,entity_type,entity_id,new_data
  ) values (
    organization_value,actor_id,'REGISTER_PRODUCT_MEDIA','product_media',media_id,
    jsonb_build_object('product_id',p_product_id,'storage_path',p_storage_path,'is_primary',make_primary)
  );
  return media_id;
end;
$$;

create or replace function public.rpc_register_product_media(
  p_product_id uuid,
  p_variant_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_file_size bigint,
  p_width integer default null,
  p_height integer default null,
  p_media_type text default 'DETAIL',
  p_alt_text_zh text default null,
  p_alt_text_it text default null,
  p_alt_text_en text default null,
  p_is_primary boolean default false
) returns uuid language sql security invoker set search_path = ''
as $$
  select private.register_product_media(
    p_product_id,p_variant_id,p_storage_path,p_mime_type,p_file_size,p_width,p_height,
    p_media_type,p_alt_text_zh,p_alt_text_it,p_alt_text_en,p_is_primary
  );
$$;

create or replace function private.soft_delete_product_media(
  p_product_id uuid,
  p_media_id uuid
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  organization_value uuid := private.current_organization_id();
  media_value public.product_images%rowtype;
  replacement_id uuid;
begin
  if actor_id is null or organization_value is null
     or not private.has_permission('media.manage') then
    raise exception '当前账号没有商品图片管理权限';
  end if;
  select * into media_value from public.product_images
  where id = p_media_id and product_id = p_product_id
    and organization_id = organization_value and deleted_at is null
  for update;
  if not found then raise exception '商品图片不存在'; end if;

  update public.product_images set deleted_at = now(), is_primary = false,
    updated_by = actor_id, updated_at = now()
  where id = p_media_id;
  if media_value.is_primary then
    select id into replacement_id from public.product_images
    where product_id = p_product_id and organization_id = organization_value
      and deleted_at is null
    order by sort_order, created_at limit 1 for update;
    if replacement_id is not null then
      update public.product_images set is_primary = true, image_type = 'MAIN',
        updated_by = actor_id, updated_at = now()
      where id = replacement_id;
    end if;
  end if;
  insert into public.audit_logs (
    organization_id,user_id,action,entity_type,entity_id,old_data,new_data
  ) values (
    organization_value,actor_id,'SOFT_DELETE_PRODUCT_MEDIA','product_media',p_media_id,
    jsonb_build_object('storage_path',media_value.file_path,'is_primary',media_value.is_primary),
    jsonb_build_object('deleted_at',now())
  );
  return media_value.file_path;
end;
$$;

create or replace function public.rpc_soft_delete_product_media(
  p_product_id uuid,
  p_media_id uuid
) returns text language sql security invoker set search_path = ''
as $$ select private.soft_delete_product_media(p_product_id,p_media_id); $$;

-- Keep the existing move/primary UI contract but enforce the Phase 2 permission,
-- organization boundary and soft-delete semantics.
create or replace function private.manage_product_image(
  p_product_id uuid,
  p_image_id uuid,
  p_action text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  organization_value uuid := private.current_organization_id();
  image_value public.product_images%rowtype;
  neighbor_value public.product_images%rowtype;
begin
  if actor_id is null or organization_value is null
     or not private.has_permission('media.manage') then
    raise exception '当前账号没有商品图片管理权限';
  end if;
  if p_action not in ('set_primary','move_up','move_down') then
    raise exception '图片操作无效';
  end if;
  select * into image_value from public.product_images
  where id = p_image_id and product_id = p_product_id
    and organization_id = organization_value and deleted_at is null
  for update;
  if not found then raise exception '商品图片不存在'; end if;

  if p_action = 'set_primary' then
    update public.product_images set is_primary = false, updated_by = actor_id, updated_at = now()
    where product_id = p_product_id and organization_id = organization_value
      and is_primary and deleted_at is null;
    update public.product_images set is_primary = true, image_type = 'MAIN',
      updated_by = actor_id, updated_at = now()
    where id = image_value.id;
  else
    select * into neighbor_value from public.product_images
    where product_id = p_product_id and organization_id = organization_value
      and deleted_at is null and id <> image_value.id
      and ((p_action = 'move_up' and sort_order < image_value.sort_order)
        or (p_action = 'move_down' and sort_order > image_value.sort_order))
    order by
      case when p_action = 'move_up' then sort_order end desc,
      case when p_action = 'move_down' then sort_order end asc
    limit 1 for update;
    if found then
      update public.product_images set sort_order = neighbor_value.sort_order,
        updated_by = actor_id, updated_at = now() where id = image_value.id;
      update public.product_images set sort_order = image_value.sort_order,
        updated_by = actor_id, updated_at = now() where id = neighbor_value.id;
    end if;
  end if;
  insert into public.audit_logs (
    organization_id,user_id,action,entity_type,entity_id,new_data
  ) values (
    organization_value,actor_id,'MANAGE_PRODUCT_MEDIA','product_media',p_image_id,
    jsonb_build_object('product_id',p_product_id,'action',p_action)
  );
  return jsonb_build_object('ok',true);
end;
$$;

revoke all on function private.register_product_media(uuid,uuid,text,text,bigint,integer,integer,text,text,text,text,boolean) from public,anon;
revoke all on function private.soft_delete_product_media(uuid,uuid) from public,anon;
revoke all on function private.manage_product_image(uuid,uuid,text) from public,anon;
revoke all on function public.rpc_register_product_media(uuid,uuid,text,text,bigint,integer,integer,text,text,text,text,boolean) from public,anon;
revoke all on function public.rpc_soft_delete_product_media(uuid,uuid) from public,anon;
revoke all on function public.manage_product_image(uuid,uuid,text) from public,anon;
grant execute on function private.register_product_media(uuid,uuid,text,text,bigint,integer,integer,text,text,text,text,boolean) to authenticated;
grant execute on function private.soft_delete_product_media(uuid,uuid) to authenticated;
grant execute on function private.manage_product_image(uuid,uuid,text) to authenticated;
grant execute on function public.rpc_register_product_media(uuid,uuid,text,text,bigint,integer,integer,text,text,text,text,boolean) to authenticated;
grant execute on function public.rpc_soft_delete_product_media(uuid,uuid) to authenticated;
grant execute on function public.manage_product_image(uuid,uuid,text) to authenticated;

-- Anonymous storefront access is a minimal, channel-aware projection. Cost,
-- supplier, audit, private file paths and unpublished rows are never selected.
create or replace view public.storefront_products
with (security_invoker = true)
as
select
  product.id,
  product.style_no,
  product.slug,
  product.name_zh,
  product.name_it,
  product.name_en,
  product.short_description_zh,
  product.short_description_it,
  product.short_description_en,
  product.description_zh,
  product.description_it,
  product.description_en,
  product.category_id,
  product.brand_id,
  product.season,
  product.gender,
  product.is_new,
  product.is_featured,
  product.is_bestseller,
  publication.channel_id,
  publication.published_at,
  price.currency,
  price.unit_price,
  price.compare_at_price
from public.products product
join public.product_publications publication
  on publication.product_id = product.id
 and publication.organization_id = product.organization_id
 and publication.status = 'published'
join public.channels channel
  on channel.id = publication.channel_id and channel.is_active
left join lateral (
  select book.currency,item.unit_price,item.compare_at_price
  from public.price_books book
  join public.price_book_items item on item.price_book_id = book.id
  where book.organization_id = product.organization_id
    and book.channel_id = channel.id and book.is_default and book.is_active
    and item.product_id = product.id and item.variant_id is null and item.is_active
    and (item.valid_from is null or item.valid_from <= now())
    and (item.valid_until is null or item.valid_until > now())
  limit 1
) price on true
where product.deleted_at is null and product.workflow_status = 'published';

create or replace view public.storefront_product_variants
with (security_invoker = true)
as
select
  variant.id,
  variant.product_id,
  variant.color_id,
  variant.size_id,
  variant.sku,
  variant.barcode,
  variant.sort_order
from public.product_variants variant
where variant.is_active and variant.is_visible_online
  and exists (
    select 1 from public.product_publications publication
    join public.channels channel on channel.id = publication.channel_id and channel.is_active
    where publication.product_id = variant.product_id and publication.status = 'published'
  );

create or replace view public.storefront_product_media
with (security_invoker = true)
as
select
  media.id,
  media.product_id,
  media.variant_id,
  media.image_type as media_type,
  media.sort_order,
  media.is_primary,
  media.width,
  media.height,
  media.alt_text_zh,
  media.alt_text_it,
  media.alt_text_en,
  ('/api/catalog/media/' || media.id::text)::text as media_url
from public.product_images media
where media.deleted_at is null
  and exists (
    select 1 from public.product_publications publication
    join public.channels channel on channel.id = publication.channel_id and channel.is_active
    where publication.product_id = media.product_id and publication.status = 'published'
  );

drop policy if exists anon_read_published_products on public.products;
drop policy if exists anon_read_published_variants on public.product_variants;
drop policy if exists anon_read_published_images on public.product_images;
create policy anon_read_published_products on public.products for select to anon
using (workflow_status = 'published' and deleted_at is null and exists (
  select 1 from public.product_publications publication
  join public.channels channel on channel.id = publication.channel_id and channel.is_active
  where publication.product_id = products.id and publication.status = 'published'
));
create policy anon_read_published_variants on public.product_variants for select to anon
using (is_active and is_visible_online and exists (
  select 1 from public.product_publications publication
  join public.channels channel on channel.id = publication.channel_id and channel.is_active
  where publication.product_id = product_variants.product_id and publication.status = 'published'
));
create policy anon_read_published_images on public.product_images for select to anon
using (deleted_at is null and exists (
  select 1 from public.product_publications publication
  join public.channels channel on channel.id = publication.channel_id and channel.is_active
  where publication.product_id = product_images.product_id and publication.status = 'published'
));
drop policy if exists anon_read_published_publications on public.product_publications;
drop policy if exists anon_read_active_channels on public.channels;
drop policy if exists anon_read_active_price_books on public.price_books;
drop policy if exists anon_read_active_price_items on public.price_book_items;
create policy anon_read_published_publications on public.product_publications for select to anon
using (status = 'published' and exists (
  select 1 from public.channels channel
  where channel.id = product_publications.channel_id and channel.is_active
));
create policy anon_read_active_channels on public.channels for select to anon
using (is_active);
create policy anon_read_active_price_books on public.price_books for select to anon
using (is_active and exists (
  select 1 from public.channels channel
  where channel.id = price_books.channel_id and channel.is_active
));
create policy anon_read_active_price_items on public.price_book_items for select to anon
using (is_active
  and (valid_from is null or valid_from <= now())
  and (valid_until is null or valid_until > now())
  and exists (
    select 1 from public.product_publications publication
    where publication.product_id = price_book_items.product_id
      and publication.status = 'published'
  )
);

revoke all on public.storefront_products, public.storefront_product_variants,
  public.storefront_product_media from public,anon,authenticated;
grant select on public.storefront_products, public.storefront_product_variants,
  public.storefront_product_media to anon,authenticated;

revoke all on table public.products, public.product_variants, public.product_images,
  public.product_publications, public.channels, public.price_books,
  public.price_book_items from anon;
grant select (
  id,organization_id,style_no,slug,name_zh,name_it,name_en,
  short_description_zh,short_description_it,short_description_en,
  description_zh,description_it,description_en,category_id,brand_id,season,gender,
  is_new,is_featured,is_bestseller,workflow_status,deleted_at
) on public.products to anon;
grant select (
  id,organization_id,product_id,color_id,size_id,sku,barcode,is_active,
  is_visible_online,sort_order
) on public.product_variants to anon;
grant select (
  id,organization_id,product_id,variant_id,image_type,sort_order,is_primary,
  width,height,alt_text_zh,alt_text_it,alt_text_en,deleted_at
) on public.product_images to anon;
grant select (id,organization_id,product_id,channel_id,status,published_at)
  on public.product_publications to anon;
grant select (id,organization_id,code,channel_type,currency,is_active)
  on public.channels to anon;
grant select (id,organization_id,channel_id,currency,is_default,is_active)
  on public.price_books to anon;
grant select (
  id,organization_id,price_book_id,product_id,variant_id,unit_price,
  compare_at_price,is_active,valid_from,valid_until
) on public.price_book_items to anon;

notify pgrst, 'reload schema';

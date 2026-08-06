-- Repair media registration for schemas where storage_path is generated from
-- file_path and therefore cannot be supplied explicitly.
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

revoke all on function private.register_product_media(uuid,uuid,text,text,bigint,integer,integer,text,text,text,text,boolean)
  from public, anon;
grant execute on function private.register_product_media(uuid,uuid,text,text,bigint,integer,integer,text,text,text,text,boolean)
  to authenticated;

notify pgrst, 'reload schema';

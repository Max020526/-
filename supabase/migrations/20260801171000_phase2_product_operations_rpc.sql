-- Controlled Phase 2 product operations. These functions never update
-- inventory balances or immutable inventory movements.

create or replace function private.create_product_draft(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  actor_id uuid := (select auth.uid());
  organization_value uuid := private.current_organization_id();
  product_id_value uuid;
  model_value text := upper(regexp_replace(trim(coalesce(p_payload->>'model_code','')), '\s+', '', 'g'));
  category_value uuid := nullif(p_payload->>'category_id','')::uuid;
  brand_value uuid := nullif(p_payload->>'brand_id','')::uuid;
  supplier_value uuid := nullif(p_payload->>'supplier_id','')::uuid;
begin
  if actor_id is null or organization_value is null
     or not private.has_permission('products.manage') then
    raise exception '当前账号没有创建商品草稿的权限';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception '商品资料格式无效';
  end if;
  if model_value !~ '^[A-Z0-9_-]{2,50}$' then
    raise exception '商品型号只能包含字母、数字、短横线和下划线';
  end if;
  if category_value is not null and not exists (
    select 1 from public.categories
    where id = category_value and organization_id = organization_value and is_active
  ) then raise exception '商品分类无效'; end if;
  if brand_value is not null and not exists (
    select 1 from public.brands
    where id = brand_value and organization_id = organization_value and is_active
  ) then raise exception '商品品牌无效'; end if;
  if supplier_value is not null and not exists (
    select 1 from public.suppliers
    where id = supplier_value and organization_id = organization_value and is_active
  ) then raise exception '供应商无效'; end if;

  insert into public.products (
    organization_id, style_no, model_number, name, name_zh, name_it, name_en,
    category_id, brand_id, supplier_id, season, year, gender, material,
    workflow_status, status, created_by, updated_by
  ) values (
    organization_value, model_value, model_value,
    nullif(trim(p_payload->>'name_zh'),''), nullif(trim(p_payload->>'name_zh'),''),
    nullif(trim(p_payload->>'name_it'),''), nullif(trim(p_payload->>'name_en'),''),
    category_value, brand_value, supplier_value,
    nullif(trim(p_payload->>'season'),''), nullif(p_payload->>'year','')::integer,
    nullif(trim(p_payload->>'gender'),''), nullif(trim(p_payload->>'material'),''),
    'draft', 'PENDING_DETAILS', actor_id, actor_id
  ) returning id into product_id_value;

  insert into public.audit_logs (
    organization_id, user_id, action, entity_type, entity_id, new_data
  ) values (
    organization_value, actor_id, 'CREATE_PRODUCT_DRAFT', 'product', product_id_value,
    jsonb_build_object('model_code',model_value,'source','product_operations')
  );

  return jsonb_build_object('ok',true,'product_id',product_id_value);
end;
$$;

create or replace function public.rpc_create_product_draft(p_payload jsonb)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.create_product_draft(p_payload); $$;

create or replace function private.save_product_operations(
  p_product_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  actor_id uuid := (select auth.uid());
  organization_value uuid := private.current_organization_id();
  product_value public.products%rowtype;
  category_value uuid := nullif(p_payload->>'category_id','')::uuid;
  brand_value uuid := nullif(p_payload->>'brand_id','')::uuid;
  supplier_value uuid := nullif(p_payload->>'supplier_id','')::uuid;
  slug_value text := lower(nullif(trim(p_payload->>'slug'),''));
  before_value jsonb;
begin
  if actor_id is null or organization_value is null
     or not private.has_permission('products.manage') then
    raise exception '当前账号没有编辑商品资料的权限';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then raise exception '商品资料格式无效'; end if;

  select * into product_value
  from public.products
  where id = p_product_id and organization_id = organization_value and deleted_at is null
  for update;
  if not found then raise exception '商品不存在或不属于当前组织'; end if;
  if product_value.workflow_status = 'archived' then
    raise exception '已归档商品需要先恢复后才能编辑';
  end if;
  if slug_value is not null and slug_value !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'URL Slug 只能包含小写字母、数字和单个短横线';
  end if;
  if category_value is not null and not exists (
    select 1 from public.categories
    where id = category_value and organization_id = organization_value and is_active
  ) then raise exception '商品分类无效'; end if;
  if brand_value is not null and not exists (
    select 1 from public.brands
    where id = brand_value and organization_id = organization_value and is_active
  ) then raise exception '商品品牌无效'; end if;
  if supplier_value is not null and not exists (
    select 1 from public.suppliers
    where id = supplier_value and organization_id = organization_value and is_active
  ) then raise exception '供应商无效'; end if;

  before_value := jsonb_build_object(
    'name_zh',product_value.name_zh,'category_id',product_value.category_id,
    'brand_id',product_value.brand_id,'workflow_status',product_value.workflow_status,
    'slug',product_value.slug
  );

  update public.products set
    name = nullif(trim(p_payload->>'name_zh'),''),
    name_zh = nullif(trim(p_payload->>'name_zh'),''),
    name_it = nullif(trim(p_payload->>'name_it'),''),
    name_en = nullif(trim(p_payload->>'name_en'),''),
    internal_name = nullif(trim(p_payload->>'internal_name'),''),
    category_id = category_value,
    subcategory_id = nullif(p_payload->>'subcategory_id','')::uuid,
    brand_id = brand_value,
    supplier_id = supplier_value,
    season = nullif(trim(p_payload->>'season'),''),
    year = nullif(p_payload->>'year','')::integer,
    gender = nullif(trim(p_payload->>'gender'),''),
    material = nullif(trim(p_payload->>'material'),''),
    fit = nullif(trim(p_payload->>'fit'),''),
    thickness = nullif(trim(p_payload->>'thickness'),''),
    elasticity = nullif(trim(p_payload->>'elasticity'),''),
    origin = nullif(trim(p_payload->>'origin_country'),''),
    origin_country = nullif(trim(p_payload->>'origin_country'),''),
    care_instructions = nullif(trim(p_payload->>'washing_instructions'),''),
    washing_instructions = nullif(trim(p_payload->>'washing_instructions'),''),
    short_description = nullif(trim(p_payload->>'short_description_zh'),''),
    short_description_zh = nullif(trim(p_payload->>'short_description_zh'),''),
    short_description_it = nullif(trim(p_payload->>'short_description_it'),''),
    short_description_en = nullif(trim(p_payload->>'short_description_en'),''),
    description = nullif(trim(p_payload->>'description_zh'),''),
    description_zh = nullif(trim(p_payload->>'description_zh'),''),
    description_it = nullif(trim(p_payload->>'description_it'),''),
    description_en = nullif(trim(p_payload->>'description_en'),''),
    slug = slug_value,
    seo_title = nullif(trim(p_payload->>'seo_title_zh'),''),
    seo_title_zh = nullif(trim(p_payload->>'seo_title_zh'),''),
    seo_title_it = nullif(trim(p_payload->>'seo_title_it'),''),
    seo_title_en = nullif(trim(p_payload->>'seo_title_en'),''),
    seo_description = nullif(trim(p_payload->>'seo_description_zh'),''),
    seo_description_zh = nullif(trim(p_payload->>'seo_description_zh'),''),
    seo_description_it = nullif(trim(p_payload->>'seo_description_it'),''),
    seo_description_en = nullif(trim(p_payload->>'seo_description_en'),''),
    is_new = coalesce((p_payload->>'is_new')::boolean,is_new),
    is_featured = coalesce((p_payload->>'is_featured')::boolean,is_featured),
    is_bestseller = coalesce((p_payload->>'is_bestseller')::boolean,is_bestseller),
    internal_notes = nullif(trim(p_payload->>'internal_notes'),''),
    workflow_status = case when workflow_status = 'published' then workflow_status else 'enriching' end,
    status = case when status = 'PUBLISHED' then status else 'PENDING_REVIEW' end,
    updated_by = actor_id,
    updated_at = now()
  where id = product_value.id;

  insert into public.audit_logs (
    organization_id,user_id,action,entity_type,entity_id,old_data,new_data
  ) values (
    organization_value,actor_id,'UPDATE_PRODUCT_OPERATIONS','product',product_value.id,
    before_value,
    jsonb_build_object(
      'name_zh',nullif(trim(p_payload->>'name_zh'),''),
      'category_id',category_value,'brand_id',brand_value,'slug',slug_value,
      'source','product_operations'
    )
  );

  return jsonb_build_object('ok',true,'product_id',product_value.id);
end;
$$;

create or replace function public.rpc_save_product_operations(
  p_product_id uuid,
  p_payload jsonb
) returns jsonb language sql security invoker set search_path = ''
as $$ select private.save_product_operations(p_product_id,p_payload); $$;

create or replace function private.upsert_product_variant(
  p_product_id uuid,
  p_variant_id uuid,
  p_color_id uuid,
  p_size_id uuid,
  p_sku text,
  p_barcode text,
  p_is_active boolean,
  p_is_visible_online boolean,
  p_sort_order integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  organization_value uuid := private.current_organization_id();
  variant_id_value uuid := p_variant_id;
  sku_value text := upper(regexp_replace(trim(coalesce(p_sku,'')), '\s+', '', 'g'));
begin
  if actor_id is null or organization_value is null
     or not private.has_permission('products.manage') then
    raise exception '当前账号没有编辑 SKU 的权限';
  end if;
  if sku_value !~ '^[A-Z0-9_-]{2,100}$' then raise exception 'SKU 格式无效'; end if;
  if not exists (
    select 1 from public.products
    where id = p_product_id and organization_id = organization_value
      and deleted_at is null and workflow_status <> 'archived'
  ) then raise exception '商品不存在或已经归档'; end if;
  if not exists (
    select 1 from public.colors
    where id = p_color_id and organization_id = organization_value and is_active
  ) then raise exception '颜色无效或已停用'; end if;
  if not exists (
    select 1 from public.sizes
    where id = p_size_id and organization_id = organization_value and is_active
  ) then raise exception '尺码无效或已停用'; end if;

  if variant_id_value is null then
    insert into public.product_variants (
      organization_id,product_id,color_id,size_id,sku,barcode,is_active,
      is_visible_online,sort_order,updated_by
    ) values (
      organization_value,p_product_id,p_color_id,p_size_id,sku_value,
      nullif(trim(p_barcode),''),coalesce(p_is_active,true),
      coalesce(p_is_visible_online,false),greatest(coalesce(p_sort_order,0),0),actor_id
    ) returning id into variant_id_value;
  else
    if not exists (
      select 1 from public.product_variants
      where id = variant_id_value and product_id = p_product_id
        and organization_id = organization_value
    ) then raise exception 'SKU 不存在或不属于当前商品'; end if;

    if coalesce(p_is_active,false) = false and exists (
      select 1 from public.products product
      where product.id = p_product_id and product.workflow_status = 'published'
        and 1 >= (
          select count(*) from public.product_variants active_variant
          where active_variant.product_id = p_product_id
            and active_variant.is_active and active_variant.is_visible_online
        )
    ) then raise exception '已发布商品必须保留至少一个可售 SKU'; end if;

    update public.product_variants set
      color_id = p_color_id,
      size_id = p_size_id,
      sku = sku_value,
      barcode = nullif(trim(p_barcode),''),
      is_active = coalesce(p_is_active,true),
      is_visible_online = coalesce(p_is_visible_online,false),
      sort_order = greatest(coalesce(p_sort_order,0),0),
      updated_by = actor_id,
      updated_at = now()
    where id = variant_id_value;
  end if;

  insert into public.audit_logs (
    organization_id,user_id,action,entity_type,entity_id,new_data
  ) values (
    organization_value,actor_id,'UPSERT_PRODUCT_VARIANT','product_variant',variant_id_value,
    jsonb_build_object('product_id',p_product_id,'sku',sku_value,'visible',p_is_visible_online)
  );
  return jsonb_build_object('ok',true,'variant_id',variant_id_value,'sku',sku_value);
end;
$$;

create or replace function public.rpc_upsert_product_variant(
  p_product_id uuid,
  p_variant_id uuid default null,
  p_color_id uuid default null,
  p_size_id uuid default null,
  p_sku text default null,
  p_barcode text default null,
  p_is_active boolean default true,
  p_is_visible_online boolean default false,
  p_sort_order integer default 0
) returns jsonb language sql security invoker set search_path = ''
as $$
  select private.upsert_product_variant(
    p_product_id,p_variant_id,p_color_id,p_size_id,p_sku,p_barcode,
    p_is_active,p_is_visible_online,p_sort_order
  );
$$;

create or replace function private.set_product_channel_price(
  p_product_id uuid,
  p_channel_id uuid,
  p_variant_id uuid,
  p_unit_price numeric,
  p_compare_at_price numeric,
  p_valid_from timestamptz,
  p_valid_until timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  organization_value uuid := private.current_organization_id();
  price_book_value uuid;
  price_item_value uuid;
  channel_code_value text;
begin
  if actor_id is null or organization_value is null
     or not private.has_permission('prices.manage') then
    raise exception '当前账号没有管理渠道价格的权限';
  end if;
  if p_unit_price is null or p_unit_price <= 0 then raise exception '销售价格必须大于 0'; end if;
  if p_compare_at_price is not null and p_compare_at_price < p_unit_price then
    raise exception '对比价不能低于销售价格';
  end if;
  if p_valid_until is not null and p_valid_from is not null and p_valid_until <= p_valid_from then
    raise exception '价格结束时间必须晚于开始时间';
  end if;
  if not exists (
    select 1 from public.products
    where id = p_product_id and organization_id = organization_value and deleted_at is null
  ) then raise exception '商品不存在或不属于当前组织'; end if;
  if p_variant_id is not null and not exists (
    select 1 from public.product_variants
    where id = p_variant_id and product_id = p_product_id
      and organization_id = organization_value
  ) then raise exception 'SKU 不属于当前商品'; end if;

  select price_book.id, channel.code
  into price_book_value, channel_code_value
  from public.price_books price_book
  join public.channels channel on channel.id = price_book.channel_id
  where price_book.organization_id = organization_value
    and price_book.channel_id = p_channel_id
    and price_book.is_default and price_book.is_active and channel.is_active
  for update of price_book;
  if not found then raise exception '当前渠道没有启用的默认价目表'; end if;

  if p_variant_id is null then
    insert into public.price_book_items (
      organization_id,price_book_id,product_id,variant_id,unit_price,
      compare_at_price,valid_from,valid_until,created_by,updated_by
    ) values (
      organization_value,price_book_value,p_product_id,null,p_unit_price,
      p_compare_at_price,p_valid_from,p_valid_until,actor_id,actor_id
    )
    on conflict (price_book_id,product_id) where variant_id is null
    do update set unit_price=excluded.unit_price,compare_at_price=excluded.compare_at_price,
      valid_from=excluded.valid_from,valid_until=excluded.valid_until,is_active=true,
      updated_by=actor_id,updated_at=now()
    returning id into price_item_value;
  else
    insert into public.price_book_items (
      organization_id,price_book_id,product_id,variant_id,unit_price,
      compare_at_price,valid_from,valid_until,created_by,updated_by
    ) values (
      organization_value,price_book_value,p_product_id,p_variant_id,p_unit_price,
      p_compare_at_price,p_valid_from,p_valid_until,actor_id,actor_id
    )
    on conflict (price_book_id,variant_id) where variant_id is not null
    do update set unit_price=excluded.unit_price,compare_at_price=excluded.compare_at_price,
      valid_from=excluded.valid_from,valid_until=excluded.valid_until,is_active=true,
      updated_by=actor_id,updated_at=now()
    returning id into price_item_value;
  end if;

  if channel_code_value = 'retail-web' and p_variant_id is null then
    update public.products set
      retail_price = coalesce(p_compare_at_price,p_unit_price),
      sale_price = case when p_compare_at_price is not null then p_unit_price else null end,
      promotional_price = case when p_compare_at_price is not null then p_unit_price else null end,
      updated_by = actor_id, updated_at = now()
    where id = p_product_id;
  end if;

  insert into public.audit_logs (
    organization_id,user_id,action,entity_type,entity_id,new_data
  ) values (
    organization_value,actor_id,'SET_CHANNEL_PRICE','price_book_item',price_item_value,
    jsonb_build_object('product_id',p_product_id,'variant_id',p_variant_id,
      'channel_id',p_channel_id,'unit_price',p_unit_price,
      'compare_at_price',p_compare_at_price)
  );
  return jsonb_build_object('ok',true,'price_item_id',price_item_value);
end;
$$;

create or replace function public.rpc_set_product_channel_price(
  p_product_id uuid,
  p_channel_id uuid,
  p_variant_id uuid default null,
  p_unit_price numeric default null,
  p_compare_at_price numeric default null,
  p_valid_from timestamptz default null,
  p_valid_until timestamptz default null
) returns jsonb language sql security invoker set search_path = ''
as $$ select private.set_product_channel_price(
  p_product_id,p_channel_id,p_variant_id,p_unit_price,p_compare_at_price,
  p_valid_from,p_valid_until
); $$;

create or replace function private.product_publication_errors(
  p_product_id uuid,
  p_channel_id uuid,
  p_organization_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  product_value public.products%rowtype;
  errors jsonb := '[]'::jsonb;
begin
  select * into product_value from public.products
  where id = p_product_id and organization_id = p_organization_id and deleted_at is null;
  if not found then
    return jsonb_build_array(jsonb_build_object(
      'field','product','code','not_found','message','商品不存在'
    ));
  end if;
  if product_value.workflow_status = 'archived' then
    errors := errors || jsonb_build_array(jsonb_build_object(
      'field','status','code','archived','message','已归档商品不能发布'
    ));
  end if;
  if coalesce(trim(product_value.name_zh),trim(product_value.name),'') = '' then
    errors := errors || jsonb_build_array(jsonb_build_object(
      'field','name_zh','code','required','message','请填写中文商品名称'
    ));
  end if;
  if product_value.category_id is null then
    errors := errors || jsonb_build_array(jsonb_build_object(
      'field','category_id','code','required','message','请选择商品分类'
    ));
  end if;
  if coalesce(trim(product_value.description_zh),trim(product_value.description),'') = '' then
    errors := errors || jsonb_build_array(jsonb_build_object(
      'field','description_zh','code','required','message','请填写中文商品描述'
    ));
  end if;
  if coalesce(trim(product_value.slug),'') = '' then
    errors := errors || jsonb_build_array(jsonb_build_object(
      'field','slug','code','required','message','请设置商品 URL Slug'
    ));
  end if;
  if not exists (
    select 1 from public.product_images media
    where media.product_id = product_value.id and media.organization_id = p_organization_id
      and media.deleted_at is null and media.is_primary
  ) then errors := errors || jsonb_build_array(jsonb_build_object(
    'field','media','code','primary_required','message','请设置商品主图'
  )); end if;
  if not exists (
    select 1 from public.product_variants variant
    where variant.product_id = product_value.id
      and variant.organization_id = p_organization_id
      and variant.is_active and variant.is_visible_online
  ) then errors := errors || jsonb_build_array(jsonb_build_object(
    'field','variants','code','sellable_required','message','请至少启用一个网店可售 SKU'
  )); end if;
  if exists (
    select 1
    from public.product_variants variant
    where variant.product_id = product_value.id
      and variant.organization_id = p_organization_id
      and variant.is_active and variant.is_visible_online
      and not exists (
        select 1
        from public.price_books price_book
        join public.price_book_items price_item
          on price_item.price_book_id = price_book.id
         and price_item.product_id = product_value.id
         and (price_item.variant_id = variant.id or price_item.variant_id is null)
        where price_book.organization_id = p_organization_id
          and price_book.channel_id = p_channel_id
          and price_book.is_default and price_book.is_active
          and price_item.is_active and price_item.unit_price > 0
          and (price_item.valid_from is null or price_item.valid_from <= now())
          and (price_item.valid_until is null or price_item.valid_until > now())
      )
  ) then errors := errors || jsonb_build_array(jsonb_build_object(
    'field','prices','code','sku_price_required','message','每个可售 SKU 必须具有当前有效价格'
  )); end if;
  if not exists (
    select 1 from public.channels channel
    where channel.id = p_channel_id and channel.organization_id = p_organization_id
      and channel.is_active
  ) then errors := errors || jsonb_build_array(jsonb_build_object(
    'field','channel_id','code','invalid','message','发布渠道无效或已停用'
  )); end if;
  return errors;
end;
$$;

create or replace function private.validate_product_publication(
  p_product_id uuid,
  p_channel_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  organization_value uuid := private.current_organization_id();
  errors jsonb;
  product_slug text;
begin
  if actor_id is null or organization_value is null
     or not private.has_permission('products.manage') then
    raise exception '当前账号没有执行发布检查的权限';
  end if;
  errors := private.product_publication_errors(p_product_id,p_channel_id,organization_value);
  select slug into product_slug from public.products
  where id = p_product_id and organization_id = organization_value;

  insert into public.product_publications (
    organization_id,product_id,channel_id,status,slug,last_validated_at,
    validation_errors,created_by,updated_by
  ) values (
    organization_value,p_product_id,p_channel_id,'draft',coalesce(product_slug,p_product_id::text),
    now(),errors,actor_id,actor_id
  ) on conflict (organization_id,product_id,channel_id) do update
    set last_validated_at=now(),validation_errors=errors,updated_by=actor_id,updated_at=now();

  if jsonb_array_length(errors) = 0 then
    update public.products set workflow_status='ready',status='READY_TO_PUBLISH',
      updated_by=actor_id,updated_at=now()
    where id=p_product_id and workflow_status not in ('published','archived');
  end if;
  return jsonb_build_object('ok',jsonb_array_length(errors)=0,'errors',errors);
end;
$$;

create or replace function public.rpc_validate_product_publication(
  p_product_id uuid,
  p_channel_id uuid
) returns jsonb language sql security invoker set search_path = ''
as $$ select private.validate_product_publication(p_product_id,p_channel_id); $$;

create or replace function private.publish_product_channel(
  p_product_id uuid,
  p_channel_id uuid,
  p_scheduled_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  actor_id uuid := (select auth.uid());
  organization_value uuid := private.current_organization_id();
  product_value public.products%rowtype;
  channel_value public.channels%rowtype;
  errors jsonb;
  publication_status text;
  existing_status text;
  price_value numeric;
  compare_value numeric;
begin
  if actor_id is null or organization_value is null
     or not private.has_permission('products.publish') then
    raise exception '当前账号没有发布商品的权限';
  end if;
  select * into product_value from public.products
  where id=p_product_id and organization_id=organization_value and deleted_at is null
  for update;
  if not found then raise exception '商品不存在或不属于当前组织'; end if;
  select * into channel_value from public.channels
  where id=p_channel_id and organization_id=organization_value and is_active;
  if not found then raise exception '发布渠道无效或已停用'; end if;

  errors := private.product_publication_errors(p_product_id,p_channel_id,organization_value);
  if jsonb_array_length(errors) > 0 then
    insert into public.product_publications (
      organization_id,product_id,channel_id,status,slug,last_validated_at,
      validation_errors,created_by,updated_by
    ) values (
      organization_value,p_product_id,p_channel_id,'draft',coalesce(product_value.slug,p_product_id::text),
      now(),errors,actor_id,actor_id
    ) on conflict (organization_id,product_id,channel_id) do update
      set last_validated_at=now(),validation_errors=errors,updated_by=actor_id,updated_at=now();
    return jsonb_build_object('ok',false,'errors',errors);
  end if;

  publication_status := case
    when p_scheduled_at is not null and p_scheduled_at > now() then 'scheduled'
    else 'published'
  end;
  select status into existing_status from public.product_publications
  where organization_id=organization_value and product_id=p_product_id and channel_id=p_channel_id;
  if existing_status = publication_status and publication_status = 'published' then
    return jsonb_build_object('ok',true,'idempotent',true,'status',publication_status);
  end if;

  insert into public.product_publications (
    organization_id,product_id,channel_id,status,slug,scheduled_at,published_at,
    last_validated_at,validation_errors,created_by,updated_by
  ) values (
    organization_value,p_product_id,p_channel_id,publication_status,product_value.slug,
    case when publication_status='scheduled' then p_scheduled_at else null end,
    case when publication_status='published' then now() else null end,
    now(),'[]'::jsonb,actor_id,actor_id
  ) on conflict (organization_id,product_id,channel_id) do update set
    status=excluded.status,slug=excluded.slug,scheduled_at=excluded.scheduled_at,
    published_at=case when excluded.status='published' then now() else product_publications.published_at end,
    unpublished_at=null,last_validated_at=now(),validation_errors='[]'::jsonb,
    updated_by=actor_id,updated_at=now();

  update public.products set
    workflow_status=case when publication_status='published' then 'published' else 'ready' end,
    status=case when publication_status='published' then 'PUBLISHED' else 'READY_TO_PUBLISH' end,
    updated_by=actor_id,updated_at=now()
  where id=product_value.id;

  if channel_value.code='retail-web' and publication_status='published' then
    select item.unit_price,item.compare_at_price into price_value,compare_value
    from public.price_books book
    join public.price_book_items item on item.price_book_id=book.id
    where book.organization_id=organization_value and book.channel_id=channel_value.id
      and book.is_default and book.is_active and item.product_id=product_value.id
      and item.is_active
      and (item.valid_from is null or item.valid_from<=now())
      and (item.valid_until is null or item.valid_until>now())
    order by (item.variant_id is null) desc, item.unit_price asc
    limit 1;
    insert into public.online_listings (
      product_id,title,slug,short_description,description,retail_price,sale_price,
      listing_status,is_new,is_featured,is_bestseller,published_at,updated_at
    ) values (
      product_value.id,coalesce(product_value.name_zh,product_value.name),product_value.slug,
      coalesce(product_value.short_description_zh,product_value.short_description),
      coalesce(product_value.description_zh,product_value.description),
      coalesce(compare_value,price_value),case when compare_value is not null then price_value else null end,
      'PUBLISHED',product_value.is_new,product_value.is_featured,product_value.is_bestseller,now(),now()
    ) on conflict (product_id) do update set
      title=excluded.title,slug=excluded.slug,short_description=excluded.short_description,
      description=excluded.description,retail_price=excluded.retail_price,
      sale_price=excluded.sale_price,listing_status='PUBLISHED',published_at=now(),updated_at=now();
  end if;

  insert into public.audit_logs (
    organization_id,user_id,action,entity_type,entity_id,new_data
  ) values (
    organization_value,actor_id,
    case when publication_status='published' then 'PUBLISH_PRODUCT_CHANNEL' else 'SCHEDULE_PRODUCT_CHANNEL' end,
    'product',product_value.id,
    jsonb_build_object('channel_id',channel_value.id,'status',publication_status,'scheduled_at',p_scheduled_at)
  );
  return jsonb_build_object('ok',true,'idempotent',false,'status',publication_status);
end;
$$;

create or replace function public.rpc_publish_product_channel(
  p_product_id uuid,
  p_channel_id uuid,
  p_scheduled_at timestamptz default null
) returns jsonb language sql security invoker set search_path = ''
as $$ select private.publish_product_channel(p_product_id,p_channel_id,p_scheduled_at); $$;

create or replace function private.unpublish_product_channel(
  p_product_id uuid,
  p_channel_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  organization_value uuid := private.current_organization_id();
  channel_code_value text;
begin
  if actor_id is null or organization_value is null
     or not private.has_permission('products.publish') then
    raise exception '当前账号没有下架商品的权限';
  end if;
  select code into channel_code_value from public.channels
  where id=p_channel_id and organization_id=organization_value;
  if not found then raise exception '发布渠道不存在'; end if;

  update public.product_publications set status='unpublished',unpublished_at=now(),
    scheduled_at=null,updated_by=actor_id,updated_at=now()
  where organization_id=organization_value and product_id=p_product_id and channel_id=p_channel_id;
  if not found then raise exception '该商品尚未创建渠道发布记录'; end if;

  if channel_code_value='retail-web' then
    update public.online_listings set listing_status='UNPUBLISHED',updated_at=now()
    where product_id=p_product_id;
  end if;
  if not exists (
    select 1 from public.product_publications
    where organization_id=organization_value and product_id=p_product_id and status='published'
  ) then
    update public.products set workflow_status='ready',status='UNPUBLISHED',
      updated_by=actor_id,updated_at=now()
    where id=p_product_id and organization_id=organization_value;
  end if;
  insert into public.audit_logs (
    organization_id,user_id,action,entity_type,entity_id,new_data
  ) values (
    organization_value,actor_id,'UNPUBLISH_PRODUCT_CHANNEL','product',p_product_id,
    jsonb_build_object('channel_id',p_channel_id,'status','unpublished')
  );
  return jsonb_build_object('ok',true,'status','unpublished');
end;
$$;

create or replace function public.rpc_unpublish_product_channel(
  p_product_id uuid,
  p_channel_id uuid
) returns jsonb language sql security invoker set search_path = ''
as $$ select private.unpublish_product_channel(p_product_id,p_channel_id); $$;

create or replace function private.bulk_update_products(
  p_product_ids uuid[],
  p_action text,
  p_value text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  organization_value uuid := private.current_organization_id();
  product_id_value uuid;
  affected_count integer := 0;
begin
  if actor_id is null or organization_value is null
     or not private.has_permission('products.manage') then
    raise exception '当前账号没有批量编辑商品的权限';
  end if;
  if coalesce(array_length(p_product_ids,1),0)=0 or array_length(p_product_ids,1)>100 then
    raise exception '每次请选择 1 至 100 个商品';
  end if;
  if p_action not in ('set_category','set_brand','set_featured','archive','restore') then
    raise exception '不支持的批量操作';
  end if;
  if p_action in ('archive','restore') and not private.has_permission('products.archive') then
    raise exception '当前账号没有归档或恢复商品的权限';
  end if;

  foreach product_id_value in array p_product_ids loop
    perform 1 from public.products
    where id=product_id_value and organization_id=organization_value and deleted_at is null
    for update;
    if not found then continue; end if;

    if p_action='set_category' then
      if not exists (
        select 1 from public.categories where id=p_value::uuid
          and organization_id=organization_value and is_active
      ) then raise exception '批量分类无效'; end if;
      update public.products set category_id=p_value::uuid,workflow_status='enriching',
        status='PENDING_REVIEW',updated_by=actor_id,updated_at=now()
      where id=product_id_value;
    elsif p_action='set_brand' then
      if not exists (
        select 1 from public.brands where id=p_value::uuid
          and organization_id=organization_value and is_active
      ) then raise exception '批量品牌无效'; end if;
      update public.products set brand_id=p_value::uuid,updated_by=actor_id,updated_at=now()
      where id=product_id_value;
    elsif p_action='set_featured' then
      update public.products set is_featured=p_value::boolean,updated_by=actor_id,updated_at=now()
      where id=product_id_value;
    elsif p_action='archive' then
      update public.product_publications set status='unpublished',unpublished_at=now(),
        updated_by=actor_id,updated_at=now()
      where product_id=product_id_value and organization_id=organization_value;
      update public.online_listings set listing_status='UNPUBLISHED',updated_at=now()
      where product_id=product_id_value;
      update public.products set workflow_status='archived',status='ARCHIVED',archived_at=now(),
        updated_by=actor_id,updated_at=now()
      where id=product_id_value;
    elsif p_action='restore' then
      update public.products set workflow_status='enriching',status='PENDING_REVIEW',archived_at=null,
        updated_by=actor_id,updated_at=now()
      where id=product_id_value;
    end if;

    insert into public.audit_logs (
      organization_id,user_id,action,entity_type,entity_id,new_data
    ) values (
      organization_value,actor_id,'BULK_PRODUCT_OPERATION','product',product_id_value,
      jsonb_build_object('action',p_action,'value',p_value)
    );
    affected_count := affected_count + 1;
  end loop;
  return jsonb_build_object('ok',true,'affected_count',affected_count);
end;
$$;

create or replace function public.rpc_bulk_update_products(
  p_product_ids uuid[],
  p_action text,
  p_value text default null
) returns jsonb language sql security invoker set search_path = ''
as $$ select private.bulk_update_products(p_product_ids,p_action,p_value); $$;

do $$
declare signature_value regprocedure;
begin
  foreach signature_value in array array[
    'private.create_product_draft(jsonb)'::regprocedure,
    'private.save_product_operations(uuid,jsonb)'::regprocedure,
    'private.upsert_product_variant(uuid,uuid,uuid,uuid,text,text,boolean,boolean,integer)'::regprocedure,
    'private.set_product_channel_price(uuid,uuid,uuid,numeric,numeric,timestamptz,timestamptz)'::regprocedure,
    'private.product_publication_errors(uuid,uuid,uuid)'::regprocedure,
    'private.validate_product_publication(uuid,uuid)'::regprocedure,
    'private.publish_product_channel(uuid,uuid,timestamptz)'::regprocedure,
    'private.unpublish_product_channel(uuid,uuid)'::regprocedure,
    'private.bulk_update_products(uuid[],text,text)'::regprocedure
  ] loop
    execute format('revoke all on function %s from public,anon',signature_value);
    execute format('grant execute on function %s to authenticated',signature_value);
  end loop;
end;
$$;

revoke all on function public.rpc_create_product_draft(jsonb) from public,anon;
revoke all on function public.rpc_save_product_operations(uuid,jsonb) from public,anon;
revoke all on function public.rpc_upsert_product_variant(uuid,uuid,uuid,uuid,text,text,boolean,boolean,integer) from public,anon;
revoke all on function public.rpc_set_product_channel_price(uuid,uuid,uuid,numeric,numeric,timestamptz,timestamptz) from public,anon;
revoke all on function public.rpc_validate_product_publication(uuid,uuid) from public,anon;
revoke all on function public.rpc_publish_product_channel(uuid,uuid,timestamptz) from public,anon;
revoke all on function public.rpc_unpublish_product_channel(uuid,uuid) from public,anon;
revoke all on function public.rpc_bulk_update_products(uuid[],text,text) from public,anon;

grant execute on function public.rpc_create_product_draft(jsonb) to authenticated;
grant execute on function public.rpc_save_product_operations(uuid,jsonb) to authenticated;
grant execute on function public.rpc_upsert_product_variant(uuid,uuid,uuid,uuid,text,text,boolean,boolean,integer) to authenticated;
grant execute on function public.rpc_set_product_channel_price(uuid,uuid,uuid,numeric,numeric,timestamptz,timestamptz) to authenticated;
grant execute on function public.rpc_validate_product_publication(uuid,uuid) to authenticated;
grant execute on function public.rpc_publish_product_channel(uuid,uuid,timestamptz) to authenticated;
grant execute on function public.rpc_unpublish_product_channel(uuid,uuid) to authenticated;
grant execute on function public.rpc_bulk_update_products(uuid[],text,text) to authenticated;

-- Phase 2 product operations must not be bypassed through the legacy catalogue
-- writer or the product-level publish helpers. Inventory remains writable only
-- through the dedicated Phase 1 stock workflows.
do $$
begin
  if to_regprocedure('public.save_catalog_product(uuid,jsonb,jsonb)') is not null then
    revoke execute on function public.save_catalog_product(uuid,jsonb,jsonb) from authenticated;
  end if;
  if to_regprocedure('public.publish_product(uuid)') is not null then
    revoke execute on function public.publish_product(uuid) from authenticated;
  end if;
  if to_regprocedure('public.unpublish_product(uuid)') is not null then
    revoke execute on function public.unpublish_product(uuid) from authenticated;
  end if;
end;
$$;

notify pgrst, 'reload schema';

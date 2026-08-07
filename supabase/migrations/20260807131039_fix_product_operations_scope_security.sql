-- Product operations scope repair.
--
-- Unclassified products are intentionally created by inbound workflows and
-- may only be claimed by staff who can both view and edit product operations.
-- The generic has_category_access(NULL) behaviour remains unchanged because
-- inventory, receiving and other domains rely on NULL remaining inaccessible.

create or replace function private.has_product_operations_scope(required_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and case
    when required_category_id is null then
      private.has_permission('product.edit')
    else
      private.has_category_access(required_category_id)
  end;
$$;

comment on function private.has_product_operations_scope(uuid) is
  'Product-specific scope: unclassified rows require product.edit; classified rows retain category scope.';

revoke all on function private.has_product_operations_scope(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.has_product_operations_scope(uuid) to authenticated;

create or replace function private.can_view_product_for_operations(target_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and (select private.current_organization_id()) is not null
    and private.has_permission('product.view')
    and exists (
      select 1
      from public.products product
      where product.id = target_product_id
        and product.organization_id = (select private.current_organization_id())
        and product.deleted_at is null
        and private.has_product_operations_scope(product.category_id)
    );
$$;

comment on function private.can_view_product_for_operations(uuid) is
  'Checks canonical product.view, organization and current product category scope.';

create or replace function private.can_edit_product_for_operations(target_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_permission('product.edit')
    and private.can_view_product_for_operations(target_product_id);
$$;

comment on function private.can_edit_product_for_operations(uuid) is
  'Checks canonical product.view/product.edit, organization and current product category scope.';

revoke all on function private.can_view_product_for_operations(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.can_edit_product_for_operations(uuid)
  from public, anon, authenticated, service_role;

-- Products: SELECT requires canonical view permission. Unclassified rows add
-- the canonical edit requirement through has_product_operations_scope().
drop policy if exists rbac_products_select on public.products;
create policy rbac_products_select on public.products
for select to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (select private.has_permission('product.view'))
  and private.has_product_operations_scope(category_id)
);

drop policy if exists rbac_products_insert on public.products;
create policy rbac_products_insert on public.products
for insert to authenticated
with check (
  organization_id = (select private.current_organization_id())
  and (select private.has_permission('product.create'))
  and private.has_product_operations_scope(category_id)
);

drop policy if exists rbac_products_update on public.products;
create policy rbac_products_update on public.products
for update to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (select private.has_permission('product.edit'))
  and private.has_product_operations_scope(category_id)
)
with check (
  organization_id = (select private.current_organization_id())
  and (select private.has_permission('product.edit'))
  and private.has_product_operations_scope(category_id)
);

-- Variants follow the parent product scope. Warehouse roles retain their SKU
-- permissions for classified products, but product.edit is additionally
-- required when the parent product has not been classified yet.
drop policy if exists rbac_variants_select on public.product_variants;
create policy rbac_variants_select on public.product_variants
for select to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (select private.has_permission('sku.view'))
  and exists (
    select 1
    from public.products product
    where product.id = product_variants.product_id
      and product.organization_id = product_variants.organization_id
      and private.has_product_operations_scope(product.category_id)
  )
);

drop policy if exists rbac_variants_insert on public.product_variants;
create policy rbac_variants_insert on public.product_variants
for insert to authenticated
with check (
  organization_id = (select private.current_organization_id())
  and (select private.has_permission('sku.create'))
  and exists (
    select 1
    from public.products product
    where product.id = product_variants.product_id
      and product.organization_id = product_variants.organization_id
      and private.has_product_operations_scope(product.category_id)
  )
);

drop policy if exists rbac_variants_update on public.product_variants;
create policy rbac_variants_update on public.product_variants
for update to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (select private.has_permission('sku.edit'))
  and exists (
    select 1
    from public.products product
    where product.id = product_variants.product_id
      and product.organization_id = product_variants.organization_id
      and private.has_product_operations_scope(product.category_id)
  )
)
with check (
  organization_id = (select private.current_organization_id())
  and (select private.has_permission('sku.edit'))
  and exists (
    select 1
    from public.products product
    where product.id = product_variants.product_id
      and product.organization_id = product_variants.organization_id
      and private.has_product_operations_scope(product.category_id)
  )
);

-- Internal media metadata follows the same parent-product visibility. Direct
-- browser mutations remain revoked; all writes continue through narrow RPCs.
drop policy if exists authenticated_staff_read_images on public.product_images;
drop policy if exists rbac_product_images_select on public.product_images;
create policy rbac_product_images_select on public.product_images
for select to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (select private.has_permission('product.view'))
  and exists (
    select 1
    from public.products product
    where product.id = product_images.product_id
      and product.organization_id = product_images.organization_id
      and private.has_product_operations_scope(product.category_id)
  )
);

drop policy if exists manage_insert_product_images on public.product_images;
drop policy if exists manage_update_product_images on public.product_images;
drop policy if exists manage_delete_product_images on public.product_images;

create or replace function private.can_manage_product_media(target_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and (select private.current_organization_id()) is not null
    and private.has_permission('product.view')
    and private.has_permission('product.edit')
    and private.has_permission('media.manage')
    and exists (
      select 1
      from public.products product
      where product.id = target_product_id
        and product.organization_id = (select private.current_organization_id())
        and product.deleted_at is null
        and private.has_product_operations_scope(product.category_id)
    );
$$;

comment on function private.can_manage_product_media(uuid) is
  'Checks authenticated product/media permissions, organization and product category scope.';

revoke all on function private.can_manage_product_media(uuid)
  from public, anon, authenticated, service_role;

-- Product draft creation never trusts client-supplied actor or organization
-- values. A classified draft additionally requires access to its target scope.
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
     or not private.has_permission('product.create')
     or not private.has_permission('product.edit') then
    raise exception '当前账号没有创建商品草稿的权限';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception '商品资料格式无效';
  end if;
  if model_value !~ '^[A-Z0-9_-]{2,50}$' then
    raise exception '商品型号只能包含字母、数字、短横线和下划线';
  end if;
  if category_value is not null and not exists (
    select 1 from public.categories category
    where category.id = category_value
      and category.organization_id = organization_value
      and category.is_active
  ) then
    raise exception '商品分类无效';
  end if;
  if category_value is not null and not private.has_category_access(category_value) then
    raise exception '当前账号无权在该分类创建商品';
  end if;
  if brand_value is not null and not exists (
    select 1 from public.brands brand
    where brand.id = brand_value
      and brand.organization_id = organization_value
      and brand.is_active
  ) then
    raise exception '商品品牌无效';
  end if;
  if supplier_value is not null and not exists (
    select 1 from public.suppliers supplier
    where supplier.id = supplier_value
      and supplier.organization_id = organization_value
      and supplier.is_active
  ) then
    raise exception '供应商无效';
  end if;

  insert into public.products (
    organization_id,style_no,model_number,name,name_zh,name_it,name_en,
    category_id,brand_id,supplier_id,season,year,gender,material,
    workflow_status,status,created_by,updated_by
  ) values (
    organization_value,model_value,model_value,
    nullif(trim(p_payload->>'name_zh'),''),nullif(trim(p_payload->>'name_zh'),''),
    nullif(trim(p_payload->>'name_it'),''),nullif(trim(p_payload->>'name_en'),''),
    category_value,brand_value,supplier_value,
    nullif(trim(p_payload->>'season'),''),nullif(p_payload->>'year','')::integer,
    nullif(trim(p_payload->>'gender'),''),nullif(trim(p_payload->>'material'),''),
    'draft','PENDING_DETAILS',actor_id,actor_id
  ) returning id into product_id_value;

  insert into public.audit_logs (
    organization_id,user_id,action,entity_type,entity_id,new_data
  ) values (
    organization_value,actor_id,'CREATE_PRODUCT_DRAFT','product',product_id_value,
    jsonb_build_object('model_code',model_value,'category_id',category_value,'source','product_operations')
  );
  return jsonb_build_object('ok',true,'product_id',product_id_value);
end;
$$;

comment on function private.create_product_draft(jsonb) is
  'SECURITY DEFINER draft creator with canonical create/edit and target category-scope checks.';

-- Variant mutations always inherit access from the parent product. Color and
-- size identifiers must belong to the same organization as that parent.
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
     or not private.has_permission('sku.edit')
     or not private.can_edit_product_for_operations(p_product_id) then
    raise exception '当前账号没有编辑该商品 SKU 的权限';
  end if;
  if sku_value !~ '^[A-Z0-9_-]{2,100}$' then
    raise exception 'SKU 格式无效';
  end if;
  if not exists (
    select 1 from public.products product
    where product.id = p_product_id
      and product.organization_id = organization_value
      and product.deleted_at is null
      and product.workflow_status <> 'archived'
  ) then
    raise exception '商品不存在或已经归档';
  end if;
  if not exists (
    select 1 from public.colors color
    where color.id = p_color_id
      and color.organization_id = organization_value
      and color.is_active
  ) then
    raise exception '颜色无效或已停用';
  end if;
  if not exists (
    select 1 from public.sizes size
    where size.id = p_size_id
      and size.organization_id = organization_value
      and size.is_active
  ) then
    raise exception '尺码无效或已停用';
  end if;

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
      select 1 from public.product_variants variant
      where variant.id = variant_id_value
        and variant.product_id = p_product_id
        and variant.organization_id = organization_value
    ) then
      raise exception 'SKU 不存在或不属于当前商品';
    end if;
    if coalesce(p_is_active,false) = false and exists (
      select 1 from public.products product
      where product.id = p_product_id
        and product.workflow_status = 'published'
        and 1 >= (
          select count(*) from public.product_variants active_variant
          where active_variant.product_id = p_product_id
            and active_variant.is_active
            and active_variant.is_visible_online
        )
    ) then
      raise exception '已发布商品必须保留至少一个可售 SKU';
    end if;
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

comment on function private.upsert_product_variant(uuid,uuid,uuid,uuid,text,text,boolean,boolean,integer) is
  'SECURITY DEFINER variant writer scoped through its parent product and canonical SKU permission.';

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
     or not private.has_permission('product.price.edit')
     or not private.can_view_product_for_operations(p_product_id) then
    raise exception '当前账号没有管理该商品渠道价格的权限';
  end if;
  if p_unit_price is null or p_unit_price <= 0 then
    raise exception '销售价格必须大于 0';
  end if;
  if p_compare_at_price is not null and p_compare_at_price < p_unit_price then
    raise exception '对比价不能低于销售价格';
  end if;
  if p_valid_until is not null and p_valid_from is not null and p_valid_until <= p_valid_from then
    raise exception '价格结束时间必须晚于开始时间';
  end if;
  if p_variant_id is not null and not exists (
    select 1 from public.product_variants variant
    where variant.id = p_variant_id
      and variant.product_id = p_product_id
      and variant.organization_id = organization_value
  ) then
    raise exception 'SKU 不属于当前商品';
  end if;

  select price_book.id, channel.code
  into price_book_value, channel_code_value
  from public.price_books price_book
  join public.channels channel on channel.id = price_book.channel_id
  where price_book.organization_id = organization_value
    and channel.organization_id = organization_value
    and price_book.channel_id = p_channel_id
    and price_book.is_default
    and price_book.is_active
    and channel.is_active
  for update of price_book;
  if not found then
    raise exception '当前渠道没有启用的默认价目表';
  end if;

  if p_variant_id is null then
    insert into public.price_book_items (
      organization_id,price_book_id,product_id,variant_id,unit_price,
      compare_at_price,valid_from,valid_until,created_by,updated_by
    ) values (
      organization_value,price_book_value,p_product_id,null,p_unit_price,
      p_compare_at_price,p_valid_from,p_valid_until,actor_id,actor_id
    )
    on conflict (price_book_id,product_id) where variant_id is null
    do update set
      unit_price = excluded.unit_price,
      compare_at_price = excluded.compare_at_price,
      valid_from = excluded.valid_from,
      valid_until = excluded.valid_until,
      is_active = true,
      updated_by = actor_id,
      updated_at = now()
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
    do update set
      unit_price = excluded.unit_price,
      compare_at_price = excluded.compare_at_price,
      valid_from = excluded.valid_from,
      valid_until = excluded.valid_until,
      is_active = true,
      updated_by = actor_id,
      updated_at = now()
    returning id into price_item_value;
  end if;

  if channel_code_value = 'retail-web' and p_variant_id is null then
    update public.products set
      retail_price = coalesce(p_compare_at_price,p_unit_price),
      sale_price = case when p_compare_at_price is not null then p_unit_price else null end,
      promotional_price = case when p_compare_at_price is not null then p_unit_price else null end,
      updated_by = actor_id,
      updated_at = now()
    where id = p_product_id and organization_id = organization_value;
  end if;

  insert into public.audit_logs (
    organization_id,user_id,action,entity_type,entity_id,new_data
  ) values (
    organization_value,actor_id,'SET_CHANNEL_PRICE','price_book_item',price_item_value,
    jsonb_build_object(
      'product_id',p_product_id,'variant_id',p_variant_id,
      'channel_id',p_channel_id,'unit_price',p_unit_price,
      'compare_at_price',p_compare_at_price
    )
  );
  return jsonb_build_object('ok',true,'price_item_id',price_item_value);
end;
$$;

comment on function private.set_product_channel_price(uuid,uuid,uuid,numeric,numeric,timestamptz,timestamptz) is
  'SECURITY DEFINER price writer with canonical price permission, product scope and channel organization checks.';

-- SECURITY DEFINER: every row and target-category decision is checked here;
-- caller RLS is not assumed to protect the write.
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
  subcategory_value uuid := nullif(p_payload->>'subcategory_id','')::uuid;
  brand_value uuid := nullif(p_payload->>'brand_id','')::uuid;
  supplier_value uuid := nullif(p_payload->>'supplier_id','')::uuid;
  slug_value text := lower(nullif(trim(p_payload->>'slug'),''));
  before_value jsonb;
begin
  if actor_id is null or organization_value is null
     or not private.has_permission('product.view')
     or not private.has_permission('product.edit') then
    raise exception '当前账号没有编辑商品资料的权限';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception '商品资料格式无效';
  end if;

  select * into product_value
  from public.products
  where id = p_product_id
    and organization_id = organization_value
    and deleted_at is null
  for update;
  if not found then
    raise exception '商品不存在或不属于当前组织';
  end if;
  if not private.has_product_operations_scope(product_value.category_id) then
    raise exception '当前账号无权编辑该商品所属分类';
  end if;
  if product_value.workflow_status = 'archived' then
    raise exception '已归档商品需要先恢复后才能编辑';
  end if;
  if slug_value is not null and slug_value !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'URL Slug 只能包含小写字母、数字和单个短横线';
  end if;
  if category_value is not null and not exists (
    select 1 from public.categories category
    where category.id = category_value
      and category.organization_id = organization_value
      and category.is_active
  ) then
    raise exception '商品分类无效';
  end if;
  if category_value is not null and not private.has_category_access(category_value) then
    raise exception '当前账号无权将商品分配到该分类';
  end if;
  if subcategory_value is not null and category_value is null then
    raise exception '选择子分类前必须先选择商品分类';
  end if;
  if subcategory_value is not null and not exists (
    select 1 from public.categories subcategory
    where subcategory.id = subcategory_value
      and subcategory.organization_id = organization_value
      and subcategory.is_active
      and subcategory.parent_id = category_value
  ) then
    raise exception '商品子分类无效或不属于所选分类';
  end if;
  if brand_value is not null and not exists (
    select 1 from public.brands brand
    where brand.id = brand_value
      and brand.organization_id = organization_value
      and brand.is_active
  ) then
    raise exception '商品品牌无效';
  end if;
  if supplier_value is not null and not exists (
    select 1 from public.suppliers supplier
    where supplier.id = supplier_value
      and supplier.organization_id = organization_value
      and supplier.is_active
  ) then
    raise exception '供应商无效';
  end if;

  before_value := jsonb_build_object(
    'name_zh',product_value.name_zh,
    'category_id',product_value.category_id,
    'brand_id',product_value.brand_id,
    'workflow_status',product_value.workflow_status,
    'slug',product_value.slug
  );

  update public.products set
    name = nullif(trim(p_payload->>'name_zh'),''),
    name_zh = nullif(trim(p_payload->>'name_zh'),''),
    name_it = nullif(trim(p_payload->>'name_it'),''),
    name_en = nullif(trim(p_payload->>'name_en'),''),
    internal_name = nullif(trim(p_payload->>'internal_name'),''),
    category_id = category_value,
    subcategory_id = subcategory_value,
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
      'category_id',category_value,
      'brand_id',brand_value,
      'slug',slug_value,
      'source','product_operations'
    )
  );

  return jsonb_build_object('ok',true,'product_id',product_value.id);
end;
$$;

comment on function private.save_product_operations(uuid,jsonb) is
  'SECURITY DEFINER product editor with canonical permission and old/new category scope checks.';

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
     or not private.can_manage_product_media(p_product_id) then
    raise exception '当前账号没有该商品的图片管理权限';
  end if;
  if p_variant_id is not null and not exists (
    select 1 from public.product_variants variant
    where variant.id = p_variant_id
      and variant.product_id = p_product_id
      and variant.organization_id = organization_value
  ) then
    raise exception '商品规格不存在或不属于该商品';
  end if;
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
  if (
    select count(*) from public.product_images image
    where image.organization_id = organization_value
      and image.product_id = p_product_id
      and image.deleted_at is null
  ) >= 20 then
    raise exception '每个商品最多保留 20 张有效图片';
  end if;

  select coalesce(max(image.sort_order), -1) + 1 into sort_value
  from public.product_images image
  where image.organization_id = organization_value
    and image.product_id = p_product_id
    and image.deleted_at is null;
  make_primary := p_is_primary or not exists (
    select 1 from public.product_images image
    where image.organization_id = organization_value
      and image.product_id = p_product_id
      and image.is_primary
      and image.deleted_at is null
  );
  if make_primary then
    update public.product_images set
      is_primary = false,
      updated_by = actor_id,
      updated_at = now()
    where organization_id = organization_value
      and product_id = p_product_id
      and is_primary
      and deleted_at is null;
  end if;

  insert into public.product_images (
    organization_id,product_id,variant_id,file_path,public_url,
    image_type,sort_order,is_primary,mime_type,file_size_bytes,width,height,
    alt_text_zh,alt_text_it,alt_text_en,created_by,updated_by
  ) values (
    organization_value,p_product_id,p_variant_id,p_storage_path,'',
    case when make_primary then 'MAIN' else p_media_type end,sort_value,make_primary,
    p_mime_type,p_file_size,p_width,p_height,
    nullif(trim(p_alt_text_zh),''),nullif(trim(p_alt_text_it),''),
    nullif(trim(p_alt_text_en),''),actor_id,actor_id
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

comment on function private.register_product_media(uuid,uuid,text,text,bigint,integer,integer,text,text,text,text,boolean) is
  'SECURITY DEFINER media registration with product operations category-scope enforcement.';

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
     or not private.can_manage_product_media(p_product_id) then
    raise exception '当前账号没有该商品的图片管理权限';
  end if;
  select * into media_value
  from public.product_images
  where id = p_media_id
    and product_id = p_product_id
    and organization_id = organization_value
    and deleted_at is null
  for update;
  if not found then
    raise exception '商品图片不存在';
  end if;

  update public.product_images set
    deleted_at = now(),
    is_primary = false,
    updated_by = actor_id,
    updated_at = now()
  where id = p_media_id;
  if media_value.is_primary then
    select id into replacement_id
    from public.product_images
    where product_id = p_product_id
      and organization_id = organization_value
      and deleted_at is null
    order by sort_order,created_at
    limit 1
    for update;
    if replacement_id is not null then
      update public.product_images set
        is_primary = true,
        image_type = 'MAIN',
        updated_by = actor_id,
        updated_at = now()
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

comment on function private.soft_delete_product_media(uuid,uuid) is
  'SECURITY DEFINER media deletion with product operations category-scope enforcement.';

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
     or not private.can_manage_product_media(p_product_id) then
    raise exception '当前账号没有该商品的图片管理权限';
  end if;
  if p_action not in ('set_primary','move_up','move_down') then
    raise exception '图片操作无效';
  end if;
  select * into image_value
  from public.product_images
  where id = p_image_id
    and product_id = p_product_id
    and organization_id = organization_value
    and deleted_at is null
  for update;
  if not found then
    raise exception '商品图片不存在';
  end if;

  if p_action = 'set_primary' then
    update public.product_images set
      is_primary = false,
      updated_by = actor_id,
      updated_at = now()
    where product_id = p_product_id
      and organization_id = organization_value
      and is_primary
      and deleted_at is null;
    update public.product_images set
      is_primary = true,
      image_type = 'MAIN',
      updated_by = actor_id,
      updated_at = now()
    where id = image_value.id;
  else
    select * into neighbor_value
    from public.product_images
    where product_id = p_product_id
      and organization_id = organization_value
      and deleted_at is null
      and id <> image_value.id
      and (
        (p_action = 'move_up' and sort_order < image_value.sort_order)
        or (p_action = 'move_down' and sort_order > image_value.sort_order)
      )
    order by
      case when p_action = 'move_up' then sort_order end desc,
      case when p_action = 'move_down' then sort_order end asc
    limit 1
    for update;
    if found then
      update public.product_images set
        sort_order = neighbor_value.sort_order,
        updated_by = actor_id,
        updated_at = now()
      where id = image_value.id;
      update public.product_images set
        sort_order = image_value.sort_order,
        updated_by = actor_id,
        updated_at = now()
      where id = neighbor_value.id;
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

comment on function private.manage_product_image(uuid,uuid,text) is
  'SECURITY DEFINER media ordering/primary changes with product operations category-scope enforcement.';

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
     or not private.has_permission('product.publish')
     or not private.can_view_product_for_operations(p_product_id) then
    raise exception '当前账号没有检查该商品发布条件的权限';
  end if;
  if not exists (
    select 1 from public.channels channel
    where channel.id = p_channel_id
      and channel.organization_id = organization_value
      and channel.is_active
  ) then
    raise exception '发布渠道无效或已停用';
  end if;

  errors := private.product_publication_errors(p_product_id,p_channel_id,organization_value);
  select product.slug into product_slug
  from public.products product
  where product.id = p_product_id
    and product.organization_id = organization_value;

  insert into public.product_publications (
    organization_id,product_id,channel_id,status,slug,last_validated_at,
    validation_errors,created_by,updated_by
  ) values (
    organization_value,p_product_id,p_channel_id,'draft',coalesce(product_slug,p_product_id::text),
    now(),errors,actor_id,actor_id
  ) on conflict (organization_id,product_id,channel_id) do update set
    last_validated_at = now(),
    validation_errors = errors,
    updated_by = actor_id,
    updated_at = now();

  if jsonb_array_length(errors) = 0 then
    update public.products set
      workflow_status = 'ready',
      status = 'READY_TO_PUBLISH',
      updated_by = actor_id,
      updated_at = now()
    where id = p_product_id
      and organization_id = organization_value
      and workflow_status not in ('published','archived');
  end if;
  return jsonb_build_object('ok',jsonb_array_length(errors)=0,'errors',errors);
end;
$$;

comment on function private.validate_product_publication(uuid,uuid) is
  'SECURITY DEFINER publication validator that rejects unauthorized product and channel identifiers before revealing validation details.';

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
     or not private.has_permission('product.publish')
     or not private.can_view_product_for_operations(p_product_id) then
    raise exception '当前账号没有发布该商品的权限';
  end if;
  select * into product_value
  from public.products product
  where product.id = p_product_id
    and product.organization_id = organization_value
    and product.deleted_at is null
  for update;
  if not found then
    raise exception '商品不存在或不属于当前组织';
  end if;
  select * into channel_value
  from public.channels channel
  where channel.id = p_channel_id
    and channel.organization_id = organization_value
    and channel.is_active;
  if not found then
    raise exception '发布渠道无效或已停用';
  end if;

  errors := private.product_publication_errors(p_product_id,p_channel_id,organization_value);
  if jsonb_array_length(errors) > 0 then
    insert into public.product_publications (
      organization_id,product_id,channel_id,status,slug,last_validated_at,
      validation_errors,created_by,updated_by
    ) values (
      organization_value,p_product_id,p_channel_id,'draft',coalesce(product_value.slug,p_product_id::text),
      now(),errors,actor_id,actor_id
    ) on conflict (organization_id,product_id,channel_id) do update set
      last_validated_at = now(),
      validation_errors = errors,
      updated_by = actor_id,
      updated_at = now();
    return jsonb_build_object('ok',false,'errors',errors);
  end if;

  publication_status := case
    when p_scheduled_at is not null and p_scheduled_at > now() then 'scheduled'
    else 'published'
  end;
  select publication.status into existing_status
  from public.product_publications publication
  where publication.organization_id = organization_value
    and publication.product_id = p_product_id
    and publication.channel_id = p_channel_id;
  if existing_status = publication_status and publication_status = 'published' then
    return jsonb_build_object('ok',true,'idempotent',true,'status',publication_status);
  end if;

  insert into public.product_publications (
    organization_id,product_id,channel_id,status,slug,scheduled_at,published_at,
    last_validated_at,validation_errors,created_by,updated_by
  ) values (
    organization_value,p_product_id,p_channel_id,publication_status,product_value.slug,
    case when publication_status = 'scheduled' then p_scheduled_at else null end,
    case when publication_status = 'published' then now() else null end,
    now(),'[]'::jsonb,actor_id,actor_id
  ) on conflict (organization_id,product_id,channel_id) do update set
    status = excluded.status,
    slug = excluded.slug,
    scheduled_at = excluded.scheduled_at,
    published_at = case
      when excluded.status = 'published' then now()
      else product_publications.published_at
    end,
    unpublished_at = null,
    last_validated_at = now(),
    validation_errors = '[]'::jsonb,
    updated_by = actor_id,
    updated_at = now();

  update public.products set
    workflow_status = case when publication_status = 'published' then 'published' else 'ready' end,
    status = (case when publication_status = 'published' then 'PUBLISHED' else 'READY_TO_PUBLISH' end)::public.product_status,
    updated_by = actor_id,
    updated_at = now()
  where id = product_value.id and organization_id = organization_value;

  if channel_value.code = 'retail-web' and publication_status = 'published' then
    select item.unit_price,item.compare_at_price into price_value,compare_value
    from public.price_books book
    join public.price_book_items item on item.price_book_id = book.id
    where book.organization_id = organization_value
      and book.channel_id = channel_value.id
      and book.is_default
      and book.is_active
      and item.product_id = product_value.id
      and item.is_active
      and (item.valid_from is null or item.valid_from <= now())
      and (item.valid_until is null or item.valid_until > now())
    order by (item.variant_id is null) desc,item.unit_price asc
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
      title = excluded.title,
      slug = excluded.slug,
      short_description = excluded.short_description,
      description = excluded.description,
      retail_price = excluded.retail_price,
      sale_price = excluded.sale_price,
      listing_status = 'PUBLISHED',
      published_at = now(),
      updated_at = now();
  end if;

  insert into public.audit_logs (
    organization_id,user_id,action,entity_type,entity_id,new_data
  ) values (
    organization_value,actor_id,
    case when publication_status = 'published' then 'PUBLISH_PRODUCT_CHANNEL' else 'SCHEDULE_PRODUCT_CHANNEL' end,
    'product',product_value.id,
    jsonb_build_object('channel_id',channel_value.id,'status',publication_status,'scheduled_at',p_scheduled_at)
  );
  return jsonb_build_object('ok',true,'idempotent',false,'status',publication_status);
end;
$$;

comment on function private.publish_product_channel(uuid,uuid,timestamptz) is
  'SECURITY DEFINER channel publication with canonical publish permission and product category-scope checks.';

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
     or not private.has_permission('product.unpublish')
     or not private.can_view_product_for_operations(p_product_id) then
    raise exception '当前账号没有下架该商品的权限';
  end if;
  select channel.code into channel_code_value
  from public.channels channel
  where channel.id = p_channel_id
    and channel.organization_id = organization_value;
  if not found then
    raise exception '发布渠道不存在';
  end if;

  update public.product_publications set
    status = 'unpublished',
    unpublished_at = now(),
    scheduled_at = null,
    updated_by = actor_id,
    updated_at = now()
  where organization_id = organization_value
    and product_id = p_product_id
    and channel_id = p_channel_id;
  if not found then
    raise exception '该商品尚未创建渠道发布记录';
  end if;

  if channel_code_value = 'retail-web' then
    update public.online_listings set
      listing_status = 'UNPUBLISHED',
      updated_at = now()
    where product_id = p_product_id;
  end if;
  if not exists (
    select 1 from public.product_publications publication
    where publication.organization_id = organization_value
      and publication.product_id = p_product_id
      and publication.status = 'published'
  ) then
    update public.products set
      workflow_status = 'ready',
      status = 'UNPUBLISHED',
      updated_by = actor_id,
      updated_at = now()
    where id = p_product_id and organization_id = organization_value;
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

comment on function private.unpublish_product_channel(uuid,uuid) is
  'SECURITY DEFINER channel unpublish operation with canonical permission and product category-scope checks.';

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
  target_category_id uuid;
  target_brand_id uuid;
  requested_count integer := coalesce(array_length(p_product_ids,1),0);
  matched_count integer;
begin
  if actor_id is null or organization_value is null
     or not private.has_permission('product.view')
     or not private.has_permission('product.edit') then
    raise exception '当前账号没有批量编辑商品的权限';
  end if;
  if requested_count = 0 or requested_count > 100 then
    raise exception '每次请选择 1 至 100 个商品';
  end if;
  if (select count(distinct product_id) from unnest(p_product_ids) product_id) <> requested_count then
    raise exception '批量商品列表包含重复或空的商品 ID';
  end if;
  if p_action not in ('set_category','set_brand','set_featured','archive','restore') then
    raise exception '不支持的批量操作';
  end if;
  -- Legacy compatibility only: products.archive remains the existing archive
  -- capability until the separate permission-key cleanup is completed.
  if p_action in ('archive','restore')
     and not private.has_permission('products.archive') then
    raise exception '当前账号没有归档或恢复商品的权限';
  end if;

  if p_action = 'set_category' then
    target_category_id := nullif(p_value,'')::uuid;
    if target_category_id is null or not exists (
      select 1 from public.categories category
      where category.id = target_category_id
        and category.organization_id = organization_value
        and category.is_active
    ) then
      raise exception '批量分类无效';
    end if;
    if not private.has_category_access(target_category_id) then
      raise exception '当前账号无权将商品批量分配到该分类';
    end if;
  elsif p_action = 'set_brand' then
    target_brand_id := nullif(p_value,'')::uuid;
    if target_brand_id is null or not exists (
      select 1 from public.brands brand
      where brand.id = target_brand_id
        and brand.organization_id = organization_value
        and brand.is_active
    ) then
      raise exception '批量品牌无效';
    end if;
  end if;

  -- Lock and validate the complete set before the first mutation. One unknown,
  -- cross-organization or out-of-scope UUID rejects the entire transaction.
  perform 1
  from public.products product
  where product.id = any(p_product_ids)
    and product.organization_id = organization_value
    and product.deleted_at is null
  order by product.id
  for update;

  select count(*) into matched_count
  from public.products product
  where product.id = any(p_product_ids)
    and product.organization_id = organization_value
    and product.deleted_at is null;
  if matched_count <> requested_count then
    raise exception '批量商品包含不存在或不属于当前组织的记录';
  end if;
  if exists (
    select 1 from public.products product
    where product.id = any(p_product_ids)
      and not private.has_product_operations_scope(product.category_id)
  ) then
    raise exception '批量商品包含当前账号无权编辑的分类';
  end if;

  foreach product_id_value in array p_product_ids loop
    if p_action = 'set_category' then
      update public.products set
        category_id = target_category_id,
        subcategory_id = null,
        workflow_status = 'enriching',
        status = 'PENDING_REVIEW',
        updated_by = actor_id,
        updated_at = now()
      where id = product_id_value and organization_id = organization_value;
    elsif p_action = 'set_brand' then
      update public.products set
        brand_id = target_brand_id,
        updated_by = actor_id,
        updated_at = now()
      where id = product_id_value and organization_id = organization_value;
    elsif p_action = 'set_featured' then
      update public.products set
        is_featured = p_value::boolean,
        updated_by = actor_id,
        updated_at = now()
      where id = product_id_value and organization_id = organization_value;
    elsif p_action = 'archive' then
      update public.product_publications set
        status = 'unpublished',
        unpublished_at = now(),
        updated_by = actor_id,
        updated_at = now()
      where product_id = product_id_value and organization_id = organization_value;
      update public.online_listings set listing_status = 'UNPUBLISHED',updated_at = now()
      where product_id = product_id_value;
      update public.products set
        workflow_status = 'archived',
        status = 'ARCHIVED',
        archived_at = now(),
        updated_by = actor_id,
        updated_at = now()
      where id = product_id_value and organization_id = organization_value;
    elsif p_action = 'restore' then
      update public.products set
        workflow_status = 'enriching',
        status = 'PENDING_REVIEW',
        archived_at = null,
        updated_by = actor_id,
        updated_at = now()
      where id = product_id_value and organization_id = organization_value;
    end if;

    insert into public.audit_logs (
      organization_id,user_id,action,entity_type,entity_id,new_data
    ) values (
      organization_value,actor_id,'BULK_PRODUCT_OPERATION','product',product_id_value,
      jsonb_build_object('action',p_action,'value',p_value)
    );
  end loop;
  return jsonb_build_object('ok',true,'affected_count',requested_count);
end;
$$;

comment on function private.bulk_update_products(uuid[],text,text) is
  'SECURITY DEFINER all-or-nothing bulk editor; every source product and target category is scope checked before mutation.';

-- Keep privileged implementations callable only by authenticated staff. The
-- public API wrappers remain SECURITY INVOKER and expose no service-role key.
revoke all on function private.create_product_draft(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.save_product_operations(uuid,jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.upsert_product_variant(uuid,uuid,uuid,uuid,text,text,boolean,boolean,integer)
  from public, anon, authenticated, service_role;
revoke all on function private.set_product_channel_price(uuid,uuid,uuid,numeric,numeric,timestamptz,timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function private.validate_product_publication(uuid,uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.product_publication_errors(uuid,uuid,uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.publish_product_channel(uuid,uuid,timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function private.unpublish_product_channel(uuid,uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.bulk_update_products(uuid[],text,text)
  from public, anon, authenticated, service_role;
revoke all on function private.register_product_media(uuid,uuid,text,text,bigint,integer,integer,text,text,text,text,boolean)
  from public, anon, authenticated, service_role;
revoke all on function private.soft_delete_product_media(uuid,uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.manage_product_image(uuid,uuid,text)
  from public, anon, authenticated, service_role;

grant execute on function private.create_product_draft(jsonb) to authenticated;
grant execute on function private.save_product_operations(uuid,jsonb) to authenticated;
grant execute on function private.upsert_product_variant(uuid,uuid,uuid,uuid,text,text,boolean,boolean,integer) to authenticated;
grant execute on function private.set_product_channel_price(uuid,uuid,uuid,numeric,numeric,timestamptz,timestamptz) to authenticated;
grant execute on function private.validate_product_publication(uuid,uuid) to authenticated;
grant execute on function private.publish_product_channel(uuid,uuid,timestamptz) to authenticated;
grant execute on function private.unpublish_product_channel(uuid,uuid) to authenticated;
grant execute on function private.bulk_update_products(uuid[],text,text) to authenticated;
grant execute on function private.register_product_media(uuid,uuid,text,text,bigint,integer,integer,text,text,text,text,boolean) to authenticated;
grant execute on function private.soft_delete_product_media(uuid,uuid) to authenticated;
grant execute on function private.manage_product_image(uuid,uuid,text) to authenticated;

revoke all on function public.rpc_create_product_draft(jsonb)
  from public, anon, service_role;
revoke all on function public.rpc_save_product_operations(uuid,jsonb)
  from public, anon, service_role;
revoke all on function public.rpc_upsert_product_variant(uuid,uuid,uuid,uuid,text,text,boolean,boolean,integer)
  from public, anon, service_role;
revoke all on function public.rpc_set_product_channel_price(uuid,uuid,uuid,numeric,numeric,timestamptz,timestamptz)
  from public, anon, service_role;
revoke all on function public.rpc_validate_product_publication(uuid,uuid)
  from public, anon, service_role;
revoke all on function public.rpc_publish_product_channel(uuid,uuid,timestamptz)
  from public, anon, service_role;
revoke all on function public.rpc_unpublish_product_channel(uuid,uuid)
  from public, anon, service_role;
revoke all on function public.rpc_bulk_update_products(uuid[],text,text)
  from public, anon, service_role;
revoke all on function public.rpc_register_product_media(uuid,uuid,text,text,bigint,integer,integer,text,text,text,text,boolean)
  from public, anon, service_role;
revoke all on function public.rpc_soft_delete_product_media(uuid,uuid)
  from public, anon, service_role;
revoke all on function public.manage_product_image(uuid,uuid,text)
  from public, anon, service_role;

grant execute on function public.rpc_create_product_draft(jsonb) to authenticated;
grant execute on function public.rpc_save_product_operations(uuid,jsonb) to authenticated;
grant execute on function public.rpc_upsert_product_variant(uuid,uuid,uuid,uuid,text,text,boolean,boolean,integer) to authenticated;
grant execute on function public.rpc_set_product_channel_price(uuid,uuid,uuid,numeric,numeric,timestamptz,timestamptz) to authenticated;
grant execute on function public.rpc_validate_product_publication(uuid,uuid) to authenticated;
grant execute on function public.rpc_publish_product_channel(uuid,uuid,timestamptz) to authenticated;
grant execute on function public.rpc_unpublish_product_channel(uuid,uuid) to authenticated;
grant execute on function public.rpc_bulk_update_products(uuid[],text,text) to authenticated;
grant execute on function public.rpc_register_product_media(uuid,uuid,text,text,bigint,integer,integer,text,text,text,text,boolean) to authenticated;
grant execute on function public.rpc_soft_delete_product_media(uuid,uuid) to authenticated;
grant execute on function public.manage_product_image(uuid,uuid,text) to authenticated;

-- Phase 2 already removed the legacy public wrappers from authenticated, but
-- the older private implementations still retained direct EXECUTE grants.
-- They are not part of the canonical Product Operations API and must not offer
-- a second SECURITY DEFINER path around the repaired scope checks.
do $$
declare
  legacy_signature regprocedure;
begin
  foreach legacy_signature in array array[
    'private.save_catalog_product(uuid,jsonb,jsonb)'::regprocedure,
    'private.publish_product(uuid)'::regprocedure,
    'private.unpublish_product(uuid)'::regprocedure
  ] loop
    execute format(
      'revoke all on function %s from public, anon, authenticated, service_role',
      legacy_signature
    );
  end loop;
end;
$$;

notify pgrst, 'reload schema';

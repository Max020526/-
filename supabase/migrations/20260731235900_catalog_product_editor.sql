-- Complete product creation/editing workflow for the operations portal.
-- Published product changes are synchronized to the public storefront automatically.

alter table public.products
  add column if not exists is_new boolean not null default true,
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_bestseller boolean not null default false;

create index if not exists online_listings_published_at_idx
  on public.online_listings(published_at desc)
  where listing_status = 'PUBLISHED';

create or replace function private.save_catalog_product(
  p_product_id uuid,
  p_product jsonb,
  p_variants jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_id uuid := p_product_id;
  target_brand_id uuid;
  target_warehouse_id uuid;
  target_status public.product_status;
  variant_data jsonb;
  target_variant_id uuid;
  existing_inventory public.inventory%rowtype;
  quantity_value integer;
  online_limit_value integer;
  threshold_value integer;
  before_quantity integer;
  style_value text := upper(trim(coalesce(p_product->>'style_no', '')));
  name_value text := trim(coalesce(p_product->>'name', ''));
  slug_value text := lower(trim(coalesce(p_product->>'slug', '')));
  brand_value text := trim(coalesce(p_product->>'brand_name', ''));
  retail_value numeric := nullif(p_product->>'retail_price', '')::numeric;
  sale_value numeric := nullif(p_product->>'sale_price', '')::numeric;
begin
  if actor_id is null or not private.has_role(array['OWNER','PRODUCT_MANAGER']) then
    raise exception '没有商品创建或编辑权限';
  end if;
  if jsonb_typeof(p_product) <> 'object' then raise exception '商品资料格式无效'; end if;
  if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) = 0 then
    raise exception '请至少填写一个颜色和尺码规格';
  end if;
  if style_value = '' then raise exception '款号不能为空'; end if;
  if name_value = '' then raise exception '商品名称不能为空'; end if;
  if coalesce(p_product->>'category_id', '') = '' then raise exception '请选择商品分类'; end if;
  if coalesce(retail_value, 0) <= 0 then raise exception '网店零售价必须大于 0'; end if;
  if sale_value is not null and (sale_value <= 0 or sale_value >= retail_value) then
    raise exception '促销价必须大于 0 且低于网店零售价';
  end if;
  if slug_value = '' or slug_value !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'URL Slug 只能包含小写字母、数字和单个连字符';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_variants) item
    group by item->>'color_id', item->>'size_id'
    having count(*) > 1
  ) then raise exception '颜色和尺码组合不能重复'; end if;

  target_warehouse_id := nullif(p_product->>'warehouse_id', '')::uuid;
  if target_warehouse_id is null or not exists (
    select 1 from public.warehouses where id = target_warehouse_id and is_active
  ) then raise exception '请选择有效仓库'; end if;

  if brand_value <> '' then
    insert into public.brands(name) values (brand_value)
    on conflict(name) do update set name = excluded.name
    returning id into target_brand_id;
  else
    target_brand_id := nullif(p_product->>'brand_id', '')::uuid;
  end if;

  if target_id is null then
    insert into public.products(
      style_no,name,subtitle,brand_id,category_id,season,material,origin,
      description,care_instructions,internal_notes,cost_price,wholesale_price,
      suggested_retail_price,retail_price,sale_price,tax_rate,slug,seo_title,
      seo_description,is_new,is_featured,is_bestseller,status,created_by
    ) values (
      style_value,name_value,nullif(trim(p_product->>'subtitle'),''),target_brand_id,
      (p_product->>'category_id')::uuid,nullif(trim(p_product->>'season'),''),
      nullif(trim(p_product->>'material'),''),nullif(trim(p_product->>'origin'),''),
      nullif(trim(p_product->>'description'),''),nullif(trim(p_product->>'care_instructions'),''),
      nullif(trim(p_product->>'internal_notes'),''),nullif(p_product->>'cost_price','')::numeric,
      nullif(p_product->>'wholesale_price','')::numeric,nullif(p_product->>'suggested_retail_price','')::numeric,
      retail_value,sale_value,coalesce(nullif(p_product->>'tax_rate','')::numeric,22),slug_value,
      nullif(trim(p_product->>'seo_title'),''),nullif(trim(p_product->>'seo_description'),''),
      coalesce((p_product->>'is_new')::boolean,true),coalesce((p_product->>'is_featured')::boolean,false),
      coalesce((p_product->>'is_bestseller')::boolean,false),'PENDING_IMAGES',actor_id
    ) returning id,status into target_id,target_status;
  else
    select status into target_status from public.products
      where id = target_id and deleted_at is null for update;
    if not found then raise exception '商品不存在或已经归档'; end if;
    update public.products set
      style_no=style_value,name=name_value,subtitle=nullif(trim(p_product->>'subtitle'),''),
      brand_id=target_brand_id,category_id=(p_product->>'category_id')::uuid,
      season=nullif(trim(p_product->>'season'),''),material=nullif(trim(p_product->>'material'),''),
      origin=nullif(trim(p_product->>'origin'),''),description=nullif(trim(p_product->>'description'),''),
      care_instructions=nullif(trim(p_product->>'care_instructions'),''),
      internal_notes=nullif(trim(p_product->>'internal_notes'),''),
      cost_price=nullif(p_product->>'cost_price','')::numeric,
      wholesale_price=nullif(p_product->>'wholesale_price','')::numeric,
      suggested_retail_price=nullif(p_product->>'suggested_retail_price','')::numeric,
      retail_price=retail_value,sale_price=sale_value,
      tax_rate=coalesce(nullif(p_product->>'tax_rate','')::numeric,22),slug=slug_value,
      seo_title=nullif(trim(p_product->>'seo_title'),''),seo_description=nullif(trim(p_product->>'seo_description'),''),
      is_new=coalesce((p_product->>'is_new')::boolean,true),
      is_featured=coalesce((p_product->>'is_featured')::boolean,false),
      is_bestseller=coalesce((p_product->>'is_bestseller')::boolean,false),
      status=case when target_status='PUBLISHED' then target_status else 'PENDING_REVIEW' end,
      updated_at=now()
    where id=target_id;
  end if;

  for variant_data in select value from jsonb_array_elements(p_variants) loop
    if coalesce(variant_data->>'color_id','')='' or coalesce(variant_data->>'size_id','')='' then
      raise exception '每个规格都必须选择颜色和尺码';
    end if;
    if trim(coalesce(variant_data->>'sku',''))='' then raise exception '每个规格都必须填写 SKU'; end if;
    quantity_value := coalesce(nullif(variant_data->>'quantity_on_hand','')::integer,0);
    online_limit_value := coalesce(nullif(variant_data->>'online_quantity_limit','')::integer,quantity_value);
    threshold_value := coalesce(nullif(variant_data->>'low_stock_threshold','')::integer,5);
    if quantity_value < 0 or online_limit_value < 0 or threshold_value < 0 then
      raise exception '库存、线上可售数量和预警值不能小于 0';
    end if;
    if online_limit_value > quantity_value then raise exception '线上可售数量不能大于实际库存'; end if;

    insert into public.product_variants(product_id,color_id,size_id,sku,barcode,is_active)
    values(target_id,(variant_data->>'color_id')::uuid,(variant_data->>'size_id')::uuid,
      upper(trim(variant_data->>'sku')),nullif(trim(variant_data->>'barcode'),''),
      coalesce((variant_data->>'is_active')::boolean,true))
    on conflict(product_id,color_id,size_id) do update set
      sku=excluded.sku,barcode=excluded.barcode,is_active=excluded.is_active,updated_at=now()
    returning id into target_variant_id;

    select * into existing_inventory from public.inventory
      where inventory.variant_id=target_variant_id and inventory.warehouse_id=target_warehouse_id for update;
    if found then
      if quantity_value < existing_inventory.quantity_reserved then
        raise exception '规格 % 的实际库存不能低于已占用库存', upper(trim(variant_data->>'sku'));
      end if;
      before_quantity := existing_inventory.quantity_on_hand;
      update public.inventory set quantity_on_hand=quantity_value,
        online_quantity_limit=online_limit_value,low_stock_threshold=threshold_value,updated_at=now()
      where id=existing_inventory.id;
    else
      before_quantity := 0;
      insert into public.inventory(variant_id,warehouse_id,quantity_on_hand,online_quantity_limit,low_stock_threshold)
      values(target_variant_id,target_warehouse_id,quantity_value,online_limit_value,threshold_value);
    end if;
    if before_quantity <> quantity_value then
      insert into public.inventory_movements(
        variant_id,warehouse_id,movement_type,quantity_change,quantity_before,quantity_after,
        reference_type,reference_id,notes,created_by
      ) values(
        target_variant_id,target_warehouse_id,'STOCKTAKE_ADJUSTMENT',quantity_value-before_quantity,
        before_quantity,quantity_value,'CATALOG_EDITOR',target_id,'商品窗口库存设置',actor_id
      );
    end if;
  end loop;

  insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
  values(actor_id,case when p_product_id is null then 'CREATE_CATALOG_PRODUCT' else 'UPDATE_CATALOG_PRODUCT' end,
    'product',target_id,jsonb_build_object('style_no',style_value,'variant_count',jsonb_array_length(p_variants)));
  return jsonb_build_object('ok',true,'product_id',target_id,'message','商品资料与规格已保存');
end;
$$;

revoke all on function private.save_catalog_product(uuid,jsonb,jsonb) from public,anon;
grant execute on function private.save_catalog_product(uuid,jsonb,jsonb) to authenticated;

create or replace function public.save_catalog_product(
  p_product_id uuid,
  p_product jsonb,
  p_variants jsonb
) returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.save_catalog_product(p_product_id,p_product,p_variants); $$;

revoke all on function public.save_catalog_product(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.save_catalog_product(uuid,jsonb,jsonb) to authenticated;

create or replace function private.sync_published_product_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status='PUBLISHED' then
    update public.online_listings set
      title=new.name,slug=new.slug,short_description=new.subtitle,description=new.description,
      retail_price=new.retail_price,sale_price=new.sale_price,is_new=new.is_new,
      is_featured=new.is_featured,is_bestseller=new.is_bestseller,updated_at=now()
    where product_id=new.id and listing_status='PUBLISHED';
  end if;
  return new;
end;
$$;

drop trigger if exists sync_published_product_listing on public.products;
create trigger sync_published_product_listing
after update of name,subtitle,slug,description,retail_price,sale_price,is_new,is_featured,is_bestseller
on public.products for each row execute function private.sync_published_product_listing();

create or replace function private.publish_product(p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare p public.products%rowtype; errors text[]:=array[]::text[];
begin
  if (select auth.uid()) is null or not private.has_role(array['OWNER','PRODUCT_MANAGER']) then
    raise exception '没有商品上架权限';
  end if;
  select * into p from public.products where id=p_product_id and deleted_at is null for update;
  if not found then raise exception '商品不存在'; end if;
  if coalesce(trim(p.name),'')='' then errors:=array_append(errors,'商品名称不能为空'); end if;
  if p.category_id is null then errors:=array_append(errors,'请选择商品分类'); end if;
  if coalesce(p.retail_price,0)<=0 then errors:=array_append(errors,'网店零售价必须大于0'); end if;
  if p.sale_price is not null and (p.sale_price<=0 or p.sale_price>=p.retail_price) then errors:=array_append(errors,'促销价必须低于零售价'); end if;
  if coalesce(trim(p.description),'')='' then errors:=array_append(errors,'请填写商品描述'); end if;
  if coalesce(trim(p.slug),'')='' then errors:=array_append(errors,'请设置URL Slug'); end if;
  if not exists(select 1 from public.product_images where product_id=p.id and is_primary) then errors:=array_append(errors,'请至少上传一张商品主图'); end if;
  if not exists(select 1 from public.product_images where product_id=p.id and image_type='DETAIL') then errors:=array_append(errors,'请至少上传一张商品详情图'); end if;
  if not exists(select 1 from public.product_variants where product_id=p.id and is_active) then errors:=array_append(errors,'请至少启用一个SKU'); end if;
  if not exists(
    select 1 from public.product_variants v join public.inventory i on i.variant_id=v.id
    where v.product_id=p.id and v.is_active and least(i.quantity_available,i.online_quantity_limit)>0
  ) then errors:=array_append(errors,'请至少设置一个SKU的网店可售库存'); end if;
  if array_length(errors,1)>0 then raise exception '%',array_to_string(errors,'；'); end if;

  insert into public.online_listings(
    product_id,title,slug,short_description,description,retail_price,sale_price,
    listing_status,is_new,is_featured,is_bestseller,published_at,updated_at
  ) values(
    p.id,p.name,p.slug,p.subtitle,p.description,p.retail_price,p.sale_price,
    'PUBLISHED',p.is_new,p.is_featured,p.is_bestseller,now(),now()
  ) on conflict(product_id) do update set
    title=excluded.title,slug=excluded.slug,short_description=excluded.short_description,
    description=excluded.description,retail_price=excluded.retail_price,sale_price=excluded.sale_price,
    listing_status='PUBLISHED',is_new=excluded.is_new,is_featured=excluded.is_featured,
    is_bestseller=excluded.is_bestseller,published_at=now(),updated_at=now();
  update public.products set status='PUBLISHED',updated_at=now() where id=p.id;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
  values((select auth.uid()),'PUBLISH_PRODUCT','product',p.id,jsonb_build_object('status','PUBLISHED'));
  return jsonb_build_object('ok',true,'message','商品已成功发布到顾客网站');
end;
$$;

notify pgrst,'reload schema';

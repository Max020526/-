-- Size-aware fast posting contract used by the phase-1 warehouse UI.
-- The whole receipt, product/SKU creation, balance update, immutable movement
-- and audit record are committed or rolled back as one PostgreSQL transaction.

create or replace function private.post_fast_inbound_receipt(
  p_items jsonb,
  p_warehouse_id uuid default null,
  p_supplier_id uuid default null,
  p_supplier_reference text default null,
  p_arrival_date date default current_date,
  p_notes text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '15s'
as $$
declare
  caller_id uuid := (select auth.uid());
  organization_id_value uuid := private.current_organization_id();
  warehouse_id_value uuid;
  default_size_id uuid;
  size_id_value uuid;
  size_code_value text;
  receipt_id_value uuid;
  receipt_number_value text;
  product_id_value uuid;
  variant_id_value uuid;
  inventory_value public.inventory%rowtype;
  color_value public.colors%rowtype;
  grouped_item record;
  normalized_model text;
  sku_value text;
  quantity_value integer;
  total_value integer := 0;
  new_products integer := 0;
  new_variants integer := 0;
  existing_receipt public.inbound_orders%rowtype;
begin
  if caller_id is null or organization_id_value is null
     or not private.has_permission('inbound.post') then
    raise exception '当前账号没有确认入库权限';
  end if;
  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 500 then
    raise exception '入库明细必须包含1到500行';
  end if;
  if p_arrival_date is null then raise exception '到货日期不能为空'; end if;

  if nullif(trim(coalesce(p_idempotency_key,'')), '') is not null then
    select * into existing_receipt
    from public.inbound_orders
    where organization_id = organization_id_value
      and created_by = caller_id
      and idempotency_key = trim(p_idempotency_key)
    limit 1;
    if found then
      return jsonb_build_object(
        'receipt_id',existing_receipt.id,
        'inbound_order_id',existing_receipt.id,
        'receipt_no',existing_receipt.inbound_number,
        'inbound_number',existing_receipt.inbound_number,
        'total_quantity',existing_receipt.total_quantity,
        'status',existing_receipt.status,
        'idempotent',true
      );
    end if;
  end if;

  select warehouse.id into warehouse_id_value
  from public.warehouses warehouse
  where warehouse.organization_id = organization_id_value
    and warehouse.is_active
    and (p_warehouse_id is null or warehouse.id = p_warehouse_id)
  order by warehouse.created_at, warehouse.id
  limit 1;
  if warehouse_id_value is null then raise exception '没有可用仓库'; end if;

  if p_supplier_id is not null and not exists (
    select 1 from public.suppliers supplier
    where supplier.id = p_supplier_id
      and supplier.organization_id = organization_id_value
      and supplier.is_active and supplier.deleted_at is null
  ) then raise exception '供应商不存在或已停用'; end if;

  select size.id into default_size_id
  from public.sizes size
  where size.organization_id = organization_id_value
    and size.normalized_name = 'ONE_SIZE' and size.is_active
  limit 1;
  if default_size_id is null then raise exception '缺少默认尺码 ONE_SIZE'; end if;

  for grouped_item in select value from jsonb_array_elements(p_items) loop
    normalized_model := upper(regexp_replace(trim(coalesce(grouped_item.value->>'model_number','')), '\s+', '', 'g'));
    if normalized_model !~ '^[A-Z0-9_-]{2,50}$' then
      raise exception '款号“%”格式不正确',coalesce(grouped_item.value->>'model_number','');
    end if;
    if coalesce(grouped_item.value->>'color_id','') !~ '^[0-9a-fA-F-]{36}$' then
      raise exception '请选择有效颜色';
    end if;
    if nullif(grouped_item.value->>'size_id','') is not null
       and (grouped_item.value->>'size_id') !~ '^[0-9a-fA-F-]{36}$' then
      raise exception '请选择有效尺码';
    end if;
    if coalesce(grouped_item.value->>'quantity','') !~ '^[1-9][0-9]{0,4}$' then
      raise exception '数量必须是1到99999之间的正整数';
    end if;
  end loop;

  receipt_number_value := private.next_inbound_number(p_arrival_date);
  insert into public.inbound_orders(
    organization_id,inbound_number,warehouse_id,supplier_id,arrival_date,
    supplier_reference,status,total_quantity,notes,idempotency_key,
    created_by,confirmed_by,confirmed_at
  ) values (
    organization_id_value,receipt_number_value,warehouse_id_value,p_supplier_id,p_arrival_date,
    nullif(trim(coalesce(p_supplier_reference,'')),''),'posted',0,
    nullif(trim(coalesce(p_notes,'')),''),nullif(trim(coalesce(p_idempotency_key,'')),''),
    caller_id,caller_id,now()
  ) returning id into receipt_id_value;

  for grouped_item in
    select
      upper(regexp_replace(trim(value->>'model_number'), '\s+', '', 'g')) as model_number,
      (value->>'color_id')::uuid as color_id,
      coalesce(nullif(value->>'size_id','')::uuid,default_size_id) as size_id,
      sum((value->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items)
    group by 1,2,3
    order by 1,2,3
  loop
    normalized_model := grouped_item.model_number;
    quantity_value := grouped_item.quantity;
    size_id_value := grouped_item.size_id;
    if quantity_value > 99999 then
      raise exception '款号%同一颜色和尺码的合并数量不能超过99999',normalized_model;
    end if;

    select * into color_value
    from public.colors color
    where color.id = grouped_item.color_id
      and color.organization_id = organization_id_value
      and color.is_active and color.code is not null
    for share;
    if not found then raise exception '所选颜色已停用或没有SKU代码'; end if;

    select case when size.normalized_name = 'ONE_SIZE' then 'ONE'
                else upper(regexp_replace(size.normalized_name,'[^A-Z0-9]+','','g')) end
    into size_code_value
    from public.sizes size
    where size.id = size_id_value
      and size.organization_id = organization_id_value and size.is_active
    for share;
    if size_code_value is null or size_code_value = '' then raise exception '所选尺码已停用'; end if;

    select product.id into product_id_value
    from public.products product
    where product.organization_id = organization_id_value
      and product.style_no = normalized_model and product.deleted_at is null
    for update;
    if product_id_value is null then
      begin
        insert into public.products(organization_id,style_no,model_number,status,created_by)
        values(organization_id_value,normalized_model,normalized_model,'PENDING_DETAILS',caller_id)
        returning id into product_id_value;
        new_products := new_products + 1;
      exception when unique_violation then
        select product.id into product_id_value
        from public.products product
        where product.organization_id = organization_id_value
          and product.style_no = normalized_model and product.deleted_at is null
        for update;
        if product_id_value is null then raise exception '款号%已被其他商品占用',normalized_model; end if;
      end;
    end if;

    sku_value := normalized_model || '-' || upper(color_value.code) || '-' || size_code_value;
    select variant.id,variant.sku into variant_id_value,sku_value
    from public.product_variants variant
    where variant.organization_id = organization_id_value
      and variant.product_id = product_id_value
      and variant.color_id = color_value.id and variant.size_id = size_id_value
    for update;
    if variant_id_value is null then
      begin
        insert into public.product_variants(
          organization_id,product_id,color_id,size_id,sku,is_active,is_visible_online
        ) values (
          organization_id_value,product_id_value,color_value.id,size_id_value,
          sku_value,true,false
        ) returning id into variant_id_value;
        new_variants := new_variants + 1;
      exception when unique_violation then
        raise exception 'SKU % 已存在，请检查商品资料',sku_value;
      end;
    end if;

    insert into public.inventory(organization_id,variant_id,warehouse_id,quantity_on_hand)
    values(organization_id_value,variant_id_value,warehouse_id_value,0)
    on conflict(variant_id,warehouse_id) do nothing;
    select * into inventory_value from public.inventory inventory
    where inventory.organization_id = organization_id_value
      and inventory.variant_id = variant_id_value
      and inventory.warehouse_id = warehouse_id_value
    for update;
    update public.inventory
    set quantity_on_hand = inventory_value.quantity_on_hand + quantity_value,
        updated_at = now()
    where id = inventory_value.id
    returning * into inventory_value;

    insert into public.inbound_order_items(
      organization_id,inbound_order_id,product_id,color_id,size_id,variant_id,sku,
      quantity,quantity_before,quantity_after
    ) values (
      organization_id_value,receipt_id_value,product_id_value,color_value.id,size_id_value,
      variant_id_value,sku_value,quantity_value,
      inventory_value.quantity_on_hand - quantity_value,inventory_value.quantity_on_hand
    );
    insert into public.inventory_movements(
      organization_id,inventory_item_id,variant_id,warehouse_id,movement_type,
      quantity_change,quantity_before,quantity_after,reference_type,reference_id,
      reference_no,reason,created_by
    ) values (
      organization_id_value,inventory_value.id,variant_id_value,warehouse_id_value,'INBOUND',
      quantity_value,inventory_value.quantity_on_hand - quantity_value,inventory_value.quantity_on_hand,
      'INBOUND_RECEIPT',receipt_id_value,receipt_number_value,'快速入库',caller_id
    );
    total_value := total_value + quantity_value;
  end loop;

  update public.inbound_orders set total_quantity = total_value where id = receipt_id_value;
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,new_data)
  values(organization_id_value,caller_id,'POST_INBOUND_RECEIPT','inbound_receipt',receipt_id_value,
    jsonb_build_object('receipt_no',receipt_number_value,'total_quantity',total_value,
      'new_products',new_products,'new_variants',new_variants,'status','posted'));

  return jsonb_build_object(
    'receipt_id',receipt_id_value,'inbound_order_id',receipt_id_value,
    'receipt_no',receipt_number_value,'inbound_number',receipt_number_value,
    'total_quantity',total_value,'new_products',new_products,'new_variants',new_variants,
    'status','posted','idempotent',false
  );
end;
$$;

create or replace function public.rpc_post_inbound_receipt(
  p_items jsonb,
  p_warehouse_id uuid default null,
  p_supplier_id uuid default null,
  p_supplier_reference text default null,
  p_arrival_date date default current_date,
  p_notes text default null,
  p_idempotency_key text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.post_fast_inbound_receipt(
    p_items,p_warehouse_id,p_supplier_id,p_supplier_reference,
    p_arrival_date,p_notes,p_idempotency_key
  );
$$;

revoke all on function private.post_fast_inbound_receipt(jsonb,uuid,uuid,text,date,text,text)
  from public,anon,authenticated;
revoke all on function public.rpc_post_inbound_receipt(jsonb,uuid,uuid,text,date,text,text)
  from public,anon;
grant execute on function public.rpc_post_inbound_receipt(jsonb,uuid,uuid,text,date,text,text)
  to authenticated;

notify pgrst, 'reload schema';

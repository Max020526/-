create or replace function private.confirm_fast_inbound(
  p_items jsonb,
  p_notes text default null,
  p_warehouse_id uuid default null,
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
  warehouse_id_value uuid;
  size_id_value uuid;
  inbound_id_value uuid;
  inbound_number_value text;
  product_id_value uuid;
  variant_id_value uuid;
  inventory_value public.inventory%rowtype;
  color_value public.colors%rowtype;
  grouped_item record;
  normalized_model text;
  sku_value text;
  quantity_value integer;
  total_value integer := 0;
  current_stock_total integer := 0;
  new_products integer := 0;
  new_variants integer := 0;
  was_created boolean;
  existing_order public.inbound_orders%rowtype;
begin
  if caller_id is null or not private.has_app_role(array['employee', 'admin']) then
    raise exception '没有快速入库权限';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = caller_id and p.is_active and p.role in ('employee', 'admin')
  ) then
    raise exception '员工账号已停用或权限无效';
  end if;

  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 500 then
    raise exception '入库明细必须包含1到500行';
  end if;

  if nullif(trim(coalesce(p_idempotency_key, '')), '') is not null then
    select * into existing_order
    from public.inbound_orders
    where created_by = caller_id and idempotency_key = trim(p_idempotency_key)
    limit 1;
    if found then
      return jsonb_build_object(
        'inbound_order_id', existing_order.id,
        'inbound_number', existing_order.inbound_number,
        'total_quantity', existing_order.total_quantity,
        'idempotent', true
      );
    end if;
  end if;

  for grouped_item in select value from jsonb_array_elements(p_items) loop
    normalized_model := upper(regexp_replace(trim(coalesce(grouped_item.value->>'model_number', '')), '\s+', '', 'g'));
    if normalized_model !~ '^[A-Z0-9_-]{2,50}$' then
      raise exception '款号“%”格式不正确', coalesce(grouped_item.value->>'model_number', '');
    end if;
    if coalesce(grouped_item.value->>'color_id', '') !~ '^[0-9a-fA-F-]{36}$' then
      raise exception '请选择有效颜色';
    end if;
    if coalesce(grouped_item.value->>'quantity', '') !~ '^[1-9][0-9]{0,4}$' then
      raise exception '数量必须是1到99999之间的正整数';
    end if;
  end loop;

  if p_warehouse_id is null then
    select w.id into warehouse_id_value
    from public.warehouses w where w.is_active
    order by w.created_at, w.id limit 1;
  else
    select w.id into warehouse_id_value
    from public.warehouses w where w.id = p_warehouse_id and w.is_active;
  end if;
  if warehouse_id_value is null then raise exception '没有可用仓库'; end if;

  select s.id into size_id_value
  from public.sizes s
  where s.normalized_name = 'ONE_SIZE' and s.is_active
  limit 1;
  if size_id_value is null then raise exception '缺少默认尺码 ONE_SIZE'; end if;

  inbound_number_value := private.next_inbound_number(current_date);
  insert into public.inbound_orders(
    inbound_number, warehouse_id, status, total_quantity, notes,
    idempotency_key, created_by, confirmed_by, confirmed_at
  ) values (
    inbound_number_value, warehouse_id_value, 'confirmed', 0,
    nullif(trim(coalesce(p_notes, '')), ''), nullif(trim(coalesce(p_idempotency_key, '')), ''),
    caller_id, caller_id, now()
  ) returning id into inbound_id_value;

  for grouped_item in
    select
      upper(regexp_replace(trim(value->>'model_number'), '\s+', '', 'g')) as model_number,
      (value->>'color_id')::uuid as color_id,
      sum((value->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items)
    group by 1, 2
    order by 1, 2
  loop
    normalized_model := grouped_item.model_number;
    quantity_value := grouped_item.quantity;
    if quantity_value > 99999 then
      raise exception '款号%同一颜色合并后的数量不能超过99999', normalized_model;
    end if;

    select * into color_value
    from public.colors c
    where c.id = grouped_item.color_id and c.is_active and c.code is not null
    for share;
    if not found then raise exception '所选颜色已停用或没有SKU代码'; end if;

    was_created := false;
    select p.id into product_id_value
    from public.products p
    where p.style_no = normalized_model and p.deleted_at is null
    for update;
    if product_id_value is null then
      begin
        insert into public.products(style_no, model_number, status, created_by)
        values(normalized_model, normalized_model, 'PENDING_DETAILS', caller_id)
        returning id into product_id_value;
        new_products := new_products + 1;
      exception when unique_violation then
        select p.id into product_id_value
        from public.products p
        where p.style_no = normalized_model and p.deleted_at is null
        for update;
        if product_id_value is null then raise exception '款号%已被其他商品占用', normalized_model; end if;
      end;
    end if;

    sku_value := normalized_model || '-' || upper(color_value.code);
    select pv.id into variant_id_value
    from public.product_variants pv
    where pv.product_id = product_id_value
      and pv.color_id = color_value.id
      and pv.size_id = size_id_value
    for update;
    if variant_id_value is null then
      begin
        insert into public.product_variants(
          product_id, color_id, size_id, sku, is_active, is_visible_online
        ) values (
          product_id_value, color_value.id, size_id_value, sku_value, true, false
        ) returning id into variant_id_value;
        new_variants := new_variants + 1;
      exception when unique_violation then
        select pv.id into variant_id_value
        from public.product_variants pv
        where pv.product_id = product_id_value
          and pv.color_id = color_value.id
          and pv.size_id = size_id_value
        for update;
        if variant_id_value is null then
          raise exception 'SKU % 已存在，请检查商品资料', sku_value;
        end if;
      end;
    end if;

    insert into public.inventory(variant_id, warehouse_id, quantity_on_hand)
    values(variant_id_value, warehouse_id_value, 0)
    on conflict(variant_id, warehouse_id) do nothing;

    select * into inventory_value
    from public.inventory i
    where i.variant_id = variant_id_value and i.warehouse_id = warehouse_id_value
    for update;

    update public.inventory
    set quantity_on_hand = inventory_value.quantity_on_hand + quantity_value
    where id = inventory_value.id
    returning * into inventory_value;

    insert into public.inbound_order_items(
      inbound_order_id, product_id, color_id, variant_id, sku,
      quantity, quantity_before, quantity_after
    ) values (
      inbound_id_value, product_id_value, color_value.id, variant_id_value, sku_value,
      quantity_value, inventory_value.quantity_on_hand - quantity_value, inventory_value.quantity_on_hand
    );

    insert into public.inventory_movements(
      inventory_item_id, variant_id, warehouse_id, movement_type,
      quantity_change, quantity_before, quantity_after,
      reference_type, reference_id, reference_no, reason, created_by
    ) values (
      inventory_value.id, variant_id_value, warehouse_id_value, 'INBOUND',
      quantity_value, inventory_value.quantity_on_hand - quantity_value, inventory_value.quantity_on_hand,
      'INBOUND_ORDER', inbound_id_value, inbound_number_value, '快速入库', caller_id
    );

    total_value := total_value + quantity_value;
  end loop;

  update public.inbound_orders
  set total_quantity = total_value
  where id = inbound_id_value;

  select coalesce(sum(i.quantity_on_hand), 0)::integer into current_stock_total
  from public.inventory i
  join public.inbound_order_items item on item.variant_id = i.variant_id
  where item.inbound_order_id = inbound_id_value;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, new_data)
  values(
    caller_id, 'CONFIRM_FAST_INBOUND', 'inbound_order', inbound_id_value,
    jsonb_build_object(
      'inbound_number', inbound_number_value,
      'total_quantity', total_value,
      'new_products', new_products,
      'new_variants', new_variants
    )
  );

  return jsonb_build_object(
    'inbound_order_id', inbound_id_value,
    'inbound_number', inbound_number_value,
    'total_quantity', total_value,
    'current_stock_total', current_stock_total,
    'new_products', new_products,
    'new_variants', new_variants,
    'idempotent', false
  );
end;
$$;

revoke all on function private.confirm_fast_inbound(jsonb,text,uuid,text) from public, anon;
grant execute on function private.confirm_fast_inbound(jsonb,text,uuid,text) to authenticated;

create or replace function public.confirm_inbound_order(
  p_items jsonb,
  p_notes text default null,
  p_warehouse_id uuid default null,
  p_idempotency_key text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.confirm_fast_inbound(p_items, p_notes, p_warehouse_id, p_idempotency_key);
$$;

revoke all on function public.confirm_inbound_order(jsonb,text,uuid,text) from public, anon;
grant execute on function public.confirm_inbound_order(jsonb,text,uuid,text) to authenticated;

notify pgrst, 'reload schema';

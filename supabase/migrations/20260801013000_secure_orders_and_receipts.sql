-- Security, concurrency and workflow hardening for orders and stock receipts.

alter table public.orders add column if not exists expires_at timestamptz;
alter table public.orders add column if not exists expired_at timestamptz;

update public.orders
set expires_at = created_at + interval '30 minutes'
where status = 'PENDING_PAYMENT' and expires_at is null;

create index if not exists orders_pending_expiry_idx
on public.orders(expires_at, id)
where status = 'PENDING_PAYMENT';

insert into public.settings(key, value)
values (
  'shop',
  jsonb_build_object(
    'delivery_fee', 6.90,
    'pickup_fee', 0,
    'currency', 'EUR',
    'payment_timeout_minutes', 30,
    'free_shipping_threshold', 99,
    'max_pending_orders_per_customer', 3
  )
)
on conflict (key) do update
set value = public.settings.value || excluded.value,
    updated_at = now();

create or replace function private.expire_stale_orders(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  stale_order record;
  inventory_row record;
  expired_count integer := 0;
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'Invalid expiry batch size';
  end if;

  for stale_order in
    select o.id, o.order_no, o.customer_id
    from public.orders o
    where o.status = 'PENDING_PAYMENT'
      and o.expires_at is not null
      and o.expires_at <= now()
    order by o.expires_at, o.id
    limit p_limit
    for update skip locked
  loop
    -- Always acquire inventory locks in the same order as checkout and shipping.
    for inventory_row in
      select i.id, release_rows.release_quantity
      from public.inventory i
      join (
        select oi.variant_id, oi.warehouse_id, sum(oi.quantity)::integer as release_quantity
        from public.order_items oi
        where oi.order_id = stale_order.id
        group by oi.variant_id, oi.warehouse_id
      ) release_rows
        on release_rows.variant_id = i.variant_id
       and release_rows.warehouse_id = i.warehouse_id
      order by i.id
      for update of i
    loop
      update public.inventory
      set quantity_reserved = greatest(0, quantity_reserved - inventory_row.release_quantity)
      where id = inventory_row.id;
    end loop;

    update public.orders
    set status = 'CANCELLED',
        cancelled_at = now(),
        expired_at = now(),
        expires_at = null
    where id = stale_order.id;

    insert into public.audit_logs(user_id, action, entity_type, entity_id, new_data)
    values (
      null,
      'ORDER_AUTO_EXPIRED',
      'order',
      stale_order.id,
      jsonb_build_object('order_no', stale_order.order_no, 'reason', 'payment_timeout')
    );
    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

revoke all on function private.expire_stale_orders(integer) from public, anon, authenticated, service_role;

create extension if not exists pg_cron;
select cron.schedule(
  'nexora-expire-pending-orders',
  '*/5 * * * *',
  $cron$select private.expire_stale_orders(100);$cron$
);

create or replace function private.create_online_order(
  p_items jsonb,
  p_fulfillment_type text,
  p_shipping_address jsonb,
  p_shipping_fee numeric,
  p_customer_note text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  existing_order record;
  order_id_value uuid;
  line jsonb;
  variant_row public.product_variants%rowtype;
  listing_row public.online_listings%rowtype;
  inventory_row public.inventory%rowtype;
  quantity_value integer;
  item_count integer;
  total_quantity integer;
  subtotal_value numeric := 0;
  unit_value numeric;
  fee_value numeric := 0;
  shop_config jsonb := '{}'::jsonb;
  timeout_minutes integer := 30;
  pending_limit integer := 3;
  free_shipping_threshold numeric := 99;
  expiry_value timestamptz;
begin
  if actor_id is null then raise exception '请先登录'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 or length(p_idempotency_key) > 128 then
    raise exception '订单请求标识无效';
  end if;

  select o.id, o.customer_id into existing_order
  from public.orders o
  where o.idempotency_key = p_idempotency_key;
  if found then
    if existing_order.customer_id <> actor_id then raise exception '订单请求标识无效'; end if;
    return jsonb_build_object('order_id', existing_order.id, 'idempotent', true);
  end if;

  if coalesce(jsonb_typeof(p_items), '') <> 'array' then raise exception '订单商品格式无效'; end if;
  item_count := jsonb_array_length(p_items);
  if item_count < 1 or item_count > 20 then raise exception '每笔订单须包含 1 至 20 个商品规格'; end if;
  if p_fulfillment_type not in ('DELIVERY', 'PICKUP') then raise exception '配送方式无效'; end if;
  if p_fulfillment_type = 'DELIVERY' and (
    p_shipping_address is null
    or nullif(trim(p_shipping_address->>'full_name'), '') is null
    or nullif(trim(p_shipping_address->>'phone'), '') is null
    or nullif(trim(p_shipping_address->>'country'), '') is null
    or nullif(trim(p_shipping_address->>'city'), '') is null
    or nullif(trim(p_shipping_address->>'postal_code'), '') is null
    or nullif(trim(p_shipping_address->>'address_line'), '') is null
  ) then raise exception '请填写完整配送地址'; end if;
  if length(coalesce(p_customer_note, '')) > 500 then raise exception '订单备注不能超过 500 个字符'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) x
    group by x->>'variant_id' having count(*) > 1
  ) then raise exception '订单中存在重复商品规格'; end if;

  select coalesce(sum((x->>'quantity')::integer), 0)::integer into total_quantity
  from jsonb_array_elements(p_items) x;
  if total_quantity < 1 or total_quantity > 30 then raise exception '每笔订单商品总数须在 1 至 30 件之间'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) x
    where (x->>'quantity')::integer < 1 or (x->>'quantity')::integer > 10
  ) then raise exception '同一商品规格每笔最多购买 10 件'; end if;

  perform private.expire_stale_orders(100);
  select coalesce(value, '{}'::jsonb) into shop_config from public.settings where key = 'shop';
  timeout_minutes := greatest(5, least(120, coalesce((shop_config->>'payment_timeout_minutes')::integer, 30)));
  pending_limit := greatest(1, least(10, coalesce((shop_config->>'max_pending_orders_per_customer')::integer, 3)));
  free_shipping_threshold := greatest(0, coalesce((shop_config->>'free_shipping_threshold')::numeric, 99));

  if (select count(*) from public.orders o where o.customer_id = actor_id and o.status = 'PENDING_PAYMENT') >= pending_limit then
    raise exception '您已有待付款订单，请先完成付款或取消后再下单';
  end if;

  expiry_value := now() + make_interval(mins => timeout_minutes);
  insert into public.orders(
    customer_id, subtotal, shipping_fee, total_amount, fulfillment_type,
    shipping_address, customer_note, idempotency_key, expires_at
  ) values (
    actor_id, 0, 0, 0, p_fulfillment_type,
    p_shipping_address, nullif(trim(p_customer_note), ''), p_idempotency_key, expiry_value
  ) returning id into order_id_value;

  for line in
    select value from jsonb_array_elements(p_items)
    order by value->>'variant_id'
  loop
    quantity_value := (line->>'quantity')::integer;
    select * into variant_row
    from public.product_variants
    where id = (line->>'variant_id')::uuid and is_active;
    if not found then raise exception '商品规格不存在或已停用'; end if;

    select l.* into listing_row
    from public.online_listings l
    where l.product_id = variant_row.product_id and l.listing_status = 'PUBLISHED';
    if not found then raise exception '商品未上架或已下架'; end if;

    select i.* into inventory_row
    from public.inventory i
    where i.variant_id = variant_row.id
      and least(i.quantity_available, i.online_quantity_limit) >= quantity_value
    order by i.id
    limit 1
    for update;
    if not found then raise exception '库存不足，无法创建订单'; end if;

    update public.inventory
    set quantity_reserved = quantity_reserved + quantity_value
    where id = inventory_row.id;

    unit_value := coalesce(listing_row.sale_price, listing_row.retail_price);
    subtotal_value := subtotal_value + unit_value * quantity_value;
    insert into public.order_items(
      order_id, variant_id, warehouse_id, product_title, sku,
      color_name, size_name, unit_price, quantity, line_total
    )
    select order_id_value, variant_row.id, inventory_row.warehouse_id, listing_row.title,
      variant_row.sku, c.name, s.name, unit_value, quantity_value, unit_value * quantity_value
    from public.colors c, public.sizes s
    where c.id = variant_row.color_id and s.id = variant_row.size_id;
  end loop;

  fee_value := case
    when p_fulfillment_type = 'PICKUP' then coalesce((shop_config->>'pickup_fee')::numeric, 0)
    when subtotal_value >= free_shipping_threshold then 0
    else coalesce((shop_config->>'delivery_fee')::numeric, 6.90)
  end;

  update public.orders
  set subtotal = subtotal_value,
      shipping_fee = greatest(fee_value, 0),
      total_amount = subtotal_value + greatest(fee_value, 0)
  where id = order_id_value;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, new_data)
  values (
    actor_id, 'CREATE_ORDER', 'order', order_id_value,
    jsonb_build_object(
      'subtotal', subtotal_value,
      'shipping_fee', greatest(fee_value, 0),
      'expires_at', expiry_value,
      'item_count', item_count,
      'total_quantity', total_quantity
    )
  );

  return jsonb_build_object(
    'order_id', order_id_value,
    'idempotent', false,
    'shipping_fee', greatest(fee_value, 0),
    'total_amount', subtotal_value + greatest(fee_value, 0),
    'expires_at', expiry_value
  );
end;
$$;

create or replace function private.transition_order_inventory(
  p_order_id uuid,
  p_target_status public.order_status
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  order_row public.orders%rowtype;
  item_row public.order_items%rowtype;
  inventory_row public.inventory%rowtype;
  before_quantity integer;
begin
  if actor_id is null then raise exception '请先登录'; end if;
  select * into order_row from public.orders where id = p_order_id for update;
  if not found then raise exception '订单不存在'; end if;
  if not (
    order_row.customer_id = actor_id
    and p_target_status = 'CANCELLED'
    and order_row.status = 'PENDING_PAYMENT'
  ) and not private.has_role(array['OWNER', 'ORDER_STAFF']) then
    raise exception '没有订单处理权限';
  end if;

  -- Lock all affected inventory rows in a deterministic order.
  perform i.id
  from public.order_items oi
  join public.inventory i
    on i.variant_id = oi.variant_id and i.warehouse_id = oi.warehouse_id
  where oi.order_id = order_row.id
  order by i.id
  for update of i;

  if p_target_status = 'CANCELLED' then
    if order_row.status in ('CANCELLED', 'SHIPPED', 'COMPLETED', 'REFUNDED') then
      raise exception '当前订单状态不能取消';
    end if;
    for item_row in
      select * from public.order_items where order_id = order_row.id order by variant_id, warehouse_id
    loop
      update public.inventory
      set quantity_reserved = quantity_reserved - item_row.quantity
      where variant_id = item_row.variant_id
        and warehouse_id = item_row.warehouse_id
        and quantity_reserved >= item_row.quantity;
      if not found then raise exception '订单占用库存数据异常，请联系管理员'; end if;
    end loop;
    update public.orders
    set status = 'CANCELLED', cancelled_at = now(), expires_at = null
    where id = order_row.id;
  elsif p_target_status = 'SHIPPED' then
    if order_row.status not in ('PAID', 'PICKING', 'PACKED') then
      raise exception '订单尚未进入可发货状态';
    end if;
    for item_row in
      select * from public.order_items where order_id = order_row.id order by variant_id, warehouse_id
    loop
      select * into inventory_row
      from public.inventory
      where variant_id = item_row.variant_id and warehouse_id = item_row.warehouse_id;
      if not found
        or inventory_row.quantity_reserved < item_row.quantity
        or inventory_row.quantity_on_hand < item_row.quantity then
        raise exception '订单库存数据异常，无法发货';
      end if;
      before_quantity := inventory_row.quantity_on_hand;
      update public.inventory
      set quantity_on_hand = quantity_on_hand - item_row.quantity,
          quantity_reserved = quantity_reserved - item_row.quantity
      where id = inventory_row.id;
      insert into public.inventory_movements(
        variant_id, warehouse_id, movement_type, quantity_change,
        quantity_before, quantity_after, reference_type, reference_id,
        reference_no, created_by
      ) values (
        item_row.variant_id, item_row.warehouse_id, 'ONLINE_SALE', -item_row.quantity,
        before_quantity, before_quantity - item_row.quantity, 'ORDER', order_row.id,
        order_row.order_no, actor_id
      );
    end loop;
    update public.orders
    set status = 'SHIPPED', shipped_at = now(), expires_at = null
    where id = order_row.id;
  else
    raise exception '该库存状态变更不受支持';
  end if;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    actor_id, 'ORDER_STATUS_CHANGE', 'order', order_row.id,
    jsonb_build_object('status', order_row.status),
    jsonb_build_object('status', p_target_status)
  );
  return jsonb_build_object('ok', true, 'status', p_target_status);
end;
$$;

create or replace function private.transition_order_status(
  p_order_id uuid,
  p_target_status public.order_status
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.orders%rowtype;
  allowed boolean := false;
begin
  if (select auth.uid()) is null or not private.has_role(array['OWNER', 'ORDER_STAFF']) then
    raise exception '没有订单处理权限';
  end if;
  select * into order_row from public.orders where id = p_order_id for update;
  if not found then raise exception '订单不存在'; end if;
  if p_target_status in ('CANCELLED', 'SHIPPED') then
    return private.transition_order_inventory(p_order_id, p_target_status);
  end if;
  if order_row.status = 'PENDING_PAYMENT'
    and order_row.expires_at is not null
    and order_row.expires_at <= now() then
    raise exception '订单已超过付款保留时间，请让顾客重新下单';
  end if;
  allowed := case
    when order_row.status = 'PENDING_PAYMENT' and p_target_status = 'PAID' then true
    when order_row.status = 'PAID' and p_target_status = 'PICKING' then true
    when order_row.status = 'PICKING' and p_target_status = 'PACKED' then true
    when order_row.status = 'PACKED' and p_target_status in ('READY_FOR_PICKUP', 'SHIPPED') then true
    when order_row.status in ('SHIPPED', 'READY_FOR_PICKUP') and p_target_status = 'COMPLETED' then true
    when order_row.status = 'REFUND_REQUESTED' and p_target_status = 'REFUNDED' then true
    else false
  end;
  if not allowed then raise exception '不允许从 % 变更为 %', order_row.status, p_target_status; end if;
  update public.orders
  set status = p_target_status,
      payment_status = case
        when p_target_status = 'PAID' then 'PAID'
        when p_target_status = 'REFUNDED' then 'REFUNDED'
        else payment_status
      end,
      paid_at = case when p_target_status = 'PAID' then now() else paid_at end,
      completed_at = case when p_target_status = 'COMPLETED' then now() else completed_at end,
      expires_at = case when p_target_status = 'PAID' then null else expires_at end
  where id = order_row.id;
  insert into public.audit_logs(user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    (select auth.uid()), 'ORDER_STATUS_CHANGE', 'order', order_row.id,
    jsonb_build_object('status', order_row.status),
    jsonb_build_object('status', p_target_status)
  );
  return jsonb_build_object('ok', true, 'status', p_target_status);
end;
$$;

create or replace function private.create_stock_receipt(
  p_header jsonb,
  p_raw_lines jsonb,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  receipt_id_value uuid;
  line jsonb;
  item jsonb;
  expected_total integer;
  exception_total integer;
begin
  if actor_id is null or not private.has_role(array['OWNER', 'WAREHOUSE_STAFF']) then
    raise exception '没有创建入库单权限';
  end if;
  if coalesce(jsonb_typeof(p_header), '') <> 'object'
    or coalesce(jsonb_typeof(p_raw_lines), '') <> 'array'
    or coalesce(jsonb_typeof(p_items), '') <> 'array' then
    raise exception '入库单数据格式无效';
  end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 500 then
    raise exception '每张入库单须包含 1 至 500 条商品明细';
  end if;
  if jsonb_array_length(p_raw_lines) <> jsonb_array_length(p_items) then
    raise exception '入库原始行与商品明细数量不一致';
  end if;
  if not exists (
    select 1 from public.warehouses
    where id = (p_header->>'warehouse_id')::uuid and is_active
  ) then raise exception '仓库不存在或已停用'; end if;

  select coalesce(sum((x->>'expected_quantity')::integer), 0)::integer,
         count(*) filter (where coalesce(x->>'status', 'PENDING') <> 'PENDING')::integer
  into expected_total, exception_total
  from jsonb_array_elements(p_items) x;
  if expected_total < 1 then raise exception '预计入库数量必须大于 0'; end if;

  insert into public.stock_receipts(
    receipt_date, supplier_id, warehouse_id, source_type, status,
    expected_quantity, received_quantity, exception_count, notes, created_by
  ) values (
    coalesce((p_header->>'receipt_date')::date, current_date),
    nullif(p_header->>'supplier_id', '')::uuid,
    (p_header->>'warehouse_id')::uuid,
    nullif(trim(p_header->>'source_type'), ''),
    case when (p_header->>'status') = 'PENDING_REVIEW'
      then 'PENDING_REVIEW'::public.receipt_status
      else 'RECEIVING'::public.receipt_status end,
    expected_total, 0, exception_total,
    nullif(trim(p_header->>'notes'), ''), actor_id
  ) returning id into receipt_id_value;

  for line in select value from jsonb_array_elements(p_raw_lines) order by (value->>'line_number')::integer
  loop
    insert into public.stock_receipt_raw_lines(
      receipt_id, line_number, raw_text, recognized_data, parse_status, error_reason
    ) values (
      receipt_id_value, (line->>'line_number')::integer,
      coalesce(nullif(line->>'raw_text', ''), '—'),
      coalesce(line->'recognized_data', '{}'::jsonb),
      coalesce(nullif(line->>'parse_status', ''), 'PARSED'),
      nullif(line->>'error_reason', '')
    );
  end loop;

  for item in select value from jsonb_array_elements(p_items) order by (value->>'raw_line_number')::integer
  loop
    if (item->>'expected_quantity')::integer < 1 then raise exception '商品数量必须大于 0'; end if;
    insert into public.stock_receipt_items(
      receipt_id, raw_line_number, raw_style_no, normalized_style_no,
      raw_color, normalized_color, raw_size, normalized_size,
      expected_quantity, received_quantity, difference_quantity,
      status, notes, source_metadata
    ) values (
      receipt_id_value, (item->>'raw_line_number')::integer,
      item->>'raw_style_no', item->>'normalized_style_no',
      nullif(item->>'raw_color', ''), item->>'normalized_color',
      nullif(item->>'raw_size', ''), item->>'normalized_size',
      (item->>'expected_quantity')::integer, null, null,
      coalesce(nullif(item->>'status', ''), 'PENDING'),
      nullif(item->>'notes', ''), coalesce(item->'source_metadata', '{}'::jsonb)
    );
  end loop;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, new_data)
  values (
    actor_id, 'CREATE_STOCK_RECEIPT', 'stock_receipt', receipt_id_value,
    jsonb_build_object('items', jsonb_array_length(p_items), 'expected_quantity', expected_total)
  );
  return jsonb_build_object('receipt_id', receipt_id_value);
end;
$$;

create or replace function private.save_received_quantities(
  p_receipt_id uuid,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  receipt_row public.stock_receipts%rowtype;
  item jsonb;
  item_count integer;
  total_received integer := 0;
begin
  if actor_id is null or not private.has_role(array['OWNER', 'WAREHOUSE_STAFF']) then
    raise exception '没有保存实收数量权限';
  end if;
  if coalesce(jsonb_typeof(p_items), '') <> 'array' then raise exception '实收明细格式无效'; end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 500 then
    raise exception '实收明细数量无效';
  end if;

  select * into receipt_row from public.stock_receipts where id = p_receipt_id for update;
  if not found then raise exception '入库单不存在'; end if;
  if receipt_row.status in ('COMPLETED', 'CANCELLED') then raise exception '当前入库单不能修改'; end if;

  select count(*) into item_count from public.stock_receipt_items where receipt_id = p_receipt_id;
  if item_count <> jsonb_array_length(p_items) then raise exception '请提交入库单的全部商品明细'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) x
    group by x->>'id' having count(*) > 1
  ) then raise exception '实收明细存在重复记录'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) x
    left join public.stock_receipt_items sri
      on sri.id = (x->>'id')::uuid and sri.receipt_id = p_receipt_id
    where sri.id is null
      or (x->>'received_quantity')::integer < 0
      or (x->>'received_quantity')::integer > 100000
  ) then raise exception '实收明细包含无效数据'; end if;

  for item in select value from jsonb_array_elements(p_items) order by value->>'id'
  loop
    update public.stock_receipt_items
    set received_quantity = (item->>'received_quantity')::integer,
        difference_quantity = (item->>'received_quantity')::integer - expected_quantity,
        status = 'RECEIVED'
    where id = (item->>'id')::uuid and receipt_id = p_receipt_id;
    total_received := total_received + (item->>'received_quantity')::integer;
  end loop;

  update public.stock_receipts
  set received_quantity = total_received, status = 'READY_TO_CONFIRM'
  where id = p_receipt_id;
  insert into public.audit_logs(user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    actor_id, 'SAVE_RECEIVED_QUANTITIES', 'stock_receipt', p_receipt_id,
    jsonb_build_object('received_quantity', receipt_row.received_quantity),
    jsonb_build_object('received_quantity', total_received)
  );
  return jsonb_build_object('receipt_id', p_receipt_id, 'received_quantity', total_received);
end;
$$;

revoke all on function private.create_online_order(jsonb,text,jsonb,numeric,text,text) from public, anon;
revoke all on function private.transition_order_inventory(uuid,public.order_status) from public, anon;
revoke all on function private.transition_order_status(uuid,public.order_status) from public, anon;
revoke all on function private.create_stock_receipt(jsonb,jsonb,jsonb) from public, anon;
revoke all on function private.save_received_quantities(uuid,jsonb) from public, anon;
grant execute on function private.create_online_order(jsonb,text,jsonb,numeric,text,text) to authenticated;
grant execute on function private.transition_order_inventory(uuid,public.order_status) to authenticated;
grant execute on function private.transition_order_status(uuid,public.order_status) to authenticated;
grant execute on function private.create_stock_receipt(jsonb,jsonb,jsonb) to authenticated;
grant execute on function private.save_received_quantities(uuid,jsonb) to authenticated;

create or replace function public.create_stock_receipt(p_header jsonb, p_raw_lines jsonb, p_items jsonb)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.create_stock_receipt(p_header, p_raw_lines, p_items); $$;

create or replace function public.save_received_quantities(p_receipt_id uuid, p_items jsonb)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.save_received_quantities(p_receipt_id, p_items); $$;

revoke all on function public.create_stock_receipt(jsonb,jsonb,jsonb) from public, anon;
revoke all on function public.save_received_quantities(uuid,jsonb) from public, anon;
grant execute on function public.create_stock_receipt(jsonb,jsonb,jsonb) to authenticated;
grant execute on function public.save_received_quantities(uuid,jsonb) to authenticated;

-- Replace the original all-staff/all-tables policies with domain-level access.
do $$
declare
  table_name_value text;
begin
  foreach table_name_value in array array[
    'brands','categories','suppliers','warehouses','colors','sizes','products',
    'product_variants','product_images','product_tags','product_tag_relations',
    'inventory','stock_receipts','stock_receipt_raw_lines','stock_receipt_items',
    'stock_receipt_exceptions','inventory_movements','stock_adjustments',
    'online_listings','orders','order_items','payments','shipments','returns','notifications'
  ] loop
    execute format('drop policy if exists staff_all_%1$s on public.%1$I', table_name_value);
    execute format(
      'create policy owner_all_%1$s on public.%1$I for all to authenticated using ((select private.has_role(array[''OWNER'']))) with check ((select private.has_role(array[''OWNER''])))',
      table_name_value
    );
    execute format(
      'create policy staff_read_%1$s on public.%1$I for select to authenticated using ((select private.has_role(array[''WAREHOUSE_STAFF'',''PRODUCT_MANAGER'',''ORDER_STAFF''])))',
      table_name_value
    );
  end loop;
end;
$$;

do $$
declare table_name_value text;
begin
  foreach table_name_value in array array[
    'stock_receipts','stock_receipt_raw_lines','stock_receipt_items',
    'stock_receipt_exceptions','inventory_movements','stock_adjustments'
  ] loop
    execute format(
      'create policy warehouse_manage_%1$s on public.%1$I for all to authenticated using ((select private.has_role(array[''WAREHOUSE_STAFF'']))) with check ((select private.has_role(array[''WAREHOUSE_STAFF''])))',
      table_name_value
    );
  end loop;
  foreach table_name_value in array array[
    'brands','categories','colors','sizes','products','product_variants',
    'product_images','product_tags','product_tag_relations','online_listings'
  ] loop
    execute format(
      'create policy product_manager_manage_%1$s on public.%1$I for all to authenticated using ((select private.has_role(array[''PRODUCT_MANAGER'']))) with check ((select private.has_role(array[''PRODUCT_MANAGER''])))',
      table_name_value
    );
  end loop;
end;
$$;

drop policy if exists notifications_self_read on public.notifications;
drop policy if exists notifications_self_update on public.notifications;
create policy notifications_self_read on public.notifications
for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_self_update on public.notifications
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists settings_staff_read on public.settings;
create policy settings_staff_read on public.settings
for select to authenticated
using ((select private.has_role(array['WAREHOUSE_STAFF','PRODUCT_MANAGER','ORDER_STAFF'])));

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on public.online_listings, public.products, public.product_variants,
  public.product_images, public.colors, public.sizes, public.categories, public.inventory
to anon;

revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke all on function private.sync_published_product_listing() from public, anon, authenticated;

notify pgrst, 'reload schema';

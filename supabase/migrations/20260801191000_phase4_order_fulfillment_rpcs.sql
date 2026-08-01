-- NEXORA V1.0 Phase 4 controlled commands.

create or replace function private.assert_command_key(p_key text)
returns text language plpgsql immutable security invoker set search_path='' as $$
begin
  if p_key is null or length(trim(p_key))<12 or length(trim(p_key))>128
     or trim(p_key)!~'^[A-Za-z0-9:_-]+$' then
    raise exception '操作标识无效，请刷新页面后重试';
  end if;
  return trim(p_key);
end;
$$;
revoke all on function private.assert_command_key(text) from public,anon,authenticated;

create or replace function private.finish_business_command(
  p_organization_id uuid,p_key text,p_command text,p_result jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
  update private.business_command_results set result=p_result
  where organization_id=p_organization_id and idempotency_key=p_key and command_type=p_command;
  return p_result;
end;
$$;
revoke all on function private.finish_business_command(uuid,text,text,jsonb) from public,anon,authenticated;

create or replace function private.release_order_stock(
  p_order_id uuid,p_reason text,p_idempotency_key text,p_request_id uuid default gen_random_uuid()
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor_id uuid := (select auth.uid()); order_row public.orders%rowtype; reservation_row record;
  key_value text := private.assert_command_key(p_idempotency_key); existing_result jsonb;
  result_value jsonb; released_quantity integer:=0; customer_allowed boolean:=false;
begin
  if actor_id is null then raise exception '请先登录'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null or length(trim(p_reason))>500 then
    raise exception '取消订单必须填写 1 至 500 字的原因';
  end if;
  select * into order_row from public.orders where id=p_order_id for update;
  if not found then raise exception '订单不存在或无权访问'; end if;
  customer_allowed := order_row.customer_id=actor_id and order_row.lifecycle_status='pending'
    and lower(order_row.payment_status) in ('unpaid','pending');
  if not customer_allowed and not private.has_permission('orders.cancel') then
    raise exception '没有取消订单的权限';
  end if;
  if order_row.organization_id is distinct from coalesce(private.current_organization_id(),order_row.organization_id)
     and not customer_allowed then raise exception '订单不存在或无权访问'; end if;

  select result into existing_result from private.business_command_results
  where organization_id=order_row.organization_id and idempotency_key=key_value and command_type='release_order_stock';
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;
  insert into private.business_command_results(organization_id,idempotency_key,command_type,aggregate_id,actor_id,request_id)
  values(order_row.organization_id,key_value,'release_order_stock',order_row.id,actor_id,p_request_id)
  on conflict do nothing;
  select result into existing_result from private.business_command_results
  where organization_id=order_row.organization_id and idempotency_key=key_value and command_type='release_order_stock' for update;
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;

  if order_row.lifecycle_status='cancelled' then
    result_value:=jsonb_build_object('order_id',order_row.id,'status','cancelled','released_quantity',0,'idempotent',true);
    return private.finish_business_command(order_row.organization_id,key_value,'release_order_stock',result_value);
  end if;
  if order_row.lifecycle_status='completed' or order_row.fulfillment_status in ('shipped','delivered','picked_up') then
    raise exception '订单已发货、已领取或已完成，不能直接取消';
  end if;

  for reservation_row in
    select reservation.*,inventory.quantity_reserved
    from public.stock_reservations reservation
    join public.inventory inventory on inventory.id=reservation.inventory_id
    where reservation.order_id=order_row.id and reservation.status='active'
    order by reservation.inventory_id,reservation.id for update of reservation,inventory
  loop
    update public.inventory set quantity_reserved=quantity_reserved-reservation_row.quantity
    where id=reservation_row.inventory_id and quantity_reserved>=reservation_row.quantity;
    if not found then raise exception '订单预占库存异常，取消操作已回滚'; end if;
    update public.stock_reservations set status='released',released_at=now()
    where id=reservation_row.id and status='active';
    insert into public.inventory_movements(
      organization_id,inventory_item_id,variant_id,warehouse_id,movement_type,quantity_change,
      quantity_before,quantity_after,reserved_before,reserved_after,balance_dimension,
      reference_type,reference_id,reference_no,reason,created_by,request_id
    ) values(
      order_row.organization_id,reservation_row.inventory_id,reservation_row.variant_id,reservation_row.warehouse_id,
      'RESERVATION_RELEASE',-reservation_row.quantity,reservation_row.quantity_reserved,
      reservation_row.quantity_reserved-reservation_row.quantity,reservation_row.quantity_reserved,
      reservation_row.quantity_reserved-reservation_row.quantity,'reserved','ORDER',order_row.id,order_row.order_no,
      trim(p_reason),actor_id,p_request_id
    );
    released_quantity:=released_quantity+reservation_row.quantity;
  end loop;

  update public.orders set lifecycle_status='cancelled',fulfillment_status='unfulfilled',status='CANCELLED',
    cancelled_at=now(),cancellation_reason=trim(p_reason),expires_at=null,updated_by=actor_id
  where id=order_row.id;
  update public.shipments set status='cancelled',updated_at=now()
  where order_id=order_row.id and status not in ('delivered','picked_up','cancelled');
  insert into public.order_events(organization_id,order_id,event_type,public_message_zh,internal_data,actor_id,request_id)
  values(order_row.organization_id,order_row.id,'order_cancelled','订单已取消，库存预占已释放',
    jsonb_build_object('reason',trim(p_reason),'released_quantity',released_quantity),actor_id,p_request_id);
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,old_data,new_data)
  values(order_row.organization_id,actor_id,'CANCEL_ORDER','order',order_row.id,
    jsonb_build_object('lifecycle_status',order_row.lifecycle_status,'fulfillment_status',order_row.fulfillment_status),
    jsonb_build_object('lifecycle_status','cancelled','released_quantity',released_quantity,'reason',trim(p_reason),'request_id',p_request_id));
  insert into public.outbox_events(organization_id,aggregate_type,aggregate_id,event_type,payload,idempotency_key)
  values(order_row.organization_id,'order',order_row.id,'order.cancelled',jsonb_build_object('order_no',order_row.order_no),key_value||':cancelled')
  on conflict do nothing;
  result_value:=jsonb_build_object('order_id',order_row.id,'status','cancelled','released_quantity',released_quantity,'idempotent',false);
  return private.finish_business_command(order_row.organization_id,key_value,'release_order_stock',result_value);
end;
$$;
revoke all on function private.release_order_stock(uuid,text,text,uuid) from public,anon,authenticated,service_role;

create or replace function public.rpc_release_order_stock(
  p_order_id uuid,p_reason text,p_idempotency_key text,p_request_id uuid default gen_random_uuid()
) returns jsonb language sql security invoker set search_path='' as $$
  select private.release_order_stock(p_order_id,p_reason,p_idempotency_key,p_request_id);
$$;
revoke all on function public.rpc_release_order_stock(uuid,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.rpc_release_order_stock(uuid,text,text,uuid) to authenticated,service_role;

create or replace function private.consume_order_stock(
  p_order_id uuid,p_shipment_id uuid,p_idempotency_key text,p_request_id uuid default gen_random_uuid()
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor_id uuid := (select auth.uid()); order_row public.orders%rowtype; shipment_row public.shipments%rowtype;
  reservation_row record; key_value text:=private.assert_command_key(p_idempotency_key);
  existing_result jsonb; result_value jsonb; consumed_quantity integer:=0;
  expected_quantity integer; reserved_quantity integer;
begin
  if actor_id is null or not private.has_permission('fulfillment.manage') then raise exception '没有执行出库的权限'; end if;
  select * into order_row from public.orders where id=p_order_id and organization_id=private.current_organization_id() for update;
  if not found then raise exception '订单不存在或无权访问'; end if;
  select * into shipment_row from public.shipments where id=p_shipment_id and order_id=order_row.id for update;
  if not found then raise exception '履约单不存在或与订单不匹配'; end if;
  select result into existing_result from private.business_command_results
  where organization_id=order_row.organization_id and idempotency_key=key_value and command_type='consume_order_stock';
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;
  insert into private.business_command_results(organization_id,idempotency_key,command_type,aggregate_id,actor_id,request_id)
  values(order_row.organization_id,key_value,'consume_order_stock',order_row.id,actor_id,p_request_id) on conflict do nothing;
  select result into existing_result from private.business_command_results
  where organization_id=order_row.organization_id and idempotency_key=key_value and command_type='consume_order_stock' for update;
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;

  if order_row.fulfillment_type='DELIVERY' and order_row.fulfillment_status<>'packed' then
    raise exception '只有已完成打包的配送订单才能发货';
  elsif order_row.fulfillment_type='PICKUP' and order_row.fulfillment_status<>'ready_pickup' then
    raise exception '只有已备货的自提订单才能确认领取';
  end if;
  select coalesce(sum(quantity),0) into expected_quantity from public.order_items where order_id=order_row.id;
  select coalesce(sum(quantity),0) into reserved_quantity from public.stock_reservations
    where order_id=order_row.id and status='active';
  if expected_quantity<1 or reserved_quantity<>expected_quantity then raise exception '订单预占明细不完整，出库已回滚'; end if;

  for reservation_row in
    select reservation.*,inventory.quantity_on_hand,inventory.quantity_reserved
    from public.stock_reservations reservation join public.inventory inventory on inventory.id=reservation.inventory_id
    where reservation.order_id=order_row.id and reservation.status='active'
    order by reservation.inventory_id,reservation.id for update of reservation,inventory
  loop
    update public.inventory set quantity_on_hand=quantity_on_hand-reservation_row.quantity,
      quantity_reserved=quantity_reserved-reservation_row.quantity
    where id=reservation_row.inventory_id and quantity_on_hand>=reservation_row.quantity
      and quantity_reserved>=reservation_row.quantity;
    if not found then raise exception '库存不足或预占异常，出库已回滚'; end if;
    update public.stock_reservations set status='consumed',consumed_at=now() where id=reservation_row.id and status='active';
    insert into public.inventory_movements(
      organization_id,inventory_item_id,variant_id,warehouse_id,movement_type,quantity_change,
      quantity_before,quantity_after,reserved_before,reserved_after,balance_dimension,
      reference_type,reference_id,reference_no,reason,created_by,request_id
    ) values(
      order_row.organization_id,reservation_row.inventory_id,reservation_row.variant_id,reservation_row.warehouse_id,
      'SALE',-reservation_row.quantity,reservation_row.quantity_on_hand,
      reservation_row.quantity_on_hand-reservation_row.quantity,reservation_row.quantity_reserved,
      reservation_row.quantity_reserved-reservation_row.quantity,'on_hand','SHIPMENT',shipment_row.id,order_row.order_no,
      case when order_row.fulfillment_type='PICKUP' then '门店自提完成' else '订单发货出库' end,actor_id,p_request_id
    );
    consumed_quantity:=consumed_quantity+reservation_row.quantity;
  end loop;

  if order_row.fulfillment_type='PICKUP' then
    update public.shipments set status='picked_up',picked_up_at=now(),completed_by=actor_id where id=shipment_row.id;
    update public.orders set lifecycle_status='completed',fulfillment_status='picked_up',status='COMPLETED',
      picked_up_at=now(),completed_at=now(),updated_by=actor_id where id=order_row.id;
  else
    update public.shipments set status='shipped',shipped_at=now(),shipped_by=actor_id where id=shipment_row.id;
    update public.orders set lifecycle_status='processing',fulfillment_status='shipped',status='SHIPPED',
      shipped_at=now(),updated_by=actor_id where id=order_row.id;
  end if;
  insert into public.order_events(organization_id,order_id,event_type,public_message_zh,internal_data,actor_id,request_id)
  values(order_row.organization_id,order_row.id,
    case when order_row.fulfillment_type='PICKUP' then 'order_picked_up' else 'order_shipped' end,
    case when order_row.fulfillment_type='PICKUP' then '订单已领取' else '订单已发货' end,
    jsonb_build_object('shipment_id',shipment_row.id,'quantity',consumed_quantity),actor_id,p_request_id);
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,old_data,new_data)
  values(order_row.organization_id,actor_id,'CONSUME_ORDER_STOCK','order',order_row.id,
    jsonb_build_object('fulfillment_status',order_row.fulfillment_status),
    jsonb_build_object('fulfillment_status',case when order_row.fulfillment_type='PICKUP' then 'picked_up' else 'shipped' end,
      'quantity',consumed_quantity,'request_id',p_request_id));
  insert into public.outbox_events(organization_id,aggregate_type,aggregate_id,event_type,payload,idempotency_key)
  values(order_row.organization_id,'order',order_row.id,
    case when order_row.fulfillment_type='PICKUP' then 'order.picked_up' else 'order.shipped' end,
    jsonb_build_object('order_no',order_row.order_no,'shipment_id',shipment_row.id),key_value||':fulfilled') on conflict do nothing;
  result_value:=jsonb_build_object('order_id',order_row.id,'shipment_id',shipment_row.id,
    'fulfillment_status',case when order_row.fulfillment_type='PICKUP' then 'picked_up' else 'shipped' end,
    'consumed_quantity',consumed_quantity,'idempotent',false);
  return private.finish_business_command(order_row.organization_id,key_value,'consume_order_stock',result_value);
end;
$$;
revoke all on function private.consume_order_stock(uuid,uuid,text,uuid) from public,anon,authenticated,service_role;

create or replace function public.rpc_consume_order_stock(
  p_order_id uuid,p_shipment_id uuid,p_idempotency_key text,p_request_id uuid default gen_random_uuid()
) returns jsonb language sql security invoker set search_path='' as $$
  select private.consume_order_stock(p_order_id,p_shipment_id,p_idempotency_key,p_request_id);
$$;
revoke all on function public.rpc_consume_order_stock(uuid,uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.rpc_consume_order_stock(uuid,uuid,text,uuid) to authenticated,service_role;

create or replace function private.execute_order_command(
  p_order_id uuid,p_command text,p_payload jsonb,p_idempotency_key text,p_request_id uuid default gen_random_uuid()
) returns jsonb language plpgsql security definer set search_path='extensions' as $$
declare
  actor_id uuid:=(select auth.uid()); order_row public.orders%rowtype; shipment_row public.shipments%rowtype;
  key_value text:=private.assert_command_key(p_idempotency_key); existing_result jsonb; result_value jsonb;
  command_value text:=lower(trim(coalesce(p_command,''))); payment_amount numeric(12,2);
  exception_id uuid; pickup_code text; note_value text; item_id_value uuid; quantity_value integer;
begin
  if actor_id is null then raise exception '请先登录'; end if;
  select * into order_row from public.orders where id=p_order_id and organization_id=private.current_organization_id() for update;
  if not found then raise exception '订单不存在或无权访问'; end if;
  if command_value='cancel' then
    return private.release_order_stock(order_row.id,p_payload->>'reason',key_value,p_request_id);
  end if;
  if command_value in ('ship','confirm_pickup') then
    select * into shipment_row from public.shipments where order_id=order_row.id and status<>'cancelled' for update;
    if not found then raise exception '履约单不存在'; end if;
    if command_value='ship' then
      if order_row.fulfillment_type<>'DELIVERY' then raise exception '自提订单不能执行发货'; end if;
      if nullif(trim(coalesce(p_payload->>'carrier','')),'') is null
         or nullif(trim(coalesce(p_payload->>'tracking_no','')),'') is null then raise exception '请填写承运商和物流单号'; end if;
      update public.shipments set carrier=left(trim(p_payload->>'carrier'),120),tracking_no=left(trim(p_payload->>'tracking_no'),160)
      where id=shipment_row.id;
    else
      if order_row.fulfillment_type<>'PICKUP' then raise exception '配送订单不能执行自提核销'; end if;
      if shipment_row.pickup_code_hash is not null and encode(digest(trim(coalesce(p_payload->>'pickup_code','')),'sha256'),'hex')<>shipment_row.pickup_code_hash then
        raise exception '领取码不正确';
      end if;
    end if;
    return private.consume_order_stock(order_row.id,shipment_row.id,key_value,p_request_id);
  end if;
  if command_value in ('confirm_order','record_payment','add_note') then
    if not private.has_permission('orders.manage') then raise exception '没有处理订单的权限'; end if;
  elsif command_value in ('start_picking','confirm_pick_item','pack','ready_pickup','confirm_delivery','record_exception','resolve_exception') then
    if not private.has_permission('fulfillment.manage') then raise exception '没有处理履约任务的权限'; end if;
  else raise exception '不支持的订单操作'; end if;

  select result into existing_result from private.business_command_results
  where organization_id=order_row.organization_id and idempotency_key=key_value and command_type='order:'||command_value;
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;
  insert into private.business_command_results(organization_id,idempotency_key,command_type,aggregate_id,actor_id,request_id)
  values(order_row.organization_id,key_value,'order:'||command_value,order_row.id,actor_id,p_request_id) on conflict do nothing;
  select result into existing_result from private.business_command_results
  where organization_id=order_row.organization_id and idempotency_key=key_value and command_type='order:'||command_value for update;
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;

  case command_value
    when 'confirm_order' then
      if order_row.lifecycle_status<>'pending' then raise exception '只有待确认订单可以确认'; end if;
      update public.orders set lifecycle_status='confirmed',confirmed_at=now(),updated_by=actor_id where id=order_row.id;
      result_value:=jsonb_build_object('order_id',order_row.id,'lifecycle_status','confirmed');
    when 'record_payment' then
      if lower(order_row.payment_status) not in ('unpaid','pending','failed') then raise exception '当前付款状态不能再次确认'; end if;
      payment_amount:=coalesce(nullif(p_payload->>'amount','')::numeric,order_row.total_amount);
      if payment_amount<>order_row.total_amount then raise exception 'V1 仅支持整单确认付款，金额必须等于订单应付金额'; end if;
      insert into public.payments(order_id,organization_id,provider,provider_reference,amount,status,paid_at,currency,payment_method,idempotency_key,verified_by)
      values(order_row.id,order_row.organization_id,'manual',nullif(trim(p_payload->>'reference'),''),payment_amount,'paid',now(),
        order_row.currency,coalesce(nullif(trim(p_payload->>'method'),''),'manual_verified'),key_value,actor_id);
      update public.orders set payment_status='paid',paid_at=now(),expires_at=null,
        lifecycle_status=case when lifecycle_status='pending' then 'confirmed' else lifecycle_status end,
        confirmed_at=coalesce(confirmed_at,now()),status='PAID',updated_by=actor_id where id=order_row.id;
      result_value:=jsonb_build_object('order_id',order_row.id,'payment_status','paid','amount',payment_amount);
    when 'start_picking' then
      if order_row.lifecycle_status<>'confirmed' or lower(order_row.payment_status)<>'paid'
         or order_row.fulfillment_status<>'reserved' then raise exception '订单必须已确认、已付款且库存已预占才能开始拣货'; end if;
      insert into public.shipments(order_id,organization_id,warehouse_id,fulfillment_method,status,idempotency_key)
      select order_row.id,order_row.organization_id,min(item.warehouse_id),order_row.fulfillment_type,'picking',key_value
      from public.order_items item where item.order_id=order_row.id returning * into shipment_row;
      insert into public.shipment_items(organization_id,shipment_id,order_item_id,quantity)
      select order_row.organization_id,shipment_row.id,item.id,item.quantity from public.order_items item where item.order_id=order_row.id;
      update public.orders set lifecycle_status='processing',fulfillment_status='picking',processing_at=now(),status='PICKING',updated_by=actor_id where id=order_row.id;
      result_value:=jsonb_build_object('order_id',order_row.id,'shipment_id',shipment_row.id,'fulfillment_status','picking');
    when 'confirm_pick_item' then
      if order_row.fulfillment_status<>'picking' then raise exception '订单当前不在拣货中'; end if;
      item_id_value:=(p_payload->>'order_item_id')::uuid;
      quantity_value:=(p_payload->>'quantity')::integer;
      update public.shipment_items set picked_quantity=quantity_value,picked_by=actor_id,picked_at=now()
      where shipment_id=(select id from public.shipments where order_id=order_row.id and status<>'cancelled')
        and order_item_id=item_id_value and quantity_value between 0 and quantity;
      if not found then raise exception '拣货行或数量无效'; end if;
      result_value:=jsonb_build_object('order_id',order_row.id,'order_item_id',item_id_value,'picked_quantity',quantity_value);
    when 'pack' then
      if order_row.fulfillment_status<>'picking' then raise exception '只有拣货中的订单可以打包'; end if;
      select * into shipment_row from public.shipments where order_id=order_row.id and status<>'cancelled' for update;
      if exists(select 1 from public.shipment_items where shipment_id=shipment_row.id and picked_quantity<>quantity) then raise exception '仍有商品未完成拣货确认'; end if;
      if exists(select 1 from public.fulfillment_exceptions where order_id=order_row.id and status='open') then raise exception '请先处理履约异常再打包'; end if;
      update public.shipment_items set verified_quantity=quantity,verified_by=actor_id,verified_at=now() where shipment_id=shipment_row.id;
      update public.shipments set status='packed',packed_at=now(),packed_by=actor_id where id=shipment_row.id;
      update public.orders set fulfillment_status='packed',status='PACKED',updated_by=actor_id where id=order_row.id;
      result_value:=jsonb_build_object('order_id',order_row.id,'shipment_id',shipment_row.id,'fulfillment_status','packed');
    when 'ready_pickup' then
      if order_row.fulfillment_type<>'PICKUP' or order_row.fulfillment_status<>'packed' then raise exception '只有已打包的自提订单可以进入待领取'; end if;
      pickup_code:=upper(substr(encode(digest(gen_random_uuid()::text,'sha256'),'hex'),1,6));
      update public.shipments set status='ready_pickup',ready_at=now(),notified_at=now(),pickup_code_hash=encode(digest(pickup_code,'sha256'),'hex')
      where order_id=order_row.id and status='packed' returning * into shipment_row;
      if not found then raise exception '履约单状态异常'; end if;
      update public.orders set fulfillment_status='ready_pickup',status='READY_FOR_PICKUP',ready_pickup_at=now(),updated_by=actor_id where id=order_row.id;
      insert into public.outbox_events(organization_id,aggregate_type,aggregate_id,event_type,payload,idempotency_key)
      values(order_row.organization_id,'order',order_row.id,'pickup.ready',jsonb_build_object('order_no',order_row.order_no),key_value||':pickup-ready') on conflict do nothing;
      result_value:=jsonb_build_object('order_id',order_row.id,'shipment_id',shipment_row.id,'fulfillment_status','ready_pickup','pickup_code',pickup_code);
    when 'confirm_delivery' then
      if order_row.fulfillment_type<>'DELIVERY' or order_row.fulfillment_status<>'shipped' then raise exception '只有已发货配送订单可以确认送达'; end if;
      update public.shipments set status='delivered',delivered_at=now(),completed_by=actor_id where order_id=order_row.id and status='shipped';
      update public.orders set lifecycle_status='completed',fulfillment_status='delivered',status='COMPLETED',delivered_at=now(),completed_at=now(),updated_by=actor_id where id=order_row.id;
      result_value:=jsonb_build_object('order_id',order_row.id,'lifecycle_status','completed','fulfillment_status','delivered');
    when 'record_exception' then
      if order_row.fulfillment_status not in ('picking','packed') then raise exception '当前订单不能登记履约异常'; end if;
      if coalesce(p_payload->>'type','') not in ('shortage','wrong_item','damaged','not_found','scan_mismatch','other') then raise exception '异常类型无效'; end if;
      note_value:=nullif(trim(p_payload->>'notes'),''); if note_value is null then raise exception '请填写异常说明'; end if;
      insert into public.fulfillment_exceptions(organization_id,order_id,shipment_id,order_item_id,exception_type,quantity,notes,created_by)
      values(order_row.organization_id,order_row.id,(select id from public.shipments where order_id=order_row.id and status<>'cancelled'),
        nullif(p_payload->>'order_item_id','')::uuid,p_payload->>'type',nullif(p_payload->>'quantity','')::integer,left(note_value,1000),actor_id)
      returning id into exception_id;
      result_value:=jsonb_build_object('order_id',order_row.id,'exception_id',exception_id,'status','open');
    when 'resolve_exception' then
      exception_id:=(p_payload->>'exception_id')::uuid; note_value:=nullif(trim(p_payload->>'resolution'),'');
      if note_value is null then raise exception '请填写异常处理结果'; end if;
      update public.fulfillment_exceptions set status='resolved',resolution=left(note_value,1000),resolved_by=actor_id,resolved_at=now()
      where id=exception_id and order_id=order_row.id and status='open'; if not found then raise exception '异常不存在或已处理'; end if;
      result_value:=jsonb_build_object('order_id',order_row.id,'exception_id',exception_id,'status','resolved');
    when 'add_note' then
      note_value:=nullif(trim(p_payload->>'content'),''); if note_value is null or length(note_value)>2000 then raise exception '备注须为 1 至 2000 个字符'; end if;
      insert into public.order_notes(organization_id,order_id,note_type,content,created_by)
      values(order_row.organization_id,order_row.id,case when p_payload->>'note_type'='customer_contact' then 'customer_contact' else 'internal' end,note_value,actor_id);
      result_value:=jsonb_build_object('order_id',order_row.id,'note_saved',true);
  end case;

  insert into public.order_events(organization_id,order_id,event_type,public_message_zh,internal_data,actor_id,request_id)
  values(order_row.organization_id,order_row.id,'order_'||command_value,
    case command_value when 'confirm_order' then '订单已确认' when 'record_payment' then '付款已核验'
      when 'start_picking' then '仓库开始拣货' when 'pack' then '订单已完成打包'
      when 'ready_pickup' then '订单已备好，可到店领取' when 'confirm_delivery' then '订单已送达'
      else null end,p_payload-'pickup_code',actor_id,p_request_id);
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,old_data,new_data)
  values(order_row.organization_id,actor_id,upper(command_value),'order',order_row.id,
    jsonb_build_object('lifecycle_status',order_row.lifecycle_status,'payment_status',order_row.payment_status,'fulfillment_status',order_row.fulfillment_status),
    result_value||jsonb_build_object('request_id',p_request_id));
  return private.finish_business_command(order_row.organization_id,key_value,'order:'||command_value,result_value||jsonb_build_object('idempotent',false));
end;
$$;
revoke all on function private.execute_order_command(uuid,text,jsonb,text,uuid) from public,anon,authenticated,service_role;

create or replace function public.rpc_order_command(
  p_order_id uuid,p_command text,p_payload jsonb default '{}'::jsonb,p_idempotency_key text default null,p_request_id uuid default gen_random_uuid()
) returns jsonb language sql security invoker set search_path='' as $$
  select private.execute_order_command(p_order_id,p_command,coalesce(p_payload,'{}'::jsonb),p_idempotency_key,p_request_id);
$$;
revoke all on function public.rpc_order_command(uuid,text,jsonb,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.rpc_order_command(uuid,text,jsonb,text,uuid) to authenticated,service_role;

create or replace function private.request_return(
  p_order_id uuid,p_items jsonb,p_reason text,p_customer_note text,p_idempotency_key text,p_request_id uuid default gen_random_uuid()
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=(select auth.uid()); order_row public.orders%rowtype; line jsonb; order_item_row public.order_items%rowtype;
  key_value text:=private.assert_command_key(p_idempotency_key); existing_result jsonb; result_value jsonb;
  return_id_value uuid; return_no_value text; requested_quantity integer; prior_quantity integer;
begin
  if actor_id is null then raise exception '请先登录后申请退货'; end if;
  select * into order_row from public.orders where id=p_order_id for update;
  if not found or (order_row.customer_id<>actor_id and not private.has_permission('returns.manage')) then raise exception '订单不存在或无权申请退货'; end if;
  if order_row.lifecycle_status<>'completed' then raise exception '订单完成后才能申请退货'; end if;
  if order_row.completed_at is not null and order_row.completed_at<now()-interval '30 days' then raise exception '该订单已超过 30 天退货申请期限'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>50 then raise exception '请选择需要退货的商品'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null or length(trim(p_reason))>500 then raise exception '请填写退货原因'; end if;
  select result into existing_result from private.business_command_results where organization_id=order_row.organization_id and idempotency_key=key_value and command_type='request_return';
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;
  insert into private.business_command_results(organization_id,idempotency_key,command_type,aggregate_id,actor_id,request_id)
  values(order_row.organization_id,key_value,'request_return',order_row.id,actor_id,p_request_id) on conflict do nothing;
  select result into existing_result from private.business_command_results where organization_id=order_row.organization_id and idempotency_key=key_value and command_type='request_return' for update;
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;
  return_no_value:='RET-'||to_char(clock_timestamp(),'YYYYMMDD')||'-'||lpad(nextval('public.return_number_sequence')::text,6,'0');
  insert into public.returns(order_id,organization_id,return_no,status,reason,customer_note,created_by,request_id,idempotency_key)
  values(order_row.id,order_row.organization_id,return_no_value,'requested',trim(p_reason),nullif(trim(p_customer_note),''),actor_id,p_request_id,key_value)
  returning id into return_id_value;
  for line in select value from jsonb_array_elements(p_items) loop
    select * into order_item_row from public.order_items where id=(line->>'order_item_id')::uuid and order_id=order_row.id;
    if not found or coalesce(line->>'quantity','')!~'^[0-9]+$' then raise exception '退货商品行无效'; end if;
    requested_quantity:=(line->>'quantity')::integer;
    select coalesce(sum(item.quantity),0) into prior_quantity from public.return_items item
    join public.returns return_record on return_record.id=item.return_id
    where item.order_item_id=order_item_row.id and return_record.status<>'rejected';
    if requested_quantity<1 or requested_quantity+prior_quantity>order_item_row.quantity then raise exception '退货数量超过该商品可退数量'; end if;
    insert into public.return_items(organization_id,return_id,order_item_id,variant_id,warehouse_id,quantity,reason)
    values(order_row.organization_id,return_id_value,order_item_row.id,order_item_row.variant_id,order_item_row.warehouse_id,
      requested_quantity,coalesce(nullif(trim(line->>'reason'),''),trim(p_reason)));
  end loop;
  insert into public.order_events(organization_id,order_id,event_type,public_message_zh,internal_data,actor_id,request_id)
  values(order_row.organization_id,order_row.id,'return_requested','退货申请已提交',jsonb_build_object('return_id',return_id_value,'return_no',return_no_value),actor_id,p_request_id);
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,new_data)
  values(order_row.organization_id,actor_id,'REQUEST_RETURN','return',return_id_value,jsonb_build_object('order_id',order_row.id,'return_no',return_no_value,'request_id',p_request_id));
  insert into public.outbox_events(organization_id,aggregate_type,aggregate_id,event_type,payload,idempotency_key)
  values(order_row.organization_id,'return',return_id_value,'return.requested',jsonb_build_object('return_no',return_no_value,'order_no',order_row.order_no),key_value||':return-requested') on conflict do nothing;
  result_value:=jsonb_build_object('return_id',return_id_value,'return_no',return_no_value,'status','requested','idempotent',false);
  return private.finish_business_command(order_row.organization_id,key_value,'request_return',result_value);
end;
$$;
revoke all on function private.request_return(uuid,jsonb,text,text,text,uuid) from public,anon,authenticated,service_role;

create or replace function public.rpc_request_return(
  p_order_id uuid,p_items jsonb,p_reason text,p_customer_note text default null,p_idempotency_key text default null,p_request_id uuid default gen_random_uuid()
) returns jsonb language sql security invoker set search_path='' as $$
  select private.request_return(p_order_id,p_items,p_reason,p_customer_note,p_idempotency_key,p_request_id);
$$;
revoke all on function public.rpc_request_return(uuid,jsonb,text,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.rpc_request_return(uuid,jsonb,text,text,text,uuid) to authenticated,service_role;

create or replace function private.post_return(
  p_return_id uuid,p_dispositions jsonb,p_idempotency_key text,p_request_id uuid default gen_random_uuid()
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=(select auth.uid()); return_row public.returns%rowtype; item_row record; inventory_row public.inventory%rowtype;
  disposition_row jsonb; disposition_value text; condition_value text; key_value text:=private.assert_command_key(p_idempotency_key);
  existing_result jsonb; result_value jsonb; posted_quantity integer:=0; before_value integer; after_value integer;
begin
  if actor_id is null or not private.has_permission('returns.manage') then raise exception '没有退货质检权限'; end if;
  select * into return_row from public.returns where id=p_return_id and organization_id=private.current_organization_id() for update;
  if not found then raise exception '退货单不存在或无权访问'; end if;
  if return_row.status not in ('received','inspected') then raise exception '退货收货后才能进行质检入账'; end if;
  if jsonb_typeof(p_dispositions)<>'array' then raise exception '质检处置数据无效'; end if;
  select result into existing_result from private.business_command_results where organization_id=return_row.organization_id and idempotency_key=key_value and command_type='post_return';
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;
  insert into private.business_command_results(organization_id,idempotency_key,command_type,aggregate_id,actor_id,request_id)
  values(return_row.organization_id,key_value,'post_return',return_row.id,actor_id,p_request_id) on conflict do nothing;
  select result into existing_result from private.business_command_results where organization_id=return_row.organization_id and idempotency_key=key_value and command_type='post_return' for update;
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;
  for item_row in select * from public.return_items where return_id=return_row.id order by id for update loop
    if item_row.inventory_posted_at is not null then continue; end if;
    select value into disposition_row from jsonb_array_elements(p_dispositions) where value->>'return_item_id'=item_row.id::text limit 1;
    disposition_value:=disposition_row->>'disposition'; condition_value:=coalesce(disposition_row->>'condition','unknown');
    if disposition_value not in ('restockable','quarantine','damaged','write_off') or condition_value not in ('unopened','good','worn','damaged','wrong_item','unknown') then
      raise exception '每个退货商品都必须填写有效质检结果';
    end if;
    select * into inventory_row from public.inventory where variant_id=item_row.variant_id and warehouse_id=item_row.warehouse_id for update;
    if not found then raise exception '退货商品库存记录不存在'; end if;
    if disposition_value='restockable' then
      before_value:=inventory_row.quantity_on_hand; after_value:=before_value+item_row.quantity;
      update public.inventory set quantity_on_hand=after_value where id=inventory_row.id;
    elsif disposition_value='quarantine' then
      before_value:=inventory_row.quantity_quarantined; after_value:=before_value+item_row.quantity;
      update public.inventory set quantity_quarantined=after_value where id=inventory_row.id;
    elsif disposition_value='damaged' then
      before_value:=inventory_row.quantity_damaged; after_value:=before_value+item_row.quantity;
      update public.inventory set quantity_damaged=after_value where id=inventory_row.id;
    else before_value:=0; after_value:=item_row.quantity; end if;
    insert into public.inventory_movements(organization_id,inventory_item_id,variant_id,warehouse_id,movement_type,quantity_change,
      quantity_before,quantity_after,balance_dimension,reference_type,reference_id,reference_no,reason,created_by,request_id)
    values(return_row.organization_id,inventory_row.id,item_row.variant_id,item_row.warehouse_id,
      case when disposition_value in ('damaged','write_off') then 'DAMAGE'::public.movement_type else 'RETURN'::public.movement_type end,
      item_row.quantity,before_value,after_value,
      case disposition_value when 'restockable' then 'on_hand' when 'quarantine' then 'quarantine' when 'damaged' then 'damaged' else 'write_off' end,
      'RETURN',return_row.id,return_row.return_no,'退货质检：'||disposition_value,actor_id,p_request_id);
    update public.return_items set item_condition=condition_value,disposition=disposition_value,
      inspection_notes=nullif(trim(disposition_row->>'notes'),''),inventory_posted_at=now() where id=item_row.id;
    posted_quantity:=posted_quantity+item_row.quantity;
  end loop;
  if exists(select 1 from public.return_items where return_id=return_row.id and inventory_posted_at is null) then raise exception '仍有退货商品未完成质检'; end if;
  update public.returns set status='inspected',inspected_by=actor_id,inspected_at=now() where id=return_row.id;
  insert into public.order_events(organization_id,order_id,event_type,public_message_zh,internal_data,actor_id,request_id)
  values(return_row.organization_id,return_row.order_id,'return_inspected','退货商品已完成质检',jsonb_build_object('return_id',return_row.id,'quantity',posted_quantity),actor_id,p_request_id);
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,old_data,new_data)
  values(return_row.organization_id,actor_id,'POST_RETURN','return',return_row.id,jsonb_build_object('status',return_row.status),
    jsonb_build_object('status','inspected','quantity',posted_quantity,'request_id',p_request_id));
  result_value:=jsonb_build_object('return_id',return_row.id,'status','inspected','posted_quantity',posted_quantity,'idempotent',false);
  return private.finish_business_command(return_row.organization_id,key_value,'post_return',result_value);
end;
$$;
revoke all on function private.post_return(uuid,jsonb,text,uuid) from public,anon,authenticated,service_role;

create or replace function public.rpc_post_return(
  p_return_id uuid,p_dispositions jsonb,p_idempotency_key text,p_request_id uuid default gen_random_uuid()
) returns jsonb language sql security invoker set search_path='' as $$
  select private.post_return(p_return_id,p_dispositions,p_idempotency_key,p_request_id);
$$;
revoke all on function public.rpc_post_return(uuid,jsonb,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.rpc_post_return(uuid,jsonb,text,uuid) to authenticated,service_role;

create or replace function private.execute_return_command(
  p_return_id uuid,p_command text,p_payload jsonb,p_idempotency_key text,p_request_id uuid default gen_random_uuid()
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=(select auth.uid()); return_row public.returns%rowtype; order_row public.orders%rowtype;
  key_value text:=private.assert_command_key(p_idempotency_key); command_value text:=lower(trim(p_command)); existing_result jsonb; result_value jsonb;
  amount_value numeric(12,2); refundable_value numeric(12,2); refund_id_value uuid; refund_row public.refunds%rowtype; total_refunded numeric(12,2);
begin
  if actor_id is null then raise exception '请先登录'; end if;
  select * into return_row from public.returns where id=p_return_id and organization_id=private.current_organization_id() for update;
  if not found then raise exception '退货单不存在或无权访问'; end if;
  select * into order_row from public.orders where id=return_row.order_id for update;
  if command_value in ('approve','reject','receive') and not private.has_permission('returns.manage') then raise exception '没有处理退货的权限'; end if;
  if command_value in ('request_refund','complete_refund','fail_refund') and not private.has_permission('refunds.manage') then raise exception '没有处理退款的权限'; end if;
  if command_value not in ('approve','reject','receive','request_refund','complete_refund','fail_refund') then raise exception '不支持的退货操作'; end if;
  select result into existing_result from private.business_command_results where organization_id=return_row.organization_id and idempotency_key=key_value and command_type='return:'||command_value;
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;
  insert into private.business_command_results(organization_id,idempotency_key,command_type,aggregate_id,actor_id,request_id)
  values(return_row.organization_id,key_value,'return:'||command_value,return_row.id,actor_id,p_request_id) on conflict do nothing;
  select result into existing_result from private.business_command_results where organization_id=return_row.organization_id and idempotency_key=key_value and command_type='return:'||command_value for update;
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;
  case command_value
    when 'approve' then
      if return_row.status<>'requested' then raise exception '只有待审核退货可以批准'; end if;
      update public.returns set status='approved',approved_by=actor_id,approved_at=now() where id=return_row.id;
      result_value:=jsonb_build_object('return_id',return_row.id,'status','approved');
    when 'reject' then
      if return_row.status<>'requested' then raise exception '只有待审核退货可以拒绝'; end if;
      if nullif(trim(p_payload->>'reason'),'') is null then raise exception '拒绝退货必须填写原因'; end if;
      update public.returns set status='rejected',rejected_at=now(),rejection_reason=left(trim(p_payload->>'reason'),500) where id=return_row.id;
      result_value:=jsonb_build_object('return_id',return_row.id,'status','rejected');
    when 'receive' then
      if return_row.status<>'approved' then raise exception '只有已批准退货可以确认收货'; end if;
      update public.returns set status='received',received_by=actor_id,received_at=now() where id=return_row.id;
      result_value:=jsonb_build_object('return_id',return_row.id,'status','received');
    when 'request_refund' then
      if return_row.status<>'inspected' then raise exception '退货质检后才能申请退款'; end if;
      select coalesce(sum(item.quantity*order_item.unit_price),0) into refundable_value from public.return_items item
        join public.order_items order_item on order_item.id=item.order_item_id where item.return_id=return_row.id;
      select coalesce(sum(amount),0) into total_refunded from public.refunds where order_id=order_row.id and status in ('pending','processing','succeeded');
      amount_value:=coalesce(nullif(p_payload->>'amount','')::numeric,refundable_value);
      if amount_value<=0 or amount_value>refundable_value or amount_value+total_refunded>order_row.total_amount then raise exception '退款金额超过可退范围'; end if;
      insert into public.refunds(organization_id,order_id,return_id,amount,currency,status,adapter,idempotency_key,reason,requested_by)
      values(return_row.organization_id,order_row.id,return_row.id,amount_value,order_row.currency,'pending','manual',key_value,
        coalesce(nullif(trim(p_payload->>'reason'),''),'退货退款'),actor_id) returning id into refund_id_value;
      update public.returns set status='refund_pending' where id=return_row.id;
      result_value:=jsonb_build_object('return_id',return_row.id,'refund_id',refund_id_value,'status','refund_pending','amount',amount_value);
    when 'complete_refund' then
      if return_row.status<>'refund_pending' then raise exception '当前退货单不在待退款状态'; end if;
      select * into refund_row from public.refunds where id=(p_payload->>'refund_id')::uuid and return_id=return_row.id and status in ('pending','processing') for update;
      if not found then raise exception '退款记录不存在或已经处理'; end if;
      update public.refunds set status='succeeded',processed_by=actor_id,processed_at=now(),
        provider_reference=nullif(trim(p_payload->>'provider_reference'),'') where id=refund_row.id;
      select coalesce(sum(amount),0) into total_refunded from public.refunds where order_id=order_row.id and status='succeeded';
      update public.orders set payment_status=case when total_refunded>=total_amount then 'refunded' else 'partially_refunded' end,updated_by=actor_id where id=order_row.id;
      update public.payments set refunded_amount=least(amount,refunded_amount+refund_row.amount),
        status=case when refunded_amount+refund_row.amount>=amount then 'refunded' else 'partially_refunded' end
      where id=(select id from public.payments where order_id=order_row.id and status in ('paid','partially_refunded') order by paid_at nulls last,created_at limit 1);
      update public.returns set status='completed',completed_at=now() where id=return_row.id;
      result_value:=jsonb_build_object('return_id',return_row.id,'refund_id',refund_row.id,'status','completed','refund_status','succeeded','amount',refund_row.amount);
    when 'fail_refund' then
      select * into refund_row from public.refunds where id=(p_payload->>'refund_id')::uuid and return_id=return_row.id and status in ('pending','processing') for update;
      if not found then raise exception '退款记录不存在或已经处理'; end if;
      if nullif(trim(p_payload->>'reason'),'') is null then raise exception '退款失败必须记录原因'; end if;
      update public.refunds set status='failed',processed_by=actor_id,processed_at=now(),failure_reason=left(trim(p_payload->>'reason'),500) where id=refund_row.id;
      result_value:=jsonb_build_object('return_id',return_row.id,'refund_id',refund_row.id,'status','refund_pending','refund_status','failed');
  end case;
  insert into public.order_events(organization_id,order_id,event_type,public_message_zh,internal_data,actor_id,request_id)
  values(return_row.organization_id,return_row.order_id,'return_'||command_value,
    case command_value when 'approve' then '退货申请已批准' when 'reject' then '退货申请未通过' when 'receive' then '仓库已收到退货'
      when 'request_refund' then '退款正在处理' when 'complete_refund' then '退款已完成' when 'fail_refund' then '退款处理失败' end,
    result_value,actor_id,p_request_id);
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,old_data,new_data)
  values(return_row.organization_id,actor_id,upper(command_value),'return',return_row.id,jsonb_build_object('status',return_row.status),result_value||jsonb_build_object('request_id',p_request_id));
  return private.finish_business_command(return_row.organization_id,key_value,'return:'||command_value,result_value||jsonb_build_object('idempotent',false));
end;
$$;
revoke all on function private.execute_return_command(uuid,text,jsonb,text,uuid) from public,anon,authenticated,service_role;

create or replace function public.rpc_return_command(
  p_return_id uuid,p_command text,p_payload jsonb default '{}'::jsonb,p_idempotency_key text default null,p_request_id uuid default gen_random_uuid()
) returns jsonb language sql security invoker set search_path='' as $$
  select private.execute_return_command(p_return_id,p_command,coalesce(p_payload,'{}'::jsonb),p_idempotency_key,p_request_id);
$$;
revoke all on function public.rpc_return_command(uuid,text,jsonb,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.rpc_return_command(uuid,text,jsonb,text,uuid) to authenticated,service_role;

create or replace view public.order_operations_summary with(security_invoker=true) as
select orders.id,orders.organization_id,orders.order_no,orders.customer_id,orders.customer_name,orders.customer_email,orders.customer_phone,
  orders.lifecycle_status,lower(orders.payment_status) as payment_status,orders.fulfillment_status,orders.fulfillment_type,
  orders.total_amount,orders.currency,orders.priority,orders.created_at,orders.updated_at,orders.expires_at,
  coalesce((select sum(item.quantity) from public.order_items item where item.order_id=orders.id),0)::integer as total_quantity,
  coalesce((select count(*) from public.fulfillment_exceptions exception_record where exception_record.order_id=orders.id and exception_record.status='open'),0)::integer as open_exception_count,
  (select shipment.id from public.shipments shipment where shipment.order_id=orders.id and shipment.status<>'cancelled' order by shipment.created_at desc limit 1) as shipment_id
from public.orders orders;

create or replace view public.fulfillment_queue with(security_invoker=true) as
select summary.*,shipment.warehouse_id,shipment.status as shipment_status,shipment.carrier,shipment.tracking_no,
  shipment.ready_at,shipment.shipped_at
from public.order_operations_summary summary
left join public.shipments shipment on shipment.id=summary.shipment_id
where summary.lifecycle_status in ('confirmed','processing') and summary.fulfillment_status in ('reserved','picking','packed','shipped','ready_pickup');

revoke all on public.order_operations_summary,public.fulfillment_queue from public,anon,authenticated;
grant select on public.order_operations_summary to authenticated;
grant select on public.fulfillment_queue to authenticated;

notify pgrst,'reload schema';

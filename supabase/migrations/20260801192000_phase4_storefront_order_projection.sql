-- Phase 4 customer-safe order projection and audited timeout release.

create or replace function private.get_storefront_order(
  p_order_id uuid,p_lookup_token text default null,p_request_id uuid default gen_random_uuid()
) returns jsonb language plpgsql security definer set search_path='extensions' as $$
declare actor_id uuid:=(select auth.uid()); order_row public.orders%rowtype; token_hash text;
begin
  perform private.check_storefront_rate_limit(p_request_id,'order_lookup',null);
  select * into order_row from public.orders where id=p_order_id;
  if not found then raise exception '订单不存在或查询信息无效'; end if;
  if actor_id is null then
    if p_lookup_token is null then raise exception '订单不存在或查询信息无效'; end if;
    token_hash:=encode(digest(trim(p_lookup_token),'sha256'),'hex');
    if order_row.lookup_token_hash is distinct from token_hash then raise exception '订单不存在或查询信息无效'; end if;
  elsif order_row.customer_id is distinct from actor_id and not private.has_permission('orders.read') then
    raise exception '没有查看该订单的权限';
  end if;
  return jsonb_build_object(
    'id',order_row.id,'order_no',order_row.order_no,'status',order_row.status,
    'lifecycle_status',order_row.lifecycle_status,'payment_status',lower(order_row.payment_status),
    'fulfillment_status',order_row.fulfillment_status,'payment_adapter',order_row.payment_adapter,
    'fulfillment_method',order_row.fulfillment_type,'subtotal',order_row.subtotal,
    'shipping_fee',order_row.shipping_fee,'discount_amount',order_row.discount_amount,
    'tax_amount',order_row.tax_amount,'total_amount',order_row.total_amount,'currency',order_row.currency,
    'contact',order_row.contact_snapshot,'shipping_address',order_row.shipping_address_snapshot,
    'created_at',order_row.created_at,'expires_at',order_row.expires_at,
    'items',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',item.id,'product_title',item.product_title,'product_slug',item.product_slug,
      'sku',item.sku,'color_name',item.color_name,'size_name',item.size_name,
      'unit_price',item.unit_price,'quantity',item.quantity,'line_total',item.line_total,
      'currency',item.currency,'image_media_id',item.image_media_id
    ) order by item.created_at,item.id),'[]'::jsonb) from public.order_items item where item.order_id=order_row.id),
    'events',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',event.id,'event_type',event.event_type,'message',event.public_message_zh,'occurred_at',event.occurred_at
    ) order by event.occurred_at desc,event.id desc),'[]'::jsonb) from public.order_events event
      where event.order_id=order_row.id and event.public_message_zh is not null),
    'returns',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',return_record.id,'return_no',return_record.return_no,'status',return_record.status,'created_at',return_record.created_at
    ) order by return_record.created_at desc),'[]'::jsonb) from public.returns return_record where return_record.order_id=order_row.id)
  );
end;
$$;
revoke all on function private.get_storefront_order(uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function private.get_storefront_order(uuid,text,uuid) to anon,authenticated,service_role;

create or replace function private.expire_stale_orders(p_limit integer default 100)
returns integer language plpgsql security definer set search_path='' as $$
declare stale_order record; reservation_row record; expired_count integer:=0; request_value uuid;
begin
  if p_limit is null or p_limit<1 or p_limit>500 then raise exception 'Invalid expiry batch size'; end if;
  for stale_order in select * from public.orders where status='PENDING_PAYMENT' and lifecycle_status='pending'
    and expires_at is not null and expires_at<=now() order by expires_at,id limit p_limit for update skip locked
  loop
    request_value:=gen_random_uuid();
    for reservation_row in
      select reservation.*,inventory.quantity_reserved from public.stock_reservations reservation
      join public.inventory inventory on inventory.id=reservation.inventory_id
      where reservation.order_id=stale_order.id and reservation.status='active'
      order by reservation.inventory_id,reservation.id for update of reservation,inventory
    loop
      update public.inventory set quantity_reserved=quantity_reserved-reservation_row.quantity
      where id=reservation_row.inventory_id and quantity_reserved>=reservation_row.quantity;
      if not found then raise exception '订单预占库存数据异常'; end if;
      update public.stock_reservations set status='expired',released_at=now() where id=reservation_row.id and status='active';
      insert into public.inventory_movements(organization_id,inventory_item_id,variant_id,warehouse_id,movement_type,
        quantity_change,quantity_before,quantity_after,reserved_before,reserved_after,balance_dimension,
        reference_type,reference_id,reference_no,reason,created_by,request_id)
      values(stale_order.organization_id,reservation_row.inventory_id,reservation_row.variant_id,reservation_row.warehouse_id,
        'RESERVATION_RELEASE',-reservation_row.quantity,reservation_row.quantity_reserved,
        reservation_row.quantity_reserved-reservation_row.quantity,reservation_row.quantity_reserved,
        reservation_row.quantity_reserved-reservation_row.quantity,'reserved','ORDER',stale_order.id,stale_order.order_no,
        '支付超时自动释放',null,request_value);
    end loop;
    update public.orders set status='CANCELLED',lifecycle_status='cancelled',fulfillment_status='unfulfilled',
      cancelled_at=now(),expired_at=now(),expires_at=null,cancellation_reason='支付超时自动取消' where id=stale_order.id;
    insert into public.order_events(organization_id,order_id,event_type,public_message_zh,internal_data,request_id)
    values(stale_order.organization_id,stale_order.id,'order_expired','订单因支付超时自动取消，库存预留已释放','{}'::jsonb,request_value);
    insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,new_data)
    values(stale_order.organization_id,null,'ORDER_AUTO_EXPIRED','order',stale_order.id,
      jsonb_build_object('order_no',stale_order.order_no,'reason','payment_timeout','request_id',request_value));
    insert into public.outbox_events(organization_id,aggregate_type,aggregate_id,event_type,payload,idempotency_key)
    values(stale_order.organization_id,'order',stale_order.id,'order.expired',jsonb_build_object('order_no',stale_order.order_no),
      'expire:'||stale_order.id::text) on conflict do nothing;
    expired_count:=expired_count+1;
  end loop;
  return expired_count;
end;
$$;
revoke all on function private.expire_stale_orders(integer) from public,anon,authenticated,service_role;

notify pgrst,'reload schema';

-- Security and performance hardening after first remote deployment.

-- Public buckets serve object URLs without a broad storage.objects SELECT policy.
drop policy if exists product_images_public_read on storage.objects;
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

-- Frequently joined/filtering foreign keys. PostgreSQL does not index these automatically.
create index if not exists audit_logs_user_id_idx on public.audit_logs(user_id);
create index if not exists categories_parent_id_idx on public.categories(parent_id);
create index if not exists customer_addresses_customer_id_idx on public.customer_addresses(customer_id);
create index if not exists inventory_warehouse_id_idx on public.inventory(warehouse_id);
create index if not exists inventory_movements_warehouse_id_idx on public.inventory_movements(warehouse_id);
create index if not exists inventory_movements_created_by_idx on public.inventory_movements(created_by);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists orders_customer_id_created_idx on public.orders(customer_id,created_at desc);
create index if not exists orders_open_status_idx on public.orders(status,created_at desc) where status not in ('COMPLETED','CANCELLED','REFUNDED');
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_variant_id_idx on public.order_items(variant_id);
create index if not exists order_items_warehouse_id_idx on public.order_items(warehouse_id);
create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists product_images_variant_id_idx on public.product_images(variant_id);
create index if not exists product_images_created_by_idx on public.product_images(created_by);
create index if not exists product_tag_relations_tag_id_idx on public.product_tag_relations(tag_id);
create index if not exists product_variants_color_id_idx on public.product_variants(color_id);
create index if not exists product_variants_size_id_idx on public.product_variants(size_id);
create index if not exists stock_adjustments_variant_id_idx on public.stock_adjustments(variant_id);
create index if not exists stock_adjustments_warehouse_id_idx on public.stock_adjustments(warehouse_id);
create index if not exists stock_adjustments_created_by_idx on public.stock_adjustments(created_by);
create index if not exists stock_receipt_exceptions_receipt_id_idx on public.stock_receipt_exceptions(receipt_id);
create index if not exists stock_receipt_exceptions_item_id_idx on public.stock_receipt_exceptions(item_id);
create index if not exists stock_receipt_items_product_id_idx on public.stock_receipt_items(product_id);
create index if not exists stock_receipt_items_variant_id_idx on public.stock_receipt_items(variant_id);
create index if not exists stock_receipts_supplier_id_idx on public.stock_receipts(supplier_id);
create index if not exists stock_receipts_warehouse_id_idx on public.stock_receipts(warehouse_id);
create index if not exists stock_receipts_created_by_idx on public.stock_receipts(created_by);
create index if not exists user_roles_role_id_idx on public.user_roles(role_id);

insert into public.settings(key,value)
values ('shop', jsonb_build_object('delivery_fee',6.90,'pickup_fee',0,'currency','EUR','payment_timeout_minutes',30))
on conflict(key) do nothing;

-- Keep privileged implementations outside the exposed Data API schema.
alter function public.confirm_stock_receipt(uuid) set schema private;
alter function public.publish_product(uuid) set schema private;
alter function public.create_online_order(jsonb,text,jsonb,numeric,text,text) set schema private;
alter function public.transition_order_inventory(uuid,public.order_status) set schema private;

revoke all on function private.confirm_stock_receipt(uuid) from public, anon;
revoke all on function private.publish_product(uuid) from public, anon;
revoke all on function private.create_online_order(jsonb,text,jsonb,numeric,text,text) from public, anon;
revoke all on function private.transition_order_inventory(uuid,public.order_status) from public, anon;
grant execute on function private.confirm_stock_receipt(uuid) to authenticated;
grant execute on function private.publish_product(uuid) to authenticated;
grant execute on function private.create_online_order(jsonb,text,jsonb,numeric,text,text) to authenticated;
grant execute on function private.transition_order_inventory(uuid,public.order_status) to authenticated;

create function public.confirm_stock_receipt(p_receipt_id uuid)
returns jsonb language sql security invoker set search_path=''
as $$ select private.confirm_stock_receipt(p_receipt_id); $$;
create function public.publish_product(p_product_id uuid)
returns jsonb language sql security invoker set search_path=''
as $$ select private.publish_product(p_product_id); $$;
create function public.transition_order_inventory(p_order_id uuid,p_target_status public.order_status)
returns jsonb language sql security invoker set search_path=''
as $$ select private.transition_order_inventory(p_order_id,p_target_status); $$;

revoke all on function public.confirm_stock_receipt(uuid) from public, anon;
revoke all on function public.publish_product(uuid) from public, anon;
revoke all on function public.transition_order_inventory(uuid,public.order_status) from public, anon;
grant execute on function public.confirm_stock_receipt(uuid) to authenticated;
grant execute on function public.publish_product(uuid) to authenticated;
grant execute on function public.transition_order_inventory(uuid,public.order_status) to authenticated;

-- Order totals and shipping fees are derived on the server. Client-provided fees are ignored.
create or replace function private.create_online_order(
  p_items jsonb,
  p_fulfillment_type text,
  p_shipping_address jsonb,
  p_shipping_fee numeric,
  p_customer_note text,
  p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  existing uuid; o_id uuid; line jsonb; v public.product_variants%rowtype;
  listing public.online_listings%rowtype; inv public.inventory%rowtype;
  qty integer; subtotal_value numeric:=0; unit_value numeric; fee_value numeric:=0;
  shop_config jsonb;
begin
  if (select auth.uid()) is null then raise exception '请先登录'; end if;
  select id into existing from public.orders where idempotency_key=p_idempotency_key;
  if existing is not null then return jsonb_build_object('order_id',existing,'idempotent',true); end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception '订单中没有商品'; end if;
  if p_fulfillment_type not in ('DELIVERY','PICKUP') then raise exception '配送方式无效'; end if;
  if p_fulfillment_type='DELIVERY' and (p_shipping_address is null or coalesce(p_shipping_address->>'address_line','')='') then raise exception '请填写完整配送地址'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) x group by x->>'variant_id' having count(*)>1) then raise exception '订单中存在重复SKU'; end if;

  select value into shop_config from public.settings where key='shop';
  fee_value:=case when p_fulfillment_type='DELIVERY' then coalesce((shop_config->>'delivery_fee')::numeric,6.90) else coalesce((shop_config->>'pickup_fee')::numeric,0) end;
  insert into public.orders(customer_id,subtotal,shipping_fee,total_amount,fulfillment_type,shipping_address,customer_note,idempotency_key)
  values((select auth.uid()),0,fee_value,fee_value,p_fulfillment_type,p_shipping_address,p_customer_note,p_idempotency_key)
  returning id into o_id;

  -- Stable variant ordering prevents two multi-item checkouts from deadlocking.
  for line in select value from jsonb_array_elements(p_items) order by value->>'variant_id' loop
    qty:=(line->>'quantity')::integer;
    if qty<=0 or qty>100 then raise exception '商品数量必须在1到100之间'; end if;
    select * into v from public.product_variants where id=(line->>'variant_id')::uuid and is_active;
    if not found then raise exception '商品规格不存在或已停用'; end if;
    select l.* into listing from public.online_listings l where l.product_id=v.product_id and l.listing_status='PUBLISHED';
    if not found then raise exception '商品未上架或已下架'; end if;
    select i.* into inv from public.inventory i
      where i.variant_id=v.id and least(i.quantity_available,i.online_quantity_limit)>=qty
      order by i.id limit 1 for update;
    if not found then raise exception '库存不足，无法创建订单'; end if;
    update public.inventory set quantity_reserved=quantity_reserved+qty where id=inv.id;
    unit_value:=coalesce(listing.sale_price,listing.retail_price);
    subtotal_value:=subtotal_value+unit_value*qty;
    insert into public.order_items(order_id,variant_id,warehouse_id,product_title,sku,color_name,size_name,unit_price,quantity,line_total)
      select o_id,v.id,inv.warehouse_id,listing.title,v.sku,c.name,s.name,unit_value,qty,unit_value*qty
      from public.colors c,public.sizes s where c.id=v.color_id and s.id=v.size_id;
  end loop;
  update public.orders set subtotal=subtotal_value,total_amount=subtotal_value+fee_value where id=o_id;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
    values((select auth.uid()),'CREATE_ORDER','order',o_id,jsonb_build_object('subtotal',subtotal_value,'shipping_fee',fee_value));
  return jsonb_build_object('order_id',o_id,'idempotent',false);
end; $$;

create function public.create_online_order(
  p_items jsonb,p_fulfillment_type text,p_shipping_address jsonb,p_shipping_fee numeric,p_customer_note text,p_idempotency_key text
) returns jsonb language sql security invoker set search_path=''
as $$ select private.create_online_order(p_items,p_fulfillment_type,p_shipping_address,p_shipping_fee,p_customer_note,p_idempotency_key); $$;
revoke all on function public.create_online_order(jsonb,text,jsonb,numeric,text,text) from public, anon;
grant execute on function public.create_online_order(jsonb,text,jsonb,numeric,text,text) to authenticated;

create or replace function private.transition_order_status(p_order_id uuid,p_target_status public.order_status)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; allowed boolean:=false;
begin
  if (select auth.uid()) is null or not private.has_role(array['OWNER','ORDER_STAFF']) then raise exception '没有订单处理权限'; end if;
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception '订单不存在'; end if;
  if p_target_status in ('CANCELLED','SHIPPED') then return private.transition_order_inventory(p_order_id,p_target_status); end if;
  allowed:=case
    when o.status='PENDING_PAYMENT' and p_target_status='PAID' then true
    when o.status='PAID' and p_target_status='PICKING' then true
    when o.status='PICKING' and p_target_status='PACKED' then true
    when o.status='PACKED' and p_target_status in ('READY_FOR_PICKUP','SHIPPED') then true
    when o.status in ('SHIPPED','READY_FOR_PICKUP') and p_target_status='COMPLETED' then true
    when o.status='REFUND_REQUESTED' and p_target_status='REFUNDED' then true
    else false end;
  if not allowed then raise exception '不允许从%变更为%',o.status,p_target_status; end if;
  update public.orders set status=p_target_status,
    payment_status=case when p_target_status='PAID' then 'PAID' when p_target_status='REFUNDED' then 'REFUNDED' else payment_status end,
    paid_at=case when p_target_status='PAID' then now() else paid_at end,
    completed_at=case when p_target_status='COMPLETED' then now() else completed_at end
  where id=o.id;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,old_data,new_data)
    values((select auth.uid()),'ORDER_STATUS_CHANGE','order',o.id,jsonb_build_object('status',o.status),jsonb_build_object('status',p_target_status));
  return jsonb_build_object('ok',true,'status',p_target_status);
end; $$;
revoke all on function private.transition_order_status(uuid,public.order_status) from public, anon;
grant execute on function private.transition_order_status(uuid,public.order_status) to authenticated;
create function public.transition_order_status(p_order_id uuid,p_target_status public.order_status)
returns jsonb language sql security invoker set search_path=''
as $$ select private.transition_order_status(p_order_id,p_target_status); $$;
revoke all on function public.transition_order_status(uuid,public.order_status) from public, anon;
grant execute on function public.transition_order_status(uuid,public.order_status) to authenticated;

create or replace function private.set_inventory_online_limit(p_inventory_id uuid,p_limit integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare inv public.inventory%rowtype;
begin
  if (select auth.uid()) is null or not private.has_role(array['OWNER','PRODUCT_MANAGER']) then raise exception '没有网店库存设置权限'; end if;
  if p_limit<0 then raise exception '网店库存上限不能小于0'; end if;
  select * into inv from public.inventory where id=p_inventory_id for update;
  if not found then raise exception '库存记录不存在'; end if;
  update public.inventory set online_quantity_limit=p_limit where id=inv.id;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,old_data,new_data)
  values((select auth.uid()),'SET_ONLINE_STOCK_LIMIT','inventory',inv.id,jsonb_build_object('online_quantity_limit',inv.online_quantity_limit),jsonb_build_object('online_quantity_limit',p_limit));
  return jsonb_build_object('ok',true,'online_quantity_limit',p_limit);
end; $$;
revoke all on function private.set_inventory_online_limit(uuid,integer) from public, anon;
grant execute on function private.set_inventory_online_limit(uuid,integer) to authenticated;
create function public.set_inventory_online_limit(p_inventory_id uuid,p_limit integer)
returns jsonb language sql security invoker set search_path=''
as $$ select private.set_inventory_online_limit(p_inventory_id,p_limit); $$;
revoke all on function public.set_inventory_online_limit(uuid,integer) from public, anon;
grant execute on function public.set_inventory_online_limit(uuid,integer) to authenticated;

create or replace function private.unpublish_product(p_product_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid()) is null or not private.has_role(array['OWNER','PRODUCT_MANAGER']) then raise exception '没有商品下架权限'; end if;
  update public.products set status='UNPUBLISHED' where id=p_product_id and deleted_at is null;
  if not found then raise exception '商品不存在'; end if;
  update public.online_listings set listing_status='UNPUBLISHED' where product_id=p_product_id;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
    values((select auth.uid()),'UNPUBLISH_PRODUCT','product',p_product_id,jsonb_build_object('status','UNPUBLISHED'));
  return jsonb_build_object('ok',true,'message','商品已下架');
end; $$;
revoke all on function private.unpublish_product(uuid) from public, anon;
grant execute on function private.unpublish_product(uuid) to authenticated;
create function public.unpublish_product(p_product_id uuid)
returns jsonb language sql security invoker set search_path=''
as $$ select private.unpublish_product(p_product_id); $$;
revoke all on function public.unpublish_product(uuid) from public, anon;
grant execute on function public.unpublish_product(uuid) to authenticated;

notify pgrst,'reload schema';

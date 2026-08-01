create or replace function private.cancel_fast_inbound(p_inbound_order_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '15s'
as $$
declare
  caller_id uuid := (select auth.uid());
  inbound_value public.inbound_orders%rowtype;
  item record;
  inventory_value public.inventory%rowtype;
begin
  if caller_id is null or not private.has_app_role(array['admin']) then
    raise exception '只有管理员可以取消已确认入库';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception '取消入库必须填写原因';
  end if;

  select * into inbound_value
  from public.inbound_orders
  where id = p_inbound_order_id
  for update;
  if not found then raise exception '入库单不存在'; end if;
  if inbound_value.status = 'cancelled' then
    return jsonb_build_object('ok', true, 'idempotent', true, 'inbound_number', inbound_value.inbound_number);
  end if;
  if inbound_value.status <> 'confirmed' then raise exception '只有已确认入库单可以取消'; end if;

  for item in
    select i.* from public.inbound_order_items i
    where i.inbound_order_id = inbound_value.id
    order by i.variant_id
  loop
    select * into inventory_value
    from public.inventory inv
    where inv.variant_id = item.variant_id
      and inv.warehouse_id = inbound_value.warehouse_id
    for update;
    if not found or inventory_value.quantity_on_hand < item.quantity then
      raise exception 'SKU % 当前库存不足，无法撤销该入库单', item.sku;
    end if;

    update public.inventory
    set quantity_on_hand = inventory_value.quantity_on_hand - item.quantity
    where id = inventory_value.id;

    insert into public.inventory_movements(
      inventory_item_id, variant_id, warehouse_id, movement_type,
      quantity_change, quantity_before, quantity_after,
      reference_type, reference_id, reference_no, reason, created_by
    ) values (
      inventory_value.id, item.variant_id, inbound_value.warehouse_id, 'ADJUSTMENT_OUT',
      -item.quantity, inventory_value.quantity_on_hand, inventory_value.quantity_on_hand - item.quantity,
      'INBOUND_CANCELLATION', inbound_value.id, inbound_value.inbound_number, trim(p_reason), caller_id
    );
  end loop;

  update public.inbound_orders
  set status = 'cancelled', cancelled_at = now(), cancellation_reason = trim(p_reason)
  where id = inbound_value.id;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, old_data, new_data)
  values(
    caller_id, 'CANCEL_FAST_INBOUND', 'inbound_order', inbound_value.id,
    jsonb_build_object('status', inbound_value.status, 'total_quantity', inbound_value.total_quantity),
    jsonb_build_object('status', 'cancelled', 'reason', trim(p_reason))
  );

  return jsonb_build_object('ok', true, 'idempotent', false, 'inbound_number', inbound_value.inbound_number);
end;
$$;

revoke all on function private.cancel_fast_inbound(uuid,text) from public, anon;
grant execute on function private.cancel_fast_inbound(uuid,text) to authenticated;

create or replace function public.cancel_inbound_order(p_inbound_order_id uuid, p_reason text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.cancel_fast_inbound(p_inbound_order_id, p_reason); $$;

revoke all on function public.cancel_inbound_order(uuid,text) from public, anon;
grant execute on function public.cancel_inbound_order(uuid,text) to authenticated;

notify pgrst, 'reload schema';

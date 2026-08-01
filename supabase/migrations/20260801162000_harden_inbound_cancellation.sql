-- Align the legacy quick-inbound cancellation path with the V1.0 workflow,
-- organization boundary and permission model. A cancellation is a compensating
-- movement; posted inventory facts are never deleted or edited in place.
create or replace function private.cancel_fast_inbound(
  p_inbound_order_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '15s'
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_organization_id uuid := private.current_organization_id();
  inbound_value public.inbound_orders%rowtype;
  item record;
  inventory_value public.inventory%rowtype;
begin
  if caller_id is null or caller_organization_id is null
     or not private.has_permission('inbound.cancel') then
    raise exception '当前账号没有取消已入库单的权限';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception '取消入库必须填写原因';
  end if;

  select * into inbound_value
  from public.inbound_orders
  where id = p_inbound_order_id
    and organization_id = caller_organization_id
  for update;

  if not found then
    raise exception '入库单不存在或不属于当前组织';
  end if;
  if inbound_value.status = 'cancelled' then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'inbound_number', inbound_value.inbound_number
    );
  end if;
  if inbound_value.status <> 'posted' then
    raise exception '只有已入库单可以取消';
  end if;

  for item in
    select line.*
    from public.inbound_order_items line
    where line.inbound_order_id = inbound_value.id
      and line.organization_id = caller_organization_id
    order by line.variant_id
  loop
    select * into inventory_value
    from public.inventory balance
    where balance.variant_id = item.variant_id
      and balance.warehouse_id = inbound_value.warehouse_id
      and balance.organization_id = caller_organization_id
    for update;

    if not found or inventory_value.quantity_on_hand < item.quantity then
      raise exception 'SKU % 当前库存不足，无法撤销该入库单', item.sku;
    end if;

    update public.inventory
    set quantity_on_hand = inventory_value.quantity_on_hand - item.quantity,
        updated_at = now()
    where id = inventory_value.id;

    insert into public.inventory_movements(
      organization_id, inventory_item_id, variant_id, warehouse_id,
      movement_type, quantity_change, quantity_before, quantity_after,
      reference_type, reference_id, reference_no, reason, created_by
    ) values (
      caller_organization_id, inventory_value.id, item.variant_id,
      inbound_value.warehouse_id, 'ADJUSTMENT_OUT', -item.quantity,
      inventory_value.quantity_on_hand,
      inventory_value.quantity_on_hand - item.quantity,
      'INBOUND_CANCELLATION', inbound_value.id,
      inbound_value.inbound_number, trim(p_reason), caller_id
    );
  end loop;

  update public.inbound_orders
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = trim(p_reason),
      updated_at = now()
  where id = inbound_value.id;

  insert into public.audit_logs(
    organization_id, user_id, action, entity_type, entity_id, old_data, new_data
  ) values (
    caller_organization_id, caller_id, 'CANCEL_FAST_INBOUND',
    'inbound_order', inbound_value.id,
    jsonb_build_object(
      'status', inbound_value.status,
      'total_quantity', inbound_value.total_quantity
    ),
    jsonb_build_object('status', 'cancelled', 'reason', trim(p_reason))
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'inbound_number', inbound_value.inbound_number
  );
end;
$$;

revoke all on function private.cancel_fast_inbound(uuid,text) from public, anon;
grant execute on function private.cancel_fast_inbound(uuid,text) to authenticated;
revoke all on function public.cancel_inbound_order(uuid,text) from public, anon;
grant execute on function public.cancel_inbound_order(uuid,text) to authenticated;

notify pgrst, 'reload schema';

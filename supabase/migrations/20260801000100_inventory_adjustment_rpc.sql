create or replace function private.adjust_inventory_stock(
  p_inventory_id uuid,
  p_counted_quantity integer,
  p_reason text,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  inventory_row public.inventory%rowtype;
  quantity_delta integer;
  adjustment_id uuid;
  movement_id uuid;
  reason_value text := nullif(trim(p_reason), '');
  notes_value text := nullif(trim(p_notes), '');
begin
  if actor_id is null or not private.has_role(array['OWNER','WAREHOUSE_STAFF','PRODUCT_MANAGER']) then
    raise exception '没有调整库存权限';
  end if;

  if p_counted_quantity is null or p_counted_quantity < 0 then
    raise exception '盘点数量必须是大于或等于 0 的整数';
  end if;

  if reason_value is null or length(reason_value) < 2 then
    raise exception '请填写库存调整原因';
  end if;

  select * into inventory_row
  from public.inventory
  where id = p_inventory_id
  for update;

  if not found then
    raise exception '库存记录不存在';
  end if;

  if p_counted_quantity < inventory_row.quantity_reserved then
    raise exception '盘点数量不能低于已被订单占用的数量 %', inventory_row.quantity_reserved;
  end if;

  quantity_delta := p_counted_quantity - inventory_row.quantity_on_hand;
  if quantity_delta = 0 then
    return jsonb_build_object(
      'inventory_id', inventory_row.id,
      'changed', false,
      'quantity_before', inventory_row.quantity_on_hand,
      'quantity_after', inventory_row.quantity_on_hand,
      'quantity_change', 0
    );
  end if;

  insert into public.stock_adjustments(
    variant_id, warehouse_id, quantity_change, reason, status,
    created_by, approved_by
  ) values (
    inventory_row.variant_id, inventory_row.warehouse_id, quantity_delta,
    reason_value, 'APPROVED', actor_id, actor_id
  ) returning id into adjustment_id;

  update public.inventory
  set quantity_on_hand = p_counted_quantity,
      updated_at = now()
  where id = inventory_row.id;

  insert into public.inventory_movements(
    variant_id, warehouse_id, movement_type, quantity_change,
    quantity_before, quantity_after, reference_type, reference_id,
    reference_no, notes, created_by
  ) values (
    inventory_row.variant_id, inventory_row.warehouse_id,
    'STOCKTAKE_ADJUSTMENT', quantity_delta,
    inventory_row.quantity_on_hand, p_counted_quantity,
    'STOCK_ADJUSTMENT', adjustment_id, reason_value, notes_value, actor_id
  ) returning id into movement_id;

  insert into public.audit_logs(
    user_id, action, entity_type, entity_id, old_data, new_data
  ) values (
    actor_id, 'INVENTORY_STOCK_ADJUSTED', 'INVENTORY', inventory_row.id,
    jsonb_build_object(
      'quantity_on_hand', inventory_row.quantity_on_hand,
      'quantity_reserved', inventory_row.quantity_reserved
    ),
    jsonb_build_object(
      'quantity_on_hand', p_counted_quantity,
      'quantity_reserved', inventory_row.quantity_reserved,
      'reason', reason_value,
      'notes', notes_value,
      'adjustment_id', adjustment_id,
      'movement_id', movement_id
    )
  );

  return jsonb_build_object(
    'inventory_id', inventory_row.id,
    'adjustment_id', adjustment_id,
    'movement_id', movement_id,
    'changed', true,
    'quantity_before', inventory_row.quantity_on_hand,
    'quantity_after', p_counted_quantity,
    'quantity_change', quantity_delta
  );
end;
$$;

revoke all on function private.adjust_inventory_stock(uuid,integer,text,text) from public, anon;
grant execute on function private.adjust_inventory_stock(uuid,integer,text,text) to authenticated;

create or replace function public.adjust_inventory_stock(
  p_inventory_id uuid,
  p_counted_quantity integer,
  p_reason text,
  p_notes text default null
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.adjust_inventory_stock(
    p_inventory_id,
    p_counted_quantity,
    p_reason,
    p_notes
  );
$$;

revoke all on function public.adjust_inventory_stock(uuid,integer,text,text) from public, anon;
grant execute on function public.adjust_inventory_stock(uuid,integer,text,text) to authenticated;

notify pgrst, 'reload schema';

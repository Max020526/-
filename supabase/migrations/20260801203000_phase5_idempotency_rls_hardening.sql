-- Phase 5 hardening: idempotent retries precede state checks; cashiers only read their own shifts.

drop policy if exists pos_sessions_read on public.pos_sessions;
create policy pos_sessions_read on public.pos_sessions for select to authenticated
using(private.has_permission('pos.manage') or (private.has_permission('pos.use') and opened_by=(select auth.uid())));
drop policy if exists cash_movements_read on public.cash_movements;
create policy cash_movements_read on public.cash_movements for select to authenticated
using(private.has_permission('pos.manage') or (private.has_permission('pos.use') and exists(
  select 1 from public.pos_sessions s where s.id=cash_movements.pos_session_id and s.opened_by=(select auth.uid())
)));

create or replace function private.receive_purchase_order(p_purchase_order_id uuid,p_items jsonb,p_idempotency_key text,p_request_id uuid default gen_random_uuid())
returns jsonb language plpgsql security definer set search_path='extensions' as $$
declare
  actor_id uuid:=(select auth.uid()); organization_value uuid:=private.current_organization_id(); key_value text:=private.assert_command_key(p_idempotency_key);
  existing_result jsonb; result_value jsonb; order_row public.purchase_orders%rowtype; item_row public.purchase_order_items%rowtype;
  inv_row public.inventory%rowtype; line jsonb; quantity_value integer; before_value integer; after_value integer;
  receipt_id_value uuid; receipt_no_value text; received_total integer:=0; remaining_count integer; product_data record; new_average numeric(12,2);
begin
  if actor_id is null then raise exception '请先登录'; end if;
  if not private.has_permission('purchase.receive') then raise exception '没有采购收货权限'; end if;
  select result into existing_result from private.business_command_results where organization_id=organization_value and idempotency_key=key_value and command_type='purchase:receive';
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;
  select * into order_row from public.purchase_orders where id=p_purchase_order_id and organization_id=organization_value for update;
  if not found then raise exception '采购单不存在或无权访问'; end if;
  if order_row.status not in ('approved','ordered','partially_received') then raise exception '当前采购单不能收货'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception '请填写本次实际收货数量'; end if;
  receipt_no_value:=private.next_document_no(organization_value,'purchase_receipt','PR',current_date);
  insert into public.stock_receipts(organization_id,receipt_no,receipt_date,supplier_id,warehouse_id,source_type,status,workflow_status,
    expected_quantity,received_quantity,notes,created_by,confirmed_by,confirmed_at,posted_at,updated_by,purchase_order_id,idempotency_key)
  values(organization_value,receipt_no_value,current_date,order_row.supplier_id,order_row.warehouse_id,'purchase_order','COMPLETED','posted',0,0,
    '关联采购单 '||order_row.purchase_order_no,actor_id,actor_id,now(),now(),actor_id,order_row.id,key_value) returning id into receipt_id_value;
  for line in select value from jsonb_array_elements(p_items) loop
    select * into item_row from public.purchase_order_items where id=nullif(line->>'purchase_order_item_id','')::uuid and purchase_order_id=order_row.id for update;
    if not found then raise exception '收货行不属于当前采购单'; end if;
    quantity_value:=coalesce((line->>'quantity')::integer,0);
    if quantity_value<=0 then raise exception '本次收货数量必须为正整数'; end if;
    if item_row.received_quantity+quantity_value>item_row.ordered_quantity then raise exception 'SKU 超收：累计收货不能超过采购数量'; end if;
    insert into public.inventory(organization_id,variant_id,warehouse_id,quantity_on_hand,quantity_reserved,average_unit_cost)
    values(organization_value,item_row.variant_id,order_row.warehouse_id,0,0,0) on conflict(variant_id,warehouse_id) do nothing;
    select * into inv_row from public.inventory where variant_id=item_row.variant_id and warehouse_id=order_row.warehouse_id for update;
    before_value:=inv_row.quantity_on_hand; after_value:=before_value+quantity_value;
    new_average:=case when after_value=0 then item_row.unit_cost else round((before_value*inv_row.average_unit_cost+quantity_value*item_row.unit_cost)/after_value,2) end;
    update public.inventory set quantity_on_hand=after_value,average_unit_cost=new_average,updated_at=now() where id=inv_row.id;
    update public.purchase_order_items set received_quantity=received_quantity+quantity_value,updated_at=now() where id=item_row.id;
    select p.id as product_id,p.style_no,c.name as color_name,s.name as size_name into product_data
    from public.product_variants v join public.products p on p.id=v.product_id join public.colors c on c.id=v.color_id join public.sizes s on s.id=v.size_id
    where v.id=item_row.variant_id;
    insert into public.stock_receipt_items(organization_id,receipt_id,product_id,variant_id,raw_style_no,normalized_style_no,raw_color,normalized_color,raw_size,normalized_size,
      expected_quantity,received_quantity,difference_quantity,match_type,status,source_metadata,purchase_order_item_id)
    values(organization_value,receipt_id_value,product_data.product_id,item_row.variant_id,product_data.style_no,product_data.style_no,product_data.color_name,product_data.color_name,
      product_data.size_name,product_data.size_name,quantity_value,quantity_value,0,'RESTOCK_EXISTING_SKU','POSTED',jsonb_build_object('purchase_order_id',order_row.id),item_row.id);
    insert into public.inventory_movements(organization_id,inventory_item_id,variant_id,warehouse_id,movement_type,quantity_change,quantity_before,quantity_after,
      reference_type,reference_id,reference_no,reason,created_by,request_id,unit_cost_snapshot)
    values(organization_value,inv_row.id,item_row.variant_id,order_row.warehouse_id,'PURCHASE_IN',quantity_value,before_value,after_value,
      'PURCHASE_RECEIPT',receipt_id_value,receipt_no_value,'采购单部分收货',actor_id,p_request_id,item_row.unit_cost);
    received_total:=received_total+quantity_value;
  end loop;
  update public.stock_receipts set expected_quantity=received_total,received_quantity=received_total where id=receipt_id_value;
  select count(*) into remaining_count from public.purchase_order_items where purchase_order_id=order_row.id and received_quantity<ordered_quantity;
  update public.purchase_orders set status=case when remaining_count=0 then 'received' else 'partially_received' end,updated_by=actor_id where id=order_row.id;
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,old_data,new_data)
  values(organization_value,actor_id,'RECEIVE_PURCHASE_ORDER','purchase_order',order_row.id,jsonb_build_object('status',order_row.status),
    jsonb_build_object('status',case when remaining_count=0 then 'received' else 'partially_received' end,'receipt_id',receipt_id_value,'quantity',received_total,'request_id',p_request_id));
  result_value:=jsonb_build_object('purchase_order_id',order_row.id,'receipt_id',receipt_id_value,'receipt_no',receipt_no_value,'received_quantity',received_total,
    'status',case when remaining_count=0 then 'received' else 'partially_received' end,'idempotent',false);
  return private.finish_business_command(organization_value,key_value,'purchase:receive',result_value);
end;
$$;
revoke all on function private.receive_purchase_order(uuid,jsonb,text,uuid) from public,anon,authenticated,service_role;

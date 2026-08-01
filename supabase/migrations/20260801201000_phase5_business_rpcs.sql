-- NEXORA V1.0 Phase 5 controlled commands.

create or replace function private.next_document_no(p_organization_id uuid,p_type text,p_prefix text,p_date date default current_date)
returns text language plpgsql security definer set search_path='' as $$
declare sequence_value integer;
begin
  insert into private.document_counters(organization_id,document_type,business_date,next_value)
  values(p_organization_id,p_type,p_date,2)
  on conflict(organization_id,document_type,business_date)
  do update set next_value=private.document_counters.next_value+1
  returning next_value-1 into sequence_value;
  return upper(p_prefix)||'-'||to_char(p_date,'YYYYMMDD')||'-'||lpad(sequence_value::text,4,'0');
end;
$$;
revoke all on function private.next_document_no(uuid,text,text,date) from public,anon,authenticated,service_role;

create or replace function private.execute_purchase_order_command(
  p_purchase_order_id uuid,p_command text,p_payload jsonb,p_idempotency_key text,p_request_id uuid default gen_random_uuid()
) returns jsonb language plpgsql security definer set search_path='extensions' as $$
declare
  actor_id uuid:=(select auth.uid()); organization_value uuid:=private.current_organization_id();
  command_value text:=lower(trim(coalesce(p_command,''))); key_value text:=private.assert_command_key(p_idempotency_key);
  existing_result jsonb; result_value jsonb; order_row public.purchase_orders%rowtype; line jsonb; variant_row record;
  order_id_value uuid; order_no_value text; supplier_value uuid; warehouse_value uuid; quantity_value integer;
  unit_cost_value numeric(12,2); tax_rate_value numeric(5,2); line_net_value numeric(12,2); line_tax_value numeric(12,2);
  net_value numeric(12,2):=0; tax_value numeric(12,2):=0; total_value numeric(12,2):=0; item_count integer:=0;
begin
  if actor_id is null then raise exception '请先登录'; end if;
  select result into existing_result from private.business_command_results
  where organization_id=organization_value and idempotency_key=key_value and command_type='purchase:'||command_value;
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;

  if command_value='create' then
    if not private.has_permission('purchase.manage') then raise exception '没有创建采购单的权限'; end if;
    supplier_value:=nullif(p_payload->>'supplier_id','')::uuid;
    warehouse_value:=nullif(p_payload->>'warehouse_id','')::uuid;
    if supplier_value is null or warehouse_value is null then raise exception '请选择供应商和目的仓库'; end if;
    if not exists(select 1 from public.suppliers where id=supplier_value and organization_id=organization_value and is_active and deleted_at is null) then raise exception '供应商不存在或已停用'; end if;
    if not exists(select 1 from public.warehouses where id=warehouse_value and organization_id=organization_value and is_active) then raise exception '目的仓库不存在或已停用'; end if;
    if jsonb_typeof(p_payload->'items')<>'array' or jsonb_array_length(p_payload->'items')=0 then raise exception '采购单至少需要一个 SKU'; end if;
    order_no_value:=private.next_document_no(organization_value,'purchase_order','PO',current_date);
    insert into public.purchase_orders(organization_id,purchase_order_no,supplier_id,warehouse_id,supplier_reference,currency,expected_delivery_date,notes,created_by,updated_by)
    values(organization_value,order_no_value,supplier_value,warehouse_value,nullif(trim(p_payload->>'supplier_reference'),''),
      upper(coalesce(nullif(p_payload->>'currency',''),'EUR')),nullif(p_payload->>'expected_delivery_date','')::date,
      nullif(trim(p_payload->>'notes'),''),actor_id,actor_id) returning id into order_id_value;
    for line in select value from jsonb_array_elements(p_payload->'items') loop
      select v.id into variant_row from public.product_variants v
      where v.id=nullif(line->>'variant_id','')::uuid and v.organization_id=organization_value and v.is_active;
      if not found then raise exception '采购行包含无效 SKU'; end if;
      quantity_value:=coalesce((line->>'quantity')::integer,0);
      unit_cost_value:=round(coalesce((line->>'unit_cost')::numeric,-1),2);
      tax_rate_value:=round(coalesce((line->>'tax_rate')::numeric,22),2);
      if quantity_value<=0 or quantity_value>999999 then raise exception '采购数量必须为正整数'; end if;
      if unit_cost_value<0 or tax_rate_value<0 or tax_rate_value>100 then raise exception '采购成本或税率不正确'; end if;
      line_net_value:=round(quantity_value*unit_cost_value,2); line_tax_value:=round(line_net_value*tax_rate_value/100,2);
      insert into public.purchase_order_items(organization_id,purchase_order_id,variant_id,ordered_quantity,unit_cost,tax_rate,line_net,line_tax,line_total,created_by)
      values(organization_value,order_id_value,variant_row.id,quantity_value,unit_cost_value,tax_rate_value,line_net_value,line_tax_value,line_net_value+line_tax_value,actor_id);
      net_value:=net_value+line_net_value; tax_value:=tax_value+line_tax_value; item_count:=item_count+1;
    end loop;
    total_value:=net_value+tax_value;
    update public.purchase_orders set net_amount=net_value,tax_amount=tax_value,total_amount=total_value where id=order_id_value;
    insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,new_data)
    values(organization_value,actor_id,'CREATE_PURCHASE_ORDER','purchase_order',order_id_value,
      jsonb_build_object('purchase_order_no',order_no_value,'item_count',item_count,'total_amount',total_value,'request_id',p_request_id));
    result_value:=jsonb_build_object('purchase_order_id',order_id_value,'purchase_order_no',order_no_value,'status','draft','total_amount',total_value,'idempotent',false);
  else
    select * into order_row from public.purchase_orders where id=p_purchase_order_id and organization_id=organization_value for update;
    if not found then raise exception '采购单不存在或无权访问'; end if;
    case command_value
      when 'approve' then
        if not private.has_permission('purchase.approve') then raise exception '没有审批采购单的权限'; end if;
        if order_row.status<>'draft' then raise exception '只有草稿采购单可以审批'; end if;
        update public.purchase_orders set status='approved',approved_by=actor_id,approved_at=now(),updated_by=actor_id where id=order_row.id;
      when 'order' then
        if not private.has_permission('purchase.approve') then raise exception '没有下达采购单的权限'; end if;
        if order_row.status<>'approved' then raise exception '只有已审批采购单可以下达'; end if;
        update public.purchase_orders set status='ordered',ordered_at=now(),updated_by=actor_id where id=order_row.id;
      when 'cancel' then
        if not private.has_permission('purchase.approve') then raise exception '没有取消采购单的权限'; end if;
        if order_row.status not in ('draft','approved','ordered') then raise exception '当前采购单不能取消'; end if;
        if nullif(trim(coalesce(p_payload->>'reason','')),'') is null then raise exception '请填写取消原因'; end if;
        update public.purchase_orders set status='cancelled',cancelled_at=now(),cancellation_reason=left(trim(p_payload->>'reason'),500),updated_by=actor_id where id=order_row.id;
      else raise exception '不支持的采购单操作';
    end case;
    insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,old_data,new_data)
    values(organization_value,actor_id,upper(command_value)||'_PURCHASE_ORDER','purchase_order',order_row.id,
      jsonb_build_object('status',order_row.status),jsonb_build_object('status',case command_value when 'approve' then 'approved' when 'order' then 'ordered' else 'cancelled' end,'request_id',p_request_id));
    result_value:=jsonb_build_object('purchase_order_id',order_row.id,'purchase_order_no',order_row.purchase_order_no,
      'status',case command_value when 'approve' then 'approved' when 'order' then 'ordered' else 'cancelled' end,'idempotent',false);
  end if;
  return private.finish_business_command(organization_value,key_value,'purchase:'||command_value,result_value);
end;
$$;
revoke all on function private.execute_purchase_order_command(uuid,text,jsonb,text,uuid) from public,anon,authenticated,service_role;
create or replace function public.rpc_purchase_order_command(p_purchase_order_id uuid,p_command text,p_payload jsonb,p_idempotency_key text,p_request_id uuid default gen_random_uuid())
returns jsonb language sql security invoker set search_path='' as $$ select private.execute_purchase_order_command(p_purchase_order_id,p_command,p_payload,p_idempotency_key,p_request_id); $$;
revoke all on function public.rpc_purchase_order_command(uuid,text,jsonb,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.rpc_purchase_order_command(uuid,text,jsonb,text,uuid) to authenticated,service_role;

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
  select * into order_row from public.purchase_orders where id=p_purchase_order_id and organization_id=organization_value for update;
  if not found then raise exception '采购单不存在或无权访问'; end if;
  if order_row.status not in ('approved','ordered','partially_received') then raise exception '当前采购单不能收货'; end if;
  select result into existing_result from private.business_command_results where organization_id=organization_value and idempotency_key=key_value and command_type='purchase:receive';
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;
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
    values(organization_value,item_row.variant_id,order_row.warehouse_id,0,0,0)
    on conflict(variant_id,warehouse_id) do nothing;
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
create or replace function public.rpc_receive_purchase_order(p_purchase_order_id uuid,p_items jsonb,p_idempotency_key text,p_request_id uuid default gen_random_uuid())
returns jsonb language sql security invoker set search_path='' as $$ select private.receive_purchase_order(p_purchase_order_id,p_items,p_idempotency_key,p_request_id); $$;
revoke all on function public.rpc_receive_purchase_order(uuid,jsonb,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.rpc_receive_purchase_order(uuid,jsonb,text,uuid) to authenticated,service_role;

create or replace function private.append_financial_entry(
  p_organization_id uuid,p_source_type text,p_source_id uuid,p_source_no text,p_entry_type text,p_direction text,p_amount numeric,p_tax numeric,p_currency text,
  p_occurred_at timestamptz,p_channel_id uuid,p_location_id uuid,p_actor_id uuid,p_key text,p_description text,p_reversal_of uuid default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare entry_id uuid;
begin
  insert into public.financial_entries(organization_id,source_type,source_id,source_no,entry_type,direction,amount,tax_amount,currency,occurred_at,channel_id,location_id,actor_id,idempotency_key,description,reversal_of)
  values(p_organization_id,p_source_type,p_source_id,p_source_no,p_entry_type,p_direction,round(p_amount,2),round(coalesce(p_tax,0),2),upper(coalesce(p_currency,'EUR')),
    p_occurred_at,p_channel_id,p_location_id,p_actor_id,p_key,p_description,p_reversal_of)
  on conflict(organization_id,idempotency_key) do nothing returning id into entry_id;
  if entry_id is null then select id into entry_id from public.financial_entries where organization_id=p_organization_id and idempotency_key=p_key; end if;
  return entry_id;
end;
$$;
revoke all on function private.append_financial_entry(uuid,text,uuid,text,text,text,numeric,numeric,text,timestamptz,uuid,uuid,uuid,text,text,uuid) from public,anon,authenticated,service_role;

create or replace function private.sync_payment_financial_entry() returns trigger language plpgsql security definer set search_path='' as $$
declare order_row public.orders%rowtype; location_value uuid; source_type_value text; entry_type_value text;
begin
  if lower(new.status) not in ('paid','completed','succeeded') then return new; end if;
  select * into order_row from public.orders where id=new.order_id;
  select min(warehouse_id) into location_value from public.order_items where order_id=new.order_id;
  source_type_value:=case when order_row.pos_session_id is null then 'order_payment' else 'pos_sale' end;
  entry_type_value:=case when order_row.pos_session_id is null then 'sale_income' else 'pos_income' end;
  perform private.append_financial_entry(new.organization_id,source_type_value,new.id,order_row.order_no,entry_type_value,'inflow',new.amount,0,new.currency,
    coalesce(new.paid_at,new.created_at),order_row.channel_id,location_value,new.verified_by,'payment:'||new.id::text,'订单收款',null);
  return new;
end;
$$;
revoke all on function private.sync_payment_financial_entry() from public,anon,authenticated,service_role;
drop trigger if exists payments_financial_entry on public.payments;
create trigger payments_financial_entry after insert or update of status on public.payments for each row execute function private.sync_payment_financial_entry();

create or replace function private.sync_refund_financial_entry() returns trigger language plpgsql security definer set search_path='' as $$
declare order_row public.orders%rowtype; location_value uuid;
begin
  if lower(new.status)<>'completed' then return new; end if;
  select * into order_row from public.orders where id=new.order_id;
  select min(warehouse_id) into location_value from public.order_items where order_id=new.order_id;
  perform private.append_financial_entry(new.organization_id,'refund',new.id,order_row.order_no,'refund_outflow','outflow',new.amount,0,new.currency,
    coalesce(new.processed_at,new.created_at),order_row.channel_id,location_value,new.processed_by,'refund:'||new.id::text,'订单退款',null);
  return new;
end;
$$;
revoke all on function private.sync_refund_financial_entry() from public,anon,authenticated,service_role;
drop trigger if exists refunds_financial_entry on public.refunds;
create trigger refunds_financial_entry after insert or update of status on public.refunds for each row execute function private.sync_refund_financial_entry();

create or replace function private.capture_order_cost() returns trigger language plpgsql security definer set search_path='' as $$
declare order_id_value uuid; cost_value numeric(12,2);
begin
  if new.movement_type::text not in ('ONLINE_SALE','POS_SALE') then return new; end if;
  if new.reference_type='ORDER' then order_id_value:=new.reference_id;
  elsif new.reference_type='SHIPMENT' then select order_id into order_id_value from public.shipments where id=new.reference_id;
  end if;
  if order_id_value is null then return new; end if;
  cost_value:=coalesce(new.unit_cost_snapshot,(select average_unit_cost from public.inventory where id=new.inventory_item_id),0);
  update public.order_items set unit_cost_snapshot=cost_value,cogs_amount=round(cost_value*quantity,2),gross_profit_amount=round(line_total-cost_value*quantity,2)
  where order_id=order_id_value and variant_id=new.variant_id;
  return new;
end;
$$;
revoke all on function private.capture_order_cost() from public,anon,authenticated,service_role;
drop trigger if exists inventory_movements_capture_cost on public.inventory_movements;
create trigger inventory_movements_capture_cost after insert on public.inventory_movements for each row execute function private.capture_order_cost();

create or replace function private.execute_finance_command(p_entity_type text,p_entity_id uuid,p_command text,p_payload jsonb,p_idempotency_key text,p_request_id uuid default gen_random_uuid())
returns jsonb language plpgsql security definer set search_path='extensions' as $$
declare
  actor_id uuid:=(select auth.uid()); organization_value uuid:=private.current_organization_id(); key_value text:=private.assert_command_key(p_idempotency_key);
  entity_value text:=lower(trim(coalesce(p_entity_type,''))); command_value text:=lower(trim(coalesce(p_command,''))); existing_result jsonb; result_value jsonb;
  expense_row public.expenses%rowtype; order_row public.purchase_orders%rowtype; entry_row public.financial_entries%rowtype;
  expense_id_value uuid; payment_id_value uuid; entry_id_value uuid; number_value text; net_value numeric(12,2); tax_value numeric(12,2); total_value numeric(12,2); amount_value numeric(12,2);
begin
  if actor_id is null then raise exception '请先登录'; end if;
  select result into existing_result from private.business_command_results where organization_id=organization_value and idempotency_key=key_value and command_type='finance:'||entity_value||':'||command_value;
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;
  if entity_value='expense' and command_value='create' then
    if not private.has_permission('finance.manage') then raise exception '没有创建费用的权限'; end if;
    net_value:=round(coalesce((p_payload->>'net_amount')::numeric,-1),2); tax_value:=round(coalesce((p_payload->>'tax_amount')::numeric,0),2); total_value:=net_value+tax_value;
    if net_value<0 or tax_value<0 or total_value<=0 then raise exception '费用金额不正确'; end if;
    if nullif(trim(coalesce(p_payload->>'category','')),'') is null or nullif(trim(coalesce(p_payload->>'description','')),'') is null then raise exception '请填写费用分类和说明'; end if;
    number_value:=private.next_document_no(organization_value,'expense','EXP',coalesce(nullif(p_payload->>'expense_date','')::date,current_date));
    insert into public.expenses(organization_id,expense_no,category,supplier_id,net_amount,tax_amount,total_amount,currency,expense_date,description,attachment_path,created_by,updated_by)
    values(organization_value,number_value,left(trim(p_payload->>'category'),80),nullif(p_payload->>'supplier_id','')::uuid,net_value,tax_value,total_value,
      upper(coalesce(nullif(p_payload->>'currency',''),'EUR')),coalesce(nullif(p_payload->>'expense_date','')::date,current_date),left(trim(p_payload->>'description'),1000),
      nullif(trim(p_payload->>'attachment_path'),''),actor_id,actor_id) returning id into expense_id_value;
    result_value:=jsonb_build_object('expense_id',expense_id_value,'expense_no',number_value,'status','draft','total_amount',total_value,'idempotent',false);
  elsif entity_value='expense' then
    select * into expense_row from public.expenses where id=p_entity_id and organization_id=organization_value for update;
    if not found then raise exception '费用记录不存在或无权访问'; end if;
    case command_value
      when 'submit' then
        if not private.has_permission('finance.manage') or expense_row.status<>'draft' then raise exception '当前费用不能提交'; end if;
        update public.expenses set status='submitted',updated_by=actor_id where id=expense_row.id;
      when 'approve' then
        if not private.has_permission('finance.approve') or expense_row.status<>'submitted' then raise exception '当前费用不能审批'; end if;
        update public.expenses set status='approved',approved_by=actor_id,approved_at=now(),updated_by=actor_id where id=expense_row.id;
      when 'pay' then
        if not private.has_permission('finance.manage') or expense_row.status<>'approved' then raise exception '只有已审批费用可以付款'; end if;
        update public.expenses set status='paid',paid_at=now(),updated_by=actor_id where id=expense_row.id;
        entry_id_value:=private.append_financial_entry(organization_value,'expense',expense_row.id,expense_row.expense_no,'expense_outflow','outflow',expense_row.total_amount,expense_row.tax_amount,
          expense_row.currency,now(),null,null,actor_id,'expense:'||expense_row.id::text,'经营费用：'||expense_row.description,null);
      when 'reject' then
        if not private.has_permission('finance.approve') or expense_row.status<>'submitted' then raise exception '当前费用不能驳回'; end if;
        update public.expenses set status='rejected',updated_by=actor_id where id=expense_row.id;
      when 'cancel' then
        if not private.has_permission('finance.manage') or expense_row.status not in ('draft','rejected') then raise exception '当前费用不能取消'; end if;
        update public.expenses set status='cancelled',updated_by=actor_id where id=expense_row.id;
      else raise exception '不支持的费用操作';
    end case;
    result_value:=jsonb_build_object('expense_id',expense_row.id,'expense_no',expense_row.expense_no,'status',command_value,'financial_entry_id',entry_id_value,'idempotent',false);
  elsif entity_value='purchase_payment' and command_value='record' then
    if not private.has_permission('finance.manage') then raise exception '没有登记采购付款的权限'; end if;
    select * into order_row from public.purchase_orders where id=p_entity_id and organization_id=organization_value for update;
    if not found or order_row.status in ('draft','cancelled') then raise exception '当前采购单不能登记付款'; end if;
    amount_value:=round(coalesce((p_payload->>'amount')::numeric,0),2);
    if amount_value<=0 or amount_value>order_row.total_amount-coalesce((select sum(amount) from public.purchase_payments where purchase_order_id=order_row.id and status='completed'),0) then raise exception '付款金额超过待付金额'; end if;
    insert into public.purchase_payments(organization_id,purchase_order_id,amount,currency,payment_method,provider_reference,status,idempotency_key,paid_at,created_by)
    values(organization_value,order_row.id,amount_value,order_row.currency,coalesce(nullif(p_payload->>'payment_method',''),'bank_transfer'),nullif(trim(p_payload->>'provider_reference'),''),
      'completed',key_value,now(),actor_id) returning id into payment_id_value;
    entry_id_value:=private.append_financial_entry(organization_value,'purchase_payment',payment_id_value,order_row.purchase_order_no,'purchase_outflow','outflow',amount_value,0,order_row.currency,
      now(),null,order_row.warehouse_id,actor_id,'purchase-payment:'||payment_id_value::text,'采购付款',null);
    result_value:=jsonb_build_object('purchase_payment_id',payment_id_value,'financial_entry_id',entry_id_value,'amount',amount_value,'idempotent',false);
  elsif entity_value='financial_entry' and command_value='reverse' then
    if not private.has_permission('finance.approve') then raise exception '没有冲正财务分录的权限'; end if;
    select * into entry_row from public.financial_entries where id=p_entity_id and organization_id=organization_value;
    if not found then raise exception '财务分录不存在或无权访问'; end if;
    if nullif(trim(coalesce(p_payload->>'reason','')),'') is null then raise exception '请填写冲正原因'; end if;
    entry_id_value:=private.append_financial_entry(organization_value,'adjustment',gen_random_uuid(),entry_row.source_no,'reversal',
      case when entry_row.direction='inflow' then 'outflow' else 'inflow' end,entry_row.amount,entry_row.tax_amount,entry_row.currency,now(),entry_row.channel_id,entry_row.location_id,actor_id,
      'reversal:'||entry_row.id::text||':'||key_value,'冲正：'||left(trim(p_payload->>'reason'),500),entry_row.id);
    result_value:=jsonb_build_object('reversal_entry_id',entry_id_value,'reversal_of',entry_row.id,'idempotent',false);
  else raise exception '不支持的财务操作'; end if;
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,new_data)
  values(organization_value,actor_id,upper(command_value)||'_FINANCE',entity_value,coalesce(p_entity_id,expense_id_value,payment_id_value,entry_id_value),result_value||jsonb_build_object('request_id',p_request_id));
  return private.finish_business_command(organization_value,key_value,'finance:'||entity_value||':'||command_value,result_value);
end;
$$;
revoke all on function private.execute_finance_command(text,uuid,text,jsonb,text,uuid) from public,anon,authenticated,service_role;
create or replace function public.rpc_finance_command(p_entity_type text,p_entity_id uuid,p_command text,p_payload jsonb,p_idempotency_key text,p_request_id uuid default gen_random_uuid())
returns jsonb language sql security invoker set search_path='' as $$ select private.execute_finance_command(p_entity_type,p_entity_id,p_command,p_payload,p_idempotency_key,p_request_id); $$;
revoke all on function public.rpc_finance_command(text,uuid,text,jsonb,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.rpc_finance_command(text,uuid,text,jsonb,text,uuid) to authenticated,service_role;

-- NEXORA V1.0 Phase 5 POS transactions and unified management metrics.

create or replace function private.execute_pos_session_command(
  p_session_id uuid,p_command text,p_payload jsonb,p_idempotency_key text,p_request_id uuid default gen_random_uuid()
) returns jsonb language plpgsql security definer set search_path='extensions' as $$
declare
  actor_id uuid:=(select auth.uid()); organization_value uuid:=private.current_organization_id(); key_value text:=private.assert_command_key(p_idempotency_key);
  command_value text:=lower(trim(coalesce(p_command,''))); existing_result jsonb; result_value jsonb; session_row public.pos_sessions%rowtype;
  session_id_value uuid; session_no_value text; warehouse_value uuid; amount_value numeric(12,2); expected_value numeric(12,2); counted_value numeric(12,2); difference_value numeric(12,2);
begin
  if actor_id is null then raise exception '请先登录'; end if;
  if not private.has_permission('pos.use') then raise exception '没有使用 POS 的权限'; end if;
  select result into existing_result from private.business_command_results where organization_id=organization_value and idempotency_key=key_value and command_type='pos_session:'||command_value;
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;
  if command_value='open' then
    warehouse_value:=nullif(p_payload->>'warehouse_id','')::uuid;
    amount_value:=round(coalesce((p_payload->>'opening_cash')::numeric,-1),2);
    if amount_value<0 then raise exception '备用金不能小于 0'; end if;
    if not exists(select 1 from public.warehouses where id=warehouse_value and organization_id=organization_value and is_active) then raise exception '门店或仓库不存在'; end if;
    if exists(select 1 from public.pos_sessions where organization_id=organization_value and opened_by=actor_id and status='open') then raise exception '当前账号已有未关闭班次'; end if;
    session_no_value:=private.next_document_no(organization_value,'pos_session','SHIFT',current_date);
    insert into public.pos_sessions(organization_id,warehouse_id,session_no,opening_cash,opened_by)
    values(organization_value,warehouse_value,session_no_value,amount_value,actor_id) returning id into session_id_value;
    insert into public.cash_movements(organization_id,pos_session_id,movement_type,amount,reason,created_by)
    values(organization_value,session_id_value,'opening',amount_value,'开班备用金',actor_id);
    result_value:=jsonb_build_object('session_id',session_id_value,'session_no',session_no_value,'status','open','opening_cash',amount_value,'idempotent',false);
  else
    select * into session_row from public.pos_sessions where id=p_session_id and organization_id=organization_value for update;
    if not found then raise exception 'POS 班次不存在或无权访问'; end if;
    if session_row.status<>'open' then raise exception 'POS 班次已经关闭'; end if;
    if session_row.opened_by<>actor_id and not private.has_permission('pos.manage') then raise exception '只能操作自己的 POS 班次'; end if;
    if command_value in ('cash_in','cash_out') then
      amount_value:=round(coalesce((p_payload->>'amount')::numeric,0),2);
      if amount_value<=0 then raise exception '现金金额必须大于 0'; end if;
      if nullif(trim(coalesce(p_payload->>'reason','')),'') is null then raise exception '请填写现金存取原因'; end if;
      expected_value:=session_row.opening_cash+session_row.cash_sales+session_row.cash_in-session_row.cash_out;
      if command_value='cash_out' and amount_value>expected_value then raise exception '取现金额不能超过当前应有现金'; end if;
      update public.pos_sessions set cash_in=cash_in+case when command_value='cash_in' then amount_value else 0 end,
        cash_out=cash_out+case when command_value='cash_out' then amount_value else 0 end where id=session_row.id;
      insert into public.cash_movements(organization_id,pos_session_id,movement_type,amount,reason,created_by)
      values(organization_value,session_row.id,command_value,amount_value,left(trim(p_payload->>'reason'),500),actor_id);
      result_value:=jsonb_build_object('session_id',session_row.id,'status','open','movement',command_value,'amount',amount_value,'idempotent',false);
    elsif command_value='close' then
      counted_value:=round(coalesce((p_payload->>'closing_cash')::numeric,-1),2);
      if counted_value<0 then raise exception '实点现金不能小于 0'; end if;
      expected_value:=round(session_row.opening_cash+session_row.cash_sales+session_row.cash_in-session_row.cash_out,2);
      difference_value:=round(counted_value-expected_value,2);
      if difference_value<>0 and nullif(trim(coalesce(p_payload->>'difference_reason','')),'') is null then raise exception '现金有差异，请填写原因'; end if;
      update public.pos_sessions set status='closed',expected_cash=expected_value,closing_cash=counted_value,cash_difference=difference_value,
        difference_reason=nullif(left(trim(p_payload->>'difference_reason'),500),''),closed_by=actor_id,closed_at=now() where id=session_row.id;
      insert into public.cash_movements(organization_id,pos_session_id,movement_type,amount,reason,created_by)
      values(organization_value,session_row.id,'closing',counted_value,'关班实点现金',actor_id);
      if difference_value<>0 then
        insert into public.cash_movements(organization_id,pos_session_id,movement_type,amount,reason,created_by)
        values(organization_value,session_row.id,'variance',abs(difference_value),coalesce(nullif(trim(p_payload->>'difference_reason'),''),'现金差异'),actor_id);
        perform private.append_financial_entry(organization_value,'cash_variance',session_row.id,session_row.session_no,'cash_variance',
          case when difference_value>0 then 'inflow' else 'outflow' end,abs(difference_value),0,'EUR',now(),null,session_row.warehouse_id,actor_id,
          'cash-variance:'||session_row.id::text,'POS 关班现金差异',null);
      end if;
      result_value:=jsonb_build_object('session_id',session_row.id,'session_no',session_row.session_no,'status','closed','expected_cash',expected_value,
        'closing_cash',counted_value,'cash_difference',difference_value,'idempotent',false);
    else raise exception '不支持的 POS 班次操作'; end if;
  end if;
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,new_data)
  values(organization_value,actor_id,upper(command_value)||'_POS_SESSION','pos_session',coalesce(p_session_id,session_id_value),result_value||jsonb_build_object('request_id',p_request_id));
  return private.finish_business_command(organization_value,key_value,'pos_session:'||command_value,result_value);
end;
$$;
revoke all on function private.execute_pos_session_command(uuid,text,jsonb,text,uuid) from public,anon,authenticated,service_role;
create or replace function public.rpc_pos_session_command(p_session_id uuid,p_command text,p_payload jsonb,p_idempotency_key text,p_request_id uuid default gen_random_uuid())
returns jsonb language sql security invoker set search_path='' as $$ select private.execute_pos_session_command(p_session_id,p_command,p_payload,p_idempotency_key,p_request_id); $$;
revoke all on function public.rpc_pos_session_command(uuid,text,jsonb,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.rpc_pos_session_command(uuid,text,jsonb,text,uuid) to authenticated,service_role;

create or replace function private.complete_pos_sale(p_session_id uuid,p_cart jsonb,p_payments jsonb,p_idempotency_key text,p_request_id uuid default gen_random_uuid())
returns jsonb language plpgsql security definer set search_path='extensions' as $$
declare
  actor_id uuid:=(select auth.uid()); organization_value uuid:=private.current_organization_id(); key_value text:=private.assert_command_key(p_idempotency_key);
  existing_result jsonb; result_value jsonb; session_row public.pos_sessions%rowtype; line jsonb; payment_line jsonb; product_data record; inv_row public.inventory%rowtype;
  order_id_value uuid; order_no_value text; channel_value uuid; quantity_value integer; unit_price_value numeric(12,2); discount_value numeric(12,2); amount_value numeric(12,2);
  line_value numeric(12,2); subtotal_value numeric(12,2):=0; discount_total numeric(12,2):=0; total_value numeric(12,2):=0; payment_total numeric(12,2):=0;
  cash_total numeric(12,2):=0; non_cash_total numeric(12,2):=0; before_value integer; item_count integer:=0; max_discount_rate numeric:=0.10;
begin
  if actor_id is null then raise exception '请先登录'; end if;
  if not private.has_permission('pos.use') then raise exception '没有 POS 销售权限'; end if;
  select * into session_row from public.pos_sessions where id=p_session_id and organization_id=organization_value for update;
  if not found or session_row.status<>'open' then raise exception '请先开班，或当前班次已经关闭'; end if;
  if session_row.opened_by<>actor_id and not private.has_permission('pos.manage') then raise exception '只能使用自己的 POS 班次'; end if;
  select result into existing_result from private.business_command_results where organization_id=organization_value and idempotency_key=key_value and command_type='pos:sale';
  if existing_result is not null then return existing_result||jsonb_build_object('idempotent',true); end if;
  if jsonb_typeof(p_cart)<>'array' or jsonb_array_length(p_cart)=0 or jsonb_array_length(p_cart)>100 then raise exception '购物车必须包含 1 至 100 个 SKU'; end if;
  if jsonb_typeof(p_payments)<>'array' or jsonb_array_length(p_payments)=0 then raise exception '请选择支付方式'; end if;
  if exists(select 1 from (select value->>'variant_id' id,count(*) from jsonb_array_elements(p_cart) group by value->>'variant_id' having count(*)>1) d) then raise exception '同一 SKU 不能重复，请合并数量'; end if;
  if private.has_permission('pos.manage') then max_discount_rate:=0.30; end if;

  for line in select value from jsonb_array_elements(p_cart) loop
    quantity_value:=coalesce((line->>'quantity')::integer,0); discount_value:=round(coalesce((line->>'discount_amount')::numeric,0),2);
    select v.id as variant_id,v.sku,v.barcode,p.id as product_id,coalesce(p.name_zh,p.name,p.style_no) as product_title,p.retail_price,
      p.cost_price,c.name as color_name,s.name as size_name
    into product_data from public.product_variants v join public.products p on p.id=v.product_id
      join public.colors c on c.id=v.color_id join public.sizes s on s.id=v.size_id
    where v.id=nullif(line->>'variant_id','')::uuid and v.organization_id=organization_value and v.is_active and p.deleted_at is null;
    if not found then raise exception '购物车包含无效 SKU'; end if;
    unit_price_value:=round(coalesce((select pbi.unit_price from public.price_book_items pbi join public.price_books pb on pb.id=pbi.price_book_id
      join public.channels ch on ch.id=pb.channel_id where pbi.organization_id=organization_value and pbi.is_active and pb.is_active and ch.code='POS'
      and pbi.product_id=product_data.product_id and (pbi.variant_id=product_data.variant_id or pbi.variant_id is null)
      and (pbi.valid_from is null or pbi.valid_from<=now()) and (pbi.valid_until is null or pbi.valid_until>now())
      order by (pbi.variant_id is not null) desc,pbi.created_at desc limit 1),product_data.retail_price),2);
    if quantity_value<=0 or quantity_value>9999 then raise exception '销售数量不正确'; end if;
    if unit_price_value is null or unit_price_value<0 then raise exception 'SKU 尚未配置有效零售价'; end if;
    if discount_value<0 or discount_value>round(unit_price_value*quantity_value*max_discount_rate,2) then raise exception '折扣超过当前角色授权范围'; end if;
    subtotal_value:=subtotal_value+unit_price_value*quantity_value; discount_total:=discount_total+discount_value; item_count:=item_count+1;
  end loop;
  total_value:=round(subtotal_value-discount_total,2);
  for payment_line in select value from jsonb_array_elements(p_payments) loop
    if lower(coalesce(payment_line->>'method','')) not in ('cash','card','bank_transfer','other') then raise exception '支付方式无效'; end if;
    payment_total:=payment_total+round(coalesce((payment_line->>'amount')::numeric,0),2);
  end loop;
  if payment_total<>total_value or total_value<=0 then raise exception '支付合计必须与订单应收金额一致'; end if;

  insert into public.channels(organization_id,code,name,channel_type,currency,is_active,created_by,updated_by)
  values(organization_value,'POS','门店 POS','pos','EUR',true,actor_id,actor_id)
  on conflict(organization_id,code) do update set is_active=true,updated_at=now() returning id into channel_value;
  order_no_value:=private.next_document_no(organization_value,'pos_order','POS',current_date);
  insert into public.orders(organization_id,order_no,status,subtotal,shipping_fee,discount_amount,tax_amount,total_amount,payment_status,fulfillment_type,
    idempotency_key,channel_id,currency,customer_name,contact_snapshot,lifecycle_status,fulfillment_status,paid_at,completed_at,pos_session_id,updated_by)
  values(organization_value,order_no_value,'COMPLETED',subtotal_value,0,discount_total,0,total_value,'paid','PICKUP',key_value,channel_value,'EUR','门店顾客','{}',
    'completed','picked_up',now(),now(),session_row.id,actor_id) returning id into order_id_value;

  for line in select value from jsonb_array_elements(p_cart) loop
    quantity_value:=(line->>'quantity')::integer; discount_value:=round(coalesce((line->>'discount_amount')::numeric,0),2);
    select v.id as variant_id,v.sku,p.id as product_id,coalesce(p.name_zh,p.name,p.style_no) as product_title,p.retail_price,p.cost_price,
      c.name as color_name,s.name as size_name
    into product_data from public.product_variants v join public.products p on p.id=v.product_id join public.colors c on c.id=v.color_id join public.sizes s on s.id=v.size_id
    where v.id=(line->>'variant_id')::uuid;
    unit_price_value:=round(coalesce((select pbi.unit_price from public.price_book_items pbi join public.price_books pb on pb.id=pbi.price_book_id
      join public.channels ch on ch.id=pb.channel_id where pbi.organization_id=organization_value and pbi.is_active and pb.is_active and ch.code='POS'
      and pbi.product_id=product_data.product_id and (pbi.variant_id=product_data.variant_id or pbi.variant_id is null)
      and (pbi.valid_from is null or pbi.valid_from<=now()) and (pbi.valid_until is null or pbi.valid_until>now()) order by (pbi.variant_id is not null) desc,pbi.created_at desc limit 1),product_data.retail_price),2);
    select * into inv_row from public.inventory where variant_id=product_data.variant_id and warehouse_id=session_row.warehouse_id for update;
    if not found or inv_row.quantity_on_hand-inv_row.quantity_reserved<quantity_value then raise exception 'SKU % 库存不足',product_data.sku; end if;
    before_value:=inv_row.quantity_on_hand; line_value:=round(unit_price_value*quantity_value-discount_value,2);
    update public.inventory set quantity_on_hand=quantity_on_hand-quantity_value,updated_at=now() where id=inv_row.id;
    insert into public.order_items(order_id,variant_id,warehouse_id,product_title,sku,color_name,size_name,unit_price,quantity,line_total,product_id,currency,discount_amount,
      unit_cost_snapshot,cogs_amount,gross_profit_amount)
    values(order_id_value,product_data.variant_id,session_row.warehouse_id,product_data.product_title,product_data.sku,product_data.color_name,product_data.size_name,
      unit_price_value,quantity_value,line_value,product_data.product_id,'EUR',discount_value,inv_row.average_unit_cost,round(inv_row.average_unit_cost*quantity_value,2),
      round(line_value-inv_row.average_unit_cost*quantity_value,2));
    insert into public.inventory_movements(organization_id,inventory_item_id,variant_id,warehouse_id,movement_type,quantity_change,quantity_before,quantity_after,
      reference_type,reference_id,reference_no,reason,created_by,request_id,unit_cost_snapshot)
    values(organization_value,inv_row.id,product_data.variant_id,session_row.warehouse_id,'POS_SALE',-quantity_value,before_value,before_value-quantity_value,
      'ORDER',order_id_value,order_no_value,'POS 门店销售',actor_id,p_request_id,inv_row.average_unit_cost);
  end loop;
  for payment_line in select value from jsonb_array_elements(p_payments) loop
    amount_value:=round((payment_line->>'amount')::numeric,2);
    insert into public.payments(organization_id,order_id,provider,provider_reference,amount,status,paid_at,currency,payment_method,idempotency_key,verified_by)
    values(organization_value,order_id_value,'pos',nullif(trim(payment_line->>'reference'),''),amount_value,'completed',now(),'EUR',lower(payment_line->>'method'),
      key_value||':'||lower(payment_line->>'method')||':'||substr(md5(payment_line::text),1,8),actor_id);
    if lower(payment_line->>'method')='cash' then cash_total:=cash_total+amount_value; else non_cash_total:=non_cash_total+amount_value; end if;
  end loop;
  update public.pos_sessions set cash_sales=cash_sales+cash_total,non_cash_sales=non_cash_sales+non_cash_total where id=session_row.id;
  if cash_total>0 then insert into public.cash_movements(organization_id,pos_session_id,movement_type,amount,reason,reference_type,reference_id,created_by)
    values(organization_value,session_row.id,'cash_sale',cash_total,'POS 现金销售','ORDER',order_id_value,actor_id); end if;
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,new_data)
  values(organization_value,actor_id,'COMPLETE_POS_SALE','order',order_id_value,jsonb_build_object('order_no',order_no_value,'session_id',session_row.id,
    'item_count',item_count,'total_amount',total_value,'cash_amount',cash_total,'non_cash_amount',non_cash_total,'request_id',p_request_id));
  result_value:=jsonb_build_object('order_id',order_id_value,'order_no',order_no_value,'total_amount',total_value,'cash_amount',cash_total,'non_cash_amount',non_cash_total,'idempotent',false);
  return private.finish_business_command(organization_value,key_value,'pos:sale',result_value);
end;
$$;
revoke all on function private.complete_pos_sale(uuid,jsonb,jsonb,text,uuid) from public,anon,authenticated,service_role;
create or replace function public.rpc_complete_pos_sale(p_session_id uuid,p_cart jsonb,p_payments jsonb,p_idempotency_key text,p_request_id uuid default gen_random_uuid())
returns jsonb language sql security invoker set search_path='' as $$ select private.complete_pos_sale(p_session_id,p_cart,p_payments,p_idempotency_key,p_request_id); $$;
revoke all on function public.rpc_complete_pos_sale(uuid,jsonb,jsonb,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.rpc_complete_pos_sale(uuid,jsonb,jsonb,text,uuid) to authenticated,service_role;

create or replace function private.get_business_metrics(p_from date,p_to date,p_channel_id uuid default null,p_location_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare organization_value uuid:=private.current_organization_id(); start_value timestamptz; end_value timestamptz; result_value jsonb;
begin
  if (select auth.uid()) is null then raise exception '请先登录'; end if;
  if not (private.has_permission('dashboard.owner.read') or private.has_permission('finance.read')) then raise exception '没有查看经营指标的权限'; end if;
  if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception '日期范围必须在 1 至 367 天内'; end if;
  start_value:=p_from::timestamp at time zone 'Europe/Rome'; end_value:=(p_to+1)::timestamp at time zone 'Europe/Rome';
  with entries as (
    select * from public.financial_entries f where f.organization_id=organization_value and f.occurred_at>=start_value and f.occurred_at<end_value
      and (p_channel_id is null or f.channel_id=p_channel_id) and (p_location_id is null or f.location_id=p_location_id)
  ), base as (
    select
      coalesce(sum(amount) filter(where entry_type in ('sale_income','pos_income') and direction='inflow'),0) sales,
      coalesce(sum(amount) filter(where entry_type='refund_outflow' and direction='outflow'),0) refunds,
      coalesce(sum(amount) filter(where entry_type='expense_outflow' and direction='outflow'),0) expenses,
      coalesce(sum(amount) filter(where entry_type='purchase_outflow' and direction='outflow'),0) purchase_payments,
      coalesce(sum(case when direction='inflow' then amount else -amount end),0) operating_net
    from entries
  ), order_stats as (
    select count(distinct o.id) order_count,coalesce(sum(oi.cogs_amount),0) cogs
    from public.orders o left join public.order_items oi on oi.order_id=o.id
    where o.organization_id=organization_value and o.created_at>=start_value and o.created_at<end_value and o.lifecycle_status<>'cancelled'
      and (p_channel_id is null or o.channel_id=p_channel_id) and (p_location_id is null or oi.warehouse_id=p_location_id)
  ), inventory_stats as (
    select coalesce(sum(i.quantity_on_hand*i.average_unit_cost),0) cost_value,
      coalesce(sum(i.quantity_on_hand*coalesce(p.retail_price,0)),0) retail_value,
      count(*) filter(where i.quantity_available<=i.low_stock_threshold) low_stock
    from public.inventory i join public.product_variants v on v.id=i.variant_id join public.products p on p.id=v.product_id
    where i.organization_id=organization_value and (p_location_id is null or i.warehouse_id=p_location_id)
  ), trend as (
    select coalesce(jsonb_agg(jsonb_build_object('date',metric_day::date,'inflow',inflow,'outflow',outflow,'net',inflow-outflow) order by metric_day),'[]'::jsonb) value
    from (
      select gs metric_day,coalesce(sum(e.amount) filter(where e.direction='inflow'),0) inflow,coalesce(sum(e.amount) filter(where e.direction='outflow'),0) outflow
      from generate_series(p_from::timestamp,p_to::timestamp,interval '1 day') gs
      left join entries e on (e.occurred_at at time zone 'Europe/Rome')::date=gs::date group by gs
    ) d
  )
  select jsonb_build_object('from',p_from,'to',p_to,'timezone','Europe/Rome','generated_at',now(),
    'sales',b.sales,'refunds',b.refunds,'net_sales',b.sales-b.refunds,'expenses',b.expenses,'purchase_payments',b.purchase_payments,
    'operating_net',b.operating_net,'cogs',o.cogs,'gross_profit',b.sales-b.refunds-o.cogs,
    'gross_margin_rate',case when b.sales-b.refunds=0 then 0 else round((b.sales-b.refunds-o.cogs)*100/(b.sales-b.refunds),2) end,
    'order_count',o.order_count,'average_order_value',case when o.order_count=0 then 0 else round((b.sales-b.refunds)/o.order_count,2) end,
    'inventory_cost_value',i.cost_value,'inventory_retail_value',i.retail_value,'low_stock_count',i.low_stock,'trend',t.value)
  into result_value from base b cross join order_stats o cross join inventory_stats i cross join trend t;
  return result_value;
end;
$$;
revoke all on function private.get_business_metrics(date,date,uuid,uuid) from public,anon,authenticated,service_role;
create or replace function public.rpc_business_metrics(p_from date,p_to date,p_channel_id uuid default null,p_location_id uuid default null)
returns jsonb language sql security invoker set search_path='' as $$ select private.get_business_metrics(p_from,p_to,p_channel_id,p_location_id); $$;
revoke all on function public.rpc_business_metrics(date,date,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.rpc_business_metrics(date,date,uuid,uuid) to authenticated,service_role;

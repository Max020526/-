begin;

do $$
declare
  actor_id uuid:='07279ec0-cc56-478f-8e12-d94b87fe9683'; organization_value uuid; warehouse_value uuid; supplier_value uuid;
  color_value uuid; size_value uuid; product_value uuid:=gen_random_uuid(); variant_value uuid:=gen_random_uuid(); inventory_value uuid:=gen_random_uuid();
  result_value jsonb; purchase_id uuid; purchase_item_id uuid; session_id uuid; expense_id uuid; entry_count integer; balance_value integer; metrics jsonb;
begin
  select organization_id into organization_value from public.profiles where id=actor_id;
  select id into warehouse_value from public.warehouses where organization_id=organization_value order by created_at limit 1;
  select id into color_value from public.colors where organization_id=organization_value and is_active order by created_at limit 1;
  select id into size_value from public.sizes where organization_id=organization_value and is_active order by created_at limit 1;
  if organization_value is null or warehouse_value is null or color_value is null or size_value is null then raise exception 'Phase 5 test fixture prerequisites missing'; end if;

  insert into public.suppliers(id,organization_id,name,supplier_code,supplier_name,is_active,currency)
  values(gen_random_uuid(),organization_value,'PHASE5-TEST-SUPPLIER','PH5','PHASE5-TEST-SUPPLIER',true,'EUR') returning id into supplier_value;
  insert into public.products(id,organization_id,style_no,model_number,name,name_zh,retail_price,cost_price,status,workflow_status,created_by)
  values(product_value,organization_value,'PH5-STYLE','PH5-STYLE','Phase 5 Test','第五阶段测试商品',50,10,'PUBLISHED','published',actor_id);
  insert into public.product_variants(id,organization_id,product_id,color_id,size_id,sku,is_active,is_visible_online)
  values(variant_value,organization_value,product_value,color_value,size_value,'PH5-SKU',true,true);
  insert into public.inventory(id,organization_id,variant_id,warehouse_id,quantity_on_hand,quantity_reserved,average_unit_cost)
  values(inventory_value,organization_value,variant_value,warehouse_value,5,0,10);

  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor_id,'role','authenticated')::text,true);

  result_value:=public.rpc_purchase_order_command(null,'create',jsonb_build_object('supplier_id',supplier_value,'warehouse_id',warehouse_value,'items',jsonb_build_array(jsonb_build_object('variant_id',variant_value,'quantity',2,'unit_cost',12,'tax_rate',22))),'phase5-test-purchase-create',gen_random_uuid());
  purchase_id:=(result_value->>'purchase_order_id')::uuid;
  select id into purchase_item_id from public.purchase_order_items where purchase_order_id=purchase_id;
  perform public.rpc_purchase_order_command(purchase_id,'approve','{}','phase5-test-purchase-approve',gen_random_uuid());
  perform public.rpc_purchase_order_command(purchase_id,'order','{}','phase5-test-purchase-order',gen_random_uuid());
  perform public.rpc_receive_purchase_order(purchase_id,jsonb_build_array(jsonb_build_object('purchase_order_item_id',purchase_item_id,'quantity',1)),'phase5-test-receive-1',gen_random_uuid());
  if (select status from public.purchase_orders where id=purchase_id)<>'partially_received' then raise exception 'A11 partial receipt status failed'; end if;
  perform public.rpc_receive_purchase_order(purchase_id,jsonb_build_array(jsonb_build_object('purchase_order_item_id',purchase_item_id,'quantity',1)),'phase5-test-receive-2',gen_random_uuid());
  if (select status from public.purchase_orders where id=purchase_id)<>'received' or (select received_quantity from public.purchase_order_items where id=purchase_item_id)<>2 then raise exception 'A11 complete receipt accumulation failed'; end if;
  result_value:=public.rpc_receive_purchase_order(purchase_id,jsonb_build_array(jsonb_build_object('purchase_order_item_id',purchase_item_id,'quantity',1)),'phase5-test-receive-2',gen_random_uuid());
  if not coalesce((result_value->>'idempotent')::boolean,false) then raise exception 'A11 receipt idempotency failed'; end if;
  select quantity_on_hand into balance_value from public.inventory where id=inventory_value;
  if balance_value<>7 then raise exception 'A11 inventory balance expected 7, got %',balance_value; end if;

  result_value:=public.rpc_pos_session_command(null,'open',jsonb_build_object('warehouse_id',warehouse_value,'opening_cash',100),'phase5-test-pos-open',gen_random_uuid());
  session_id:=(result_value->>'session_id')::uuid;
  result_value:=public.rpc_complete_pos_sale(session_id,jsonb_build_array(jsonb_build_object('variant_id',variant_value,'quantity',1,'discount_amount',0)),jsonb_build_array(jsonb_build_object('method','cash','amount',50)),'phase5-test-pos-sale',gen_random_uuid());
  if (result_value->>'order_id') is null then raise exception 'A12 POS order missing'; end if;
  result_value:=public.rpc_complete_pos_sale(session_id,jsonb_build_array(jsonb_build_object('variant_id',variant_value,'quantity',1,'discount_amount',0)),jsonb_build_array(jsonb_build_object('method','cash','amount',50)),'phase5-test-pos-sale',gen_random_uuid());
  if not coalesce((result_value->>'idempotent')::boolean,false) then raise exception 'A12 POS idempotency failed'; end if;
  select quantity_on_hand into balance_value from public.inventory where id=inventory_value;
  if balance_value<>6 then raise exception 'A12 POS inventory expected 6, got %',balance_value; end if;
  perform public.rpc_pos_session_command(session_id,'close',jsonb_build_object('closing_cash',150,'difference_reason',''),'phase5-test-pos-close',gen_random_uuid());
  if (select cash_difference from public.pos_sessions where id=session_id)<>0 then raise exception 'A12 POS cash close failed'; end if;

  result_value:=public.rpc_finance_command('expense',null,'create',jsonb_build_object('category','测试费用','net_amount',20,'tax_amount',4.40,'expense_date',current_date,'description','Phase 5 rollback test'),'phase5-test-expense-create',gen_random_uuid());
  expense_id:=(result_value->>'expense_id')::uuid;
  perform public.rpc_finance_command('expense',expense_id,'submit','{}','phase5-test-expense-submit',gen_random_uuid());
  perform public.rpc_finance_command('expense',expense_id,'approve','{}','phase5-test-expense-approve',gen_random_uuid());
  perform public.rpc_finance_command('expense',expense_id,'pay','{}','phase5-test-expense-pay',gen_random_uuid());
  perform public.rpc_finance_command('purchase_payment',purchase_id,'record',jsonb_build_object('amount',29.28,'payment_method','bank_transfer'),'phase5-test-purchase-payment',gen_random_uuid());
  select count(*) into entry_count from public.financial_entries where organization_id=organization_value;
  if entry_count<3 then raise exception 'A13 financial entries expected at least 3, got %',entry_count; end if;
  metrics:=public.rpc_business_metrics(current_date,current_date,null,null);
  if (metrics->>'sales')::numeric<>50 or (metrics->>'expenses')::numeric<>24.40 or (metrics->>'purchase_payments')::numeric<>29.28 then
    raise exception 'A13 metric calculation failed: %',metrics;
  end if;
  raise notice 'A11-A13 passed inside rollback transaction';
end;
$$;

rollback;

select 'A11-A13 passed inside rollback transaction' as result;

-- Run against a linked development project. Every fixture is rolled back.
begin;
select set_config('request.jwt.claim.sub','07279ec0-cc56-478f-8e12-d94b87fe9683',true);
do $test$
declare
  org uuid:='a2f4d0b3-c0c3-4906-b779-f2531ca556b9'; actor uuid:='07279ec0-cc56-478f-8e12-d94b87fe9683';
  wh uuid:='1ffa366a-b83e-473d-8288-6b7db90fe889'; color uuid:='890a2300-9988-4182-8bcc-49f2d1b19b0a'; size_id uuid:='752a66c9-2e1b-4820-8dba-b72e733b7903';
  product_id uuid:=gen_random_uuid(); variant_id uuid:=gen_random_uuid(); inventory_id uuid:=gen_random_uuid(); model text;
  cancel_order uuid:=gen_random_uuid(); cancel_item uuid:=gen_random_uuid(); delivery_order uuid:=gen_random_uuid(); delivery_item uuid:=gen_random_uuid();
  pickup_order uuid:=gen_random_uuid(); pickup_item uuid:=gen_random_uuid(); return_id uuid:=gen_random_uuid(); return_item_id uuid:=gen_random_uuid();
  result jsonb; pickup_code text; refund_id uuid; on_hand integer; reserved integer; affected integer;
begin
  model:='P4-'||upper(substr(product_id::text,1,8));
  insert into public.products(id,organization_id,style_no,model_number,name,name_zh,workflow_status,created_by)
  values(product_id,org,model,model,'Phase 4 rollback test','第四阶段回滚测试','draft',actor);
  insert into public.product_variants(id,organization_id,product_id,color_id,size_id,sku,is_active)
  values(variant_id,org,product_id,color,size_id,model||'-CHR-XS',true);
  insert into public.inventory(id,organization_id,variant_id,warehouse_id,quantity_on_hand,quantity_reserved,online_quantity_limit)
  values(inventory_id,org,variant_id,wh,10,0,10);

  -- A08: a conditional lock/update permits only one claimant of the last stock.
  update public.inventory set quantity_reserved=quantity_reserved+10 where id=inventory_id and quantity_on_hand-quantity_reserved-safety_stock>=10;
  get diagnostics affected=row_count; if affected<>1 then raise exception 'A08 first reservation failed'; end if;
  update public.inventory set quantity_reserved=quantity_reserved+1 where id=inventory_id and quantity_on_hand-quantity_reserved-safety_stock>=1;
  get diagnostics affected=row_count; if affected<>0 then raise exception 'A08 oversell guard failed'; end if;
  update public.inventory set quantity_reserved=0 where id=inventory_id;

  -- A09 cancellation releases reserved and never reduces on_hand.
  insert into public.orders(id,organization_id,order_no,subtotal,total_amount,payment_status,fulfillment_type,idempotency_key,lifecycle_status,fulfillment_status)
  values(cancel_order,org,'P4-C-'||substr(cancel_order::text,1,8),20,20,'pending','DELIVERY','fixture-c-'||cancel_order,'pending','reserved');
  insert into public.order_items(id,order_id,product_id,variant_id,warehouse_id,product_title,sku,color_name,size_name,unit_price,quantity,line_total)
  values(cancel_item,cancel_order,product_id,variant_id,wh,'Test',model||'-CHR-XS','炭灰','XS',10,2,20);
  update public.inventory set quantity_reserved=2 where id=inventory_id;
  insert into public.stock_reservations(organization_id,order_id,order_item_id,inventory_id,variant_id,warehouse_id,quantity,idempotency_key,expires_at,created_by)
  values(org,cancel_order,cancel_item,inventory_id,variant_id,wh,2,'res-c-'||cancel_order,now()+interval '30 minutes',actor);
  result:=public.rpc_release_order_stock(cancel_order,'rollback cancellation','release-'||replace(cancel_order::text,'-',''),gen_random_uuid());
  select quantity_on_hand,quantity_reserved into on_hand,reserved from public.inventory where id=inventory_id;
  if on_hand<>10 or reserved<>0 then raise exception 'A09 cancellation balance failed'; end if;
  result:=public.rpc_release_order_stock(cancel_order,'duplicate','release-'||replace(cancel_order::text,'-',''),gen_random_uuid());
  if coalesce((result->>'idempotent')::boolean,false) is not true then raise exception 'A09 cancellation idempotency failed'; end if;

  -- A10 delivery path and A09 sale consumption.
  insert into public.orders(id,organization_id,order_no,subtotal,total_amount,payment_status,fulfillment_type,idempotency_key,lifecycle_status,fulfillment_status,status,confirmed_at)
  values(delivery_order,org,'P4-D-'||substr(delivery_order::text,1,8),30,30,'paid','DELIVERY','fixture-d-'||delivery_order,'confirmed','reserved','PAID',now());
  insert into public.order_items(id,order_id,product_id,variant_id,warehouse_id,product_title,sku,color_name,size_name,unit_price,quantity,line_total)
  values(delivery_item,delivery_order,product_id,variant_id,wh,'Test',model||'-CHR-XS','炭灰','XS',10,3,30);
  update public.inventory set quantity_reserved=3 where id=inventory_id;
  insert into public.stock_reservations(organization_id,order_id,order_item_id,inventory_id,variant_id,warehouse_id,quantity,idempotency_key,expires_at,created_by)
  values(org,delivery_order,delivery_item,inventory_id,variant_id,wh,3,'res-d-'||delivery_order,now()+interval '30 minutes',actor);
  insert into public.payments(order_id,organization_id,provider,provider_reference,amount,status,paid_at,currency,payment_method,idempotency_key,verified_by)
  values(delivery_order,org,'manual','P4-PAY-'||delivery_order,30,'paid',now(),'EUR','manual_verified','payment-'||delivery_order,actor);
  result:=public.rpc_order_command(delivery_order,'start_picking','{}','pick-'||replace(delivery_order::text,'-',''),gen_random_uuid());
  perform public.rpc_order_command(delivery_order,'confirm_pick_item',jsonb_build_object('order_item_id',delivery_item,'quantity',3),'pick-line-'||replace(delivery_order::text,'-',''),gen_random_uuid());
  perform public.rpc_order_command(delivery_order,'pack','{}','pack-'||replace(delivery_order::text,'-',''),gen_random_uuid());
  result:=public.rpc_order_command(delivery_order,'ship',jsonb_build_object('carrier','TEST','tracking_no','ROLLBACK'),'ship-'||replace(delivery_order::text,'-',''),gen_random_uuid());
  select quantity_on_hand,quantity_reserved into on_hand,reserved from public.inventory where id=inventory_id;
  if on_hand<>7 or reserved<>0 then raise exception 'A09 shipment consumption failed'; end if;
  result:=public.rpc_order_command(delivery_order,'ship',jsonb_build_object('carrier','TEST','tracking_no','ROLLBACK'),'ship-'||replace(delivery_order::text,'-',''),gen_random_uuid());
  if coalesce((result->>'idempotent')::boolean,false) is not true then raise exception 'A09 shipment idempotency failed'; end if;
  perform public.rpc_order_command(delivery_order,'confirm_delivery','{}','deliver-'||replace(delivery_order::text,'-',''),gen_random_uuid());
  if not exists(select 1 from public.orders where id=delivery_order and lifecycle_status='completed' and fulfillment_status='delivered') then raise exception 'A10 delivery completion failed'; end if;

  -- A09 return: only restockable disposition increases available stock.
  insert into public.returns(id,organization_id,return_no,order_id,status,reason,created_by)
  values(return_id,org,'P4-R-'||substr(return_id::text,1,8),delivery_order,'requested','Rollback test',actor);
  insert into public.return_items(id,organization_id,return_id,order_item_id,variant_id,warehouse_id,quantity,reason)
  values(return_item_id,org,return_id,delivery_item,variant_id,wh,1,'Rollback test');
  perform public.rpc_return_command(return_id,'approve','{}','ret-approve-'||replace(return_id::text,'-',''),gen_random_uuid());
  perform public.rpc_return_command(return_id,'receive','{}','ret-receive-'||replace(return_id::text,'-',''),gen_random_uuid());
  perform public.rpc_post_return(return_id,jsonb_build_array(jsonb_build_object('return_item_id',return_item_id,'disposition','restockable','condition','good')),'ret-post-'||replace(return_id::text,'-',''),gen_random_uuid());
  select quantity_on_hand into on_hand from public.inventory where id=inventory_id; if on_hand<>8 then raise exception 'A09 return restock failed'; end if;
  result:=public.rpc_return_command(return_id,'request_refund','{}','refund-request-'||replace(return_id::text,'-',''),gen_random_uuid()); refund_id:=(result->>'refund_id')::uuid;
  perform public.rpc_return_command(return_id,'complete_refund',jsonb_build_object('refund_id',refund_id,'provider_reference','P4-REF-'||return_id),'refund-complete-'||replace(return_id::text,'-',''),gen_random_uuid());
  if not exists(select 1 from public.returns where id=return_id and status='completed') then raise exception 'A09 refund completion failed'; end if;

  -- A10 pickup consumes on verified collection, not when marked ready.
  insert into public.orders(id,organization_id,order_no,subtotal,total_amount,payment_status,fulfillment_type,idempotency_key,lifecycle_status,fulfillment_status,status,confirmed_at)
  values(pickup_order,org,'P4-P-'||substr(pickup_order::text,1,8),10,10,'paid','PICKUP','fixture-p-'||pickup_order,'confirmed','reserved','PAID',now());
  insert into public.order_items(id,order_id,product_id,variant_id,warehouse_id,product_title,sku,color_name,size_name,unit_price,quantity,line_total)
  values(pickup_item,pickup_order,product_id,variant_id,wh,'Test',model||'-CHR-XS','炭灰','XS',10,1,10);
  update public.inventory set quantity_reserved=1 where id=inventory_id;
  insert into public.stock_reservations(organization_id,order_id,order_item_id,inventory_id,variant_id,warehouse_id,quantity,idempotency_key,expires_at,created_by)
  values(org,pickup_order,pickup_item,inventory_id,variant_id,wh,1,'res-p-'||pickup_order,now()+interval '30 minutes',actor);
  result:=public.rpc_order_command(pickup_order,'start_picking','{}','pu-pick-'||replace(pickup_order::text,'-',''),gen_random_uuid());
  perform public.rpc_order_command(pickup_order,'confirm_pick_item',jsonb_build_object('order_item_id',pickup_item,'quantity',1),'pu-line-'||replace(pickup_order::text,'-',''),gen_random_uuid());
  perform public.rpc_order_command(pickup_order,'pack','{}','pu-pack-'||replace(pickup_order::text,'-',''),gen_random_uuid());
  result:=public.rpc_order_command(pickup_order,'ready_pickup','{}','pu-ready-'||replace(pickup_order::text,'-',''),gen_random_uuid()); pickup_code:=result->>'pickup_code';
  select quantity_on_hand into on_hand from public.inventory where id=inventory_id; if on_hand<>8 then raise exception 'A10 pickup consumed before collection'; end if;
  perform public.rpc_order_command(pickup_order,'confirm_pickup',jsonb_build_object('pickup_code',pickup_code),'pu-complete-'||replace(pickup_order::text,'-',''),gen_random_uuid());
  select quantity_on_hand,quantity_reserved into on_hand,reserved from public.inventory where id=inventory_id;
  if on_hand<>7 or reserved<>0 then raise exception 'A10 pickup consumption failed'; end if;
  if not exists(select 1 from public.orders where id=pickup_order and lifecycle_status='completed' and fulfillment_status='picked_up') then raise exception 'A10 pickup completion failed'; end if;
end
$test$;
select 'A08-A10 passed inside rollback transaction' as result;
rollback;

alter table public.stock_receipt_items add column source_metadata jsonb not null default '{}'::jsonb;

create or replace function private.confirm_stock_receipt(p_receipt_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  r public.stock_receipts%rowtype; item public.stock_receipt_items%rowtype;
  p_id uuid; c_id uuid; s_id uuid; v_id uuid; b_id uuid;
  inv public.inventory%rowtype; before_qty integer; barcode_value text;
  new_products integer:=0; new_variants integer:=0; total_qty integer:=0; matched public.match_type;
begin
  if (select auth.uid()) is null or not private.has_role(array['OWNER','WAREHOUSE_STAFF']) then raise exception '没有确认入库权限'; end if;
  select * into r from public.stock_receipts where id=p_receipt_id for update;
  if not found then raise exception '入库单不存在'; end if;
  if r.status='COMPLETED' then raise exception '该入库单已经确认，不能重复入库'; end if;
  if r.status<>'READY_TO_CONFIRM' then raise exception '入库单尚未完成实收核对'; end if;
  if exists(select 1 from public.stock_receipt_items where receipt_id=r.id and (received_quantity is null or received_quantity<0 or status='ERROR')) then raise exception '仍有未核对或错误记录'; end if;
  for item in select * from public.stock_receipt_items where receipt_id=r.id and received_quantity>0 order by id loop
    b_id:=null;
    if nullif(item.source_metadata->>'brand','') is not null then
      insert into public.brands(name) values(item.source_metadata->>'brand')
      on conflict(name) do update set name=excluded.name returning id into b_id;
    end if;
    select id into p_id from public.products where style_no=item.normalized_style_no and deleted_at is null;
    if p_id is null then
      insert into public.products(style_no,name,brand_id,supplier_id,material,status,created_by)
      values(item.normalized_style_no,nullif(item.source_metadata->>'productName',''),b_id,r.supplier_id,nullif(item.source_metadata->>'material',''),'PENDING_DETAILS',(select auth.uid()))
      returning id into p_id;
      new_products:=new_products+1; matched:='NEW_PRODUCT';
    else
      update public.products set
        name=coalesce(name,nullif(item.source_metadata->>'productName','')),
        brand_id=coalesce(brand_id,b_id),
        material=coalesce(material,nullif(item.source_metadata->>'material',''))
      where id=p_id;
      matched:='RESTOCK_EXISTING_SKU';
    end if;
    insert into public.colors(name,normalized_name) values(item.normalized_color,item.normalized_color)
      on conflict(normalized_name) do update set name=excluded.name returning id into c_id;
    insert into public.sizes(name,normalized_name) values(item.normalized_size,item.normalized_size)
      on conflict(normalized_name) do update set name=excluded.name returning id into s_id;
    select id into v_id from public.product_variants where product_id=p_id and color_id=c_id and size_id=s_id;
    barcode_value:=nullif(item.source_metadata->>'barcode','');
    if barcode_value is not null and exists(select 1 from public.product_variants where barcode=barcode_value and id is distinct from v_id) then barcode_value:=null; end if;
    if v_id is null then
      insert into public.product_variants(product_id,color_id,size_id,sku,barcode)
      values(p_id,c_id,s_id,regexp_replace(item.normalized_style_no,'[^A-Za-z0-9]+','-','g')||'-'||upper(left(c_id::text,6))||'-'||item.normalized_size,barcode_value)
      returning id into v_id;
      new_variants:=new_variants+1; if matched<>'NEW_PRODUCT' then matched:='NEW_COLOR_VARIANT'; end if;
    elsif barcode_value is not null then
      update public.product_variants set barcode=coalesce(barcode,barcode_value) where id=v_id;
    end if;
    insert into public.inventory(variant_id,warehouse_id,quantity_on_hand) values(v_id,r.warehouse_id,item.received_quantity)
      on conflict(variant_id,warehouse_id) do update set quantity_on_hand=public.inventory.quantity_on_hand+excluded.quantity_on_hand returning * into inv;
    before_qty:=inv.quantity_on_hand-item.received_quantity;
    insert into public.inventory_movements(variant_id,warehouse_id,movement_type,quantity_change,quantity_before,quantity_after,reference_type,reference_id,reference_no,created_by)
      values(v_id,r.warehouse_id,'PURCHASE_IN',item.received_quantity,before_qty,inv.quantity_on_hand,'STOCK_RECEIPT',r.id,r.receipt_no,(select auth.uid()));
    update public.stock_receipt_items set product_id=p_id,variant_id=v_id,match_type=matched,status='COMPLETED' where id=item.id;
    total_qty:=total_qty+item.received_quantity;
  end loop;
  update public.stock_receipts set status='COMPLETED',received_quantity=total_qty,confirmed_by=(select auth.uid()),confirmed_at=now() where id=r.id;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
    values((select auth.uid()),'CONFIRM_STOCK_RECEIPT','stock_receipt',r.id,jsonb_build_object('receipt_no',r.receipt_no,'total_quantity',total_qty));
  return jsonb_build_object('receipt_id',r.id,'receipt_no',r.receipt_no,'total_quantity',total_qty,'new_products',new_products,'new_variants',new_variants);
end; $$;

notify pgrst,'reload schema';

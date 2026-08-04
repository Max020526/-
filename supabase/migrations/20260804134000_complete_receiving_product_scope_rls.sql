-- Compatibility views must execute as the caller so their underlying tables'
-- RLS policies remain authoritative. Inserts/updates target the base tables.
alter view public.inbound_receipts set (security_invoker = true);
alter view public.inbound_receipt_lines set (security_invoker = true);

drop policy if exists receiving_select_inbound_order_items on public.inbound_order_items;
create policy receiving_select_inbound_order_items on public.inbound_order_items for select to authenticated using (
  organization_id=(select private.current_organization_id()) and (private.has_permission('receiving.view') or private.has_permission('inventory.view'))
  and exists(select 1 from public.inbound_orders r where r.id=inbound_order_items.inbound_order_id and private.has_warehouse_access(r.warehouse_id))
  and exists(select 1 from public.products p where p.id=inbound_order_items.product_id and private.has_category_access(p.category_id))
);
drop policy if exists receiving_insert_inbound_order_items on public.inbound_order_items;
create policy receiving_insert_inbound_order_items on public.inbound_order_items for insert to authenticated with check (
  organization_id=(select private.current_organization_id()) and private.has_permission('receiving.create')
  and exists(select 1 from public.inbound_orders r where r.id=inbound_order_items.inbound_order_id and private.has_warehouse_access(r.warehouse_id))
  and exists(select 1 from public.products p where p.id=inbound_order_items.product_id and private.has_category_access(p.category_id))
);

drop policy if exists receiving_select_stock_receipt_items on public.stock_receipt_items;
create policy receiving_select_stock_receipt_items on public.stock_receipt_items for select to authenticated using (
  organization_id=(select private.current_organization_id()) and (private.has_permission('receiving.view') or private.has_permission('inventory.view'))
  and exists(select 1 from public.stock_receipts r where r.id=stock_receipt_items.receipt_id and private.has_warehouse_access(r.warehouse_id))
  and (product_id is null or exists(select 1 from public.products p where p.id=stock_receipt_items.product_id and private.has_category_access(p.category_id)))
);
drop policy if exists receiving_insert_stock_receipt_items on public.stock_receipt_items;
create policy receiving_insert_stock_receipt_items on public.stock_receipt_items for insert to authenticated with check (
  organization_id=(select private.current_organization_id()) and private.has_permission('receiving.create')
  and exists(select 1 from public.stock_receipts r where r.id=stock_receipt_items.receipt_id and private.has_warehouse_access(r.warehouse_id))
  and (product_id is null or exists(select 1 from public.products p where p.id=stock_receipt_items.product_id and private.has_category_access(p.category_id)))
);
create policy receiving_delete_stock_receipts on public.stock_receipts for delete to authenticated using (
  organization_id=(select private.current_organization_id()) and private.has_permission('receiving.delete') and private.has_warehouse_access(warehouse_id)
);
create policy receiving_delete_stock_receipt_items on public.stock_receipt_items for delete to authenticated using (
  organization_id=(select private.current_organization_id()) and private.has_permission('receiving.delete')
  and exists(select 1 from public.stock_receipts r where r.id=stock_receipt_items.receipt_id and private.has_warehouse_access(r.warehouse_id))
);
create policy receiving_delete_inbound_orders on public.inbound_orders for delete to authenticated using (
  organization_id=(select private.current_organization_id()) and private.has_permission('receiving.delete') and private.has_warehouse_access(warehouse_id)
);

drop policy if exists rbac_variants_update on public.product_variants;
create policy rbac_variants_update on public.product_variants for update to authenticated using (
  organization_id=(select private.current_organization_id()) and private.has_permission('sku.edit') and exists(select 1 from public.products p where p.id=product_variants.product_id and private.has_category_access(p.category_id))
) with check (
  organization_id=(select private.current_organization_id()) and private.has_permission('sku.edit') and exists(select 1 from public.products p where p.id=product_variants.product_id and private.has_category_access(p.category_id))
);
drop policy if exists rbac_variants_delete on public.product_variants;
create policy rbac_variants_delete on public.product_variants for delete to authenticated using (
  organization_id=(select private.current_organization_id()) and private.has_permission('sku.delete') and exists(select 1 from public.products p where p.id=product_variants.product_id and private.has_category_access(p.category_id))
);

create policy rbac_categories_insert on public.categories for insert to authenticated with check (organization_id=(select private.current_organization_id()) and private.has_permission('system.settings.edit'));
create policy rbac_categories_update on public.categories for update to authenticated using (organization_id=(select private.current_organization_id()) and private.has_permission('system.settings.edit')) with check (organization_id=(select private.current_organization_id()) and private.has_permission('system.settings.edit'));
create policy rbac_categories_delete on public.categories for delete to authenticated using (organization_id=(select private.current_organization_id()) and private.has_permission('system.settings.edit'));
create policy rbac_warehouses_insert on public.warehouses for insert to authenticated with check (organization_id=(select private.current_organization_id()) and private.has_permission('system.settings.edit'));
create policy rbac_warehouses_update on public.warehouses for update to authenticated using (organization_id=(select private.current_organization_id()) and private.has_permission('system.settings.edit')) with check (organization_id=(select private.current_organization_id()) and private.has_permission('system.settings.edit'));
create policy rbac_warehouses_delete on public.warehouses for delete to authenticated using (organization_id=(select private.current_organization_id()) and private.has_permission('system.settings.edit'));

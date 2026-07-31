-- Consolidate permissive policies so each role/action evaluates one policy.

do $$
declare
  table_name_value text;
  write_predicate text;
begin
  foreach table_name_value in array array[
    'brands','categories','suppliers','warehouses','colors','sizes','products',
    'product_variants','product_images','product_tags','product_tag_relations',
    'inventory','stock_receipts','stock_receipt_raw_lines','stock_receipt_items',
    'stock_receipt_exceptions','inventory_movements','stock_adjustments',
    'online_listings','orders','order_items','payments','shipments','returns','notifications'
  ] loop
    execute format('drop policy if exists owner_all_%1$s on public.%1$I', table_name_value);
    execute format('drop policy if exists staff_read_%1$s on public.%1$I', table_name_value);
    execute format('drop policy if exists warehouse_manage_%1$s on public.%1$I', table_name_value);
    execute format('drop policy if exists product_manager_manage_%1$s on public.%1$I', table_name_value);

    if table_name_value = 'notifications' then
      continue;
    elsif table_name_value = any(array[
      'brands','categories','colors','sizes','products','product_variants',
      'product_images','product_tags','product_tag_relations','online_listings'
    ]) then
      write_predicate := 'private.has_role(array[''OWNER'',''PRODUCT_MANAGER''])';
    elsif table_name_value = any(array[
      'stock_receipts','stock_receipt_raw_lines','stock_receipt_items',
      'stock_receipt_exceptions','inventory_movements','stock_adjustments'
    ]) then
      write_predicate := 'private.has_role(array[''OWNER'',''WAREHOUSE_STAFF''])';
    else
      write_predicate := 'private.has_role(array[''OWNER''])';
    end if;

    execute format(
      'create policy manage_insert_%1$s on public.%1$I for insert to authenticated with check ((select %2$s))',
      table_name_value, write_predicate
    );
    execute format(
      'create policy manage_update_%1$s on public.%1$I for update to authenticated using ((select %2$s)) with check ((select %2$s))',
      table_name_value, write_predicate
    );
    execute format(
      'create policy manage_delete_%1$s on public.%1$I for delete to authenticated using ((select %2$s))',
      table_name_value, write_predicate
    );

    if table_name_value <> all(array[
      'online_listings','products','product_variants','product_images','colors','sizes','categories','inventory',
      'orders','order_items'
    ]) then
      execute format(
        'create policy staff_select_%1$s on public.%1$I for select to authenticated using ((select private.has_role(array[''OWNER'',''WAREHOUSE_STAFF'',''PRODUCT_MANAGER'',''ORDER_STAFF''])))',
        table_name_value
      );
    end if;
  end loop;
end;
$$;

-- Anonymous visitors only see the public catalogue. Authenticated customers see
-- the same rows, while staff can see the full working catalogue through one policy.
drop policy if exists public_read_listings on public.online_listings;
drop policy if exists public_read_published_products on public.products;
drop policy if exists public_read_published_variants on public.product_variants;
drop policy if exists public_read_published_images on public.product_images;
drop policy if exists public_read_colors on public.colors;
drop policy if exists public_read_sizes on public.sizes;
drop policy if exists public_read_categories on public.categories;
drop policy if exists public_read_online_inventory on public.inventory;

create policy anon_read_listings on public.online_listings for select to anon
using (listing_status = 'PUBLISHED');
create policy authenticated_read_listings on public.online_listings for select to authenticated
using (listing_status = 'PUBLISHED' or (select private.has_role(array['OWNER','WAREHOUSE_STAFF','PRODUCT_MANAGER','ORDER_STAFF'])));

create policy anon_read_published_products on public.products for select to anon
using (status = 'PUBLISHED' and deleted_at is null);
create policy authenticated_read_products on public.products for select to authenticated
using ((status = 'PUBLISHED' and deleted_at is null) or (select private.has_role(array['OWNER','WAREHOUSE_STAFF','PRODUCT_MANAGER','ORDER_STAFF'])));

create policy anon_read_published_variants on public.product_variants for select to anon
using (is_active and exists(select 1 from public.products p where p.id = product_id and p.status = 'PUBLISHED' and p.deleted_at is null));
create policy authenticated_read_variants on public.product_variants for select to authenticated
using ((is_active and exists(select 1 from public.products p where p.id = product_id and p.status = 'PUBLISHED' and p.deleted_at is null)) or (select private.has_role(array['OWNER','WAREHOUSE_STAFF','PRODUCT_MANAGER','ORDER_STAFF'])));

create policy anon_read_published_images on public.product_images for select to anon
using (exists(select 1 from public.products p where p.id = product_id and p.status = 'PUBLISHED' and p.deleted_at is null));
create policy authenticated_read_images on public.product_images for select to authenticated
using (exists(select 1 from public.products p where p.id = product_id and p.status = 'PUBLISHED' and p.deleted_at is null) or (select private.has_role(array['OWNER','WAREHOUSE_STAFF','PRODUCT_MANAGER','ORDER_STAFF'])));

create policy anon_read_colors on public.colors for select to anon using (is_active);
create policy authenticated_read_colors on public.colors for select to authenticated
using (is_active or (select private.has_role(array['OWNER','WAREHOUSE_STAFF','PRODUCT_MANAGER','ORDER_STAFF'])));
create policy anon_read_sizes on public.sizes for select to anon using (is_active);
create policy authenticated_read_sizes on public.sizes for select to authenticated
using (is_active or (select private.has_role(array['OWNER','WAREHOUSE_STAFF','PRODUCT_MANAGER','ORDER_STAFF'])));
create policy anon_read_categories on public.categories for select to anon using (is_active);
create policy authenticated_read_categories on public.categories for select to authenticated
using (is_active or (select private.has_role(array['OWNER','WAREHOUSE_STAFF','PRODUCT_MANAGER','ORDER_STAFF'])));

create policy anon_read_online_inventory on public.inventory for select to anon
using (exists(select 1 from public.product_variants v join public.products p on p.id = v.product_id where v.id = variant_id and v.is_active and p.status = 'PUBLISHED' and p.deleted_at is null));
create policy authenticated_read_inventory on public.inventory for select to authenticated
using (exists(select 1 from public.product_variants v join public.products p on p.id = v.product_id where v.id = variant_id and v.is_active and p.status = 'PUBLISHED' and p.deleted_at is null) or (select private.has_role(array['OWNER','WAREHOUSE_STAFF','PRODUCT_MANAGER','ORDER_STAFF'])));

drop policy if exists orders_self_read on public.orders;
drop policy if exists order_items_self_read on public.order_items;
create policy orders_customer_or_staff_select on public.orders for select to authenticated
using (customer_id = (select auth.uid()) or (select private.has_role(array['OWNER','WAREHOUSE_STAFF','PRODUCT_MANAGER','ORDER_STAFF'])));
create policy order_items_customer_or_staff_select on public.order_items for select to authenticated
using (
  exists(select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
  or (select private.has_role(array['OWNER','WAREHOUSE_STAFF','PRODUCT_MANAGER','ORDER_STAFF']))
);

drop policy if exists notifications_self_read on public.notifications;
drop policy if exists notifications_self_update on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
using (user_id = (select auth.uid()) or (select private.has_role(array['OWNER','WAREHOUSE_STAFF','PRODUCT_MANAGER','ORDER_STAFF'])));
create policy notifications_insert on public.notifications for insert to authenticated
with check ((select private.has_role(array['OWNER'])));
create policy notifications_update on public.notifications for update to authenticated
using (user_id = (select auth.uid()) or (select private.has_role(array['OWNER'])))
with check (user_id = (select auth.uid()) or (select private.has_role(array['OWNER'])));
create policy notifications_delete on public.notifications for delete to authenticated
using ((select private.has_role(array['OWNER'])));

drop policy if exists settings_owner on public.settings;
drop policy if exists settings_staff_read on public.settings;
create policy settings_staff_select on public.settings for select to authenticated
using ((select private.has_role(array['OWNER','WAREHOUSE_STAFF','PRODUCT_MANAGER','ORDER_STAFF'])));
create policy settings_owner_insert on public.settings for insert to authenticated
with check ((select private.has_role(array['OWNER'])));
create policy settings_owner_update on public.settings for update to authenticated
using ((select private.has_role(array['OWNER'])))
with check ((select private.has_role(array['OWNER'])));
create policy settings_owner_delete on public.settings for delete to authenticated
using ((select private.has_role(array['OWNER'])));

notify pgrst, 'reload schema';

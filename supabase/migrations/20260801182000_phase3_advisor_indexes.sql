-- Phase 3 advisor follow-up: keep extensions out of public and cover every new
-- foreign key used by order/reservation cleanup paths.
alter extension pg_trgm set schema extensions;

create index if not exists stock_reservations_variant_idx
  on public.stock_reservations(variant_id);
create index if not exists stock_reservations_warehouse_idx
  on public.stock_reservations(warehouse_id);
create index if not exists stock_reservations_created_by_idx
  on public.stock_reservations(created_by) where created_by is not null;
create index if not exists order_items_product_idx
  on public.order_items(product_id) where product_id is not null;
create index if not exists order_items_image_media_idx
  on public.order_items(image_media_id) where image_media_id is not null;

drop policy if exists staff_select_brands on public.brands;

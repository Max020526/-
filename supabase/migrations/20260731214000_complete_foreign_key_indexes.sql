-- Complete covering indexes for foreign keys reported by the database advisor.
create index if not exists products_brand_id_idx on public.products(brand_id);
create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_created_by_idx on public.products(created_by);
create index if not exists products_supplier_id_idx on public.products(supplier_id);
create index if not exists returns_created_by_idx on public.returns(created_by);
create index if not exists returns_order_id_idx on public.returns(order_id);
create index if not exists role_permissions_permission_id_idx on public.role_permissions(permission_id);
create index if not exists settings_updated_by_idx on public.settings(updated_by);
create index if not exists shopping_cart_items_variant_id_idx on public.shopping_cart_items(variant_id);
create index if not exists stock_adjustments_approved_by_idx on public.stock_adjustments(approved_by);
create index if not exists stock_receipt_exceptions_resolved_by_idx on public.stock_receipt_exceptions(resolved_by);
create index if not exists stock_receipts_confirmed_by_idx on public.stock_receipts(confirmed_by);
create index if not exists user_roles_assigned_by_idx on public.user_roles(assigned_by);

-- STAGING ONLY. Never run this file against Production.
-- Deterministic IDs make the seed repeatable and easy to remove.
--
-- The application Auth trigger and system role templates are scoped to the
-- canonical NEXORA organization. Staging fixtures must use that same
-- organization or freshly-created test users cannot see the fixture data.

insert into public.warehouses (id, organization_id, code, name, address, location_type)
values (
  '00000000-0000-4000-8000-000000000102',
  (select id from public.organizations where code = 'NEXORA'),
  'TEST-WH-001', '测试主仓库', 'TEST ADDRESS - NOT A REAL WAREHOUSE', 'warehouse'
)
on conflict (code) do update set
  organization_id = excluded.organization_id,
  name = excluded.name,
  is_active = true;

insert into public.categories (id, organization_id, name, slug, name_zh, name_en, name_it, sort_order)
values (
  '00000000-0000-4000-8000-000000000103',
  (select id from public.organizations where code = 'NEXORA'),
  '测试商品', 'test-products', '测试商品', 'Test products', 'Prodotti test', 9990
)
on conflict (slug) do update set
  organization_id = excluded.organization_id,
  name_zh = excluded.name_zh,
  is_active = true;

insert into public.brands (id, organization_id, name, name_zh, name_en, name_it, slug)
values (
  '00000000-0000-4000-8000-000000000104',
  (select id from public.organizations where code = 'NEXORA'),
  'TEST BRAND', '测试品牌', 'Test Brand', 'Marchio Test', 'test-brand'
)
on conflict (name) do update set
  organization_id = excluded.organization_id,
  name_zh = excluded.name_zh,
  is_active = true;

insert into public.colors (id, organization_id, name, normalized_name, code, name_zh, name_en, name_it, hex_value)
values (
  '00000000-0000-4000-8000-000000000105',
  (select id from public.organizations where code = 'NEXORA'),
  '测试红', 'TEST_RED', 'TRED', '测试红', 'Test Red', 'Rosso Test', '#D94C5C'
)
on conflict (normalized_name) do update set
  organization_id = excluded.organization_id,
  hex_value = excluded.hex_value,
  is_active = true;

insert into public.sizes (id, organization_id, name, normalized_name, code, name_zh, name_en, name_it, sort_order)
values (
  '00000000-0000-4000-8000-000000000106',
  (select id from public.organizations where code = 'NEXORA'),
  'TEST ONE', 'TEST_ONE', 'T1', '测试均码', 'Test One Size', 'Taglia Test', 9990
)
on conflict (normalized_name) do update set
  organization_id = excluded.organization_id,
  is_active = true;

insert into public.products (
  id, organization_id, style_no, model_number, name, name_zh, name_en, name_it,
  category_id, brand_id, slug, description, description_zh, retail_price,
  currency, status, workflow_status, is_new, is_featured
)
values (
  '00000000-0000-4000-8000-000000000107',
  (select id from public.organizations where code = 'NEXORA'),
  'TEST-DRESS-001', 'TEST-DRESS-001', 'TEST Dress 001', '测试连衣裙 001',
  'Test Dress 001', 'Abito Test 001',
  '00000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000000104',
  'test-dress-001', 'STAGING TEST PRODUCT - NOT FOR SALE', '测试商品，不可真实销售。',
  19.99, 'EUR', 'PUBLISHED', 'published', true, true
)
on conflict (style_no) do update set
  organization_id = excluded.organization_id,
  workflow_status = 'published', retail_price = excluded.retail_price, deleted_at = null;

insert into public.product_variants (
  id, organization_id, product_id, color_id, size_id, sku, barcode, is_active, is_visible_online
)
values (
  '00000000-0000-4000-8000-000000000108',
  (select id from public.organizations where code = 'NEXORA'),
  '00000000-0000-4000-8000-000000000107',
  '00000000-0000-4000-8000-000000000105',
  '00000000-0000-4000-8000-000000000106',
  'TEST-DRESS-001-TRED-T1', 'TEST000000001', true, true
)
on conflict (sku) do update set
  organization_id = excluded.organization_id,
  is_active = true,
  is_visible_online = true;

insert into public.inventory (
  id, organization_id, variant_id, warehouse_id, quantity_on_hand,
  quantity_reserved, online_quantity_limit, safety_stock
)
values (
  '00000000-0000-4000-8000-000000000109',
  (select id from public.organizations where code = 'NEXORA'),
  '00000000-0000-4000-8000-000000000108',
  '00000000-0000-4000-8000-000000000102', 20, 0, 20, 1
)
on conflict (variant_id, warehouse_id) do update set
  organization_id = excluded.organization_id,
  quantity_on_hand = 20, quantity_reserved = 0, online_quantity_limit = 20, safety_stock = 1;

insert into public.channels (id, organization_id, code, name, channel_type, currency, is_active)
values (
  '00000000-0000-4000-8000-000000000110',
  (select id from public.organizations where code = 'NEXORA'),
  'TEST-RETAIL', '测试零售商城', 'retail', 'EUR', true
)
on conflict (id) do update set
  organization_id = excluded.organization_id,
  name = excluded.name,
  is_active = true;

insert into public.product_publications (
  id, organization_id, product_id, channel_id, status, slug, published_at, last_validated_at
)
values (
  '00000000-0000-4000-8000-000000000111',
  (select id from public.organizations where code = 'NEXORA'),
  '00000000-0000-4000-8000-000000000107',
  '00000000-0000-4000-8000-000000000110',
  'published', 'test-dress-001', now(), now()
)
on conflict (id) do update set
  organization_id = excluded.organization_id,
  product_id = excluded.product_id,
  channel_id = excluded.channel_id,
  status = excluded.status,
  published_at = excluded.published_at,
  last_validated_at = excluded.last_validated_at;

-- Remove the obsolete organization created by the first Staging seed revision.
-- All deterministic fixtures above have already been reassigned to NEXORA.
delete from public.organizations where code = 'TEST-NEXORA';

-- Auth users and orders are intentionally created by staging test workflows,
-- not static SQL. This avoids committing passwords and exercises real Auth/RLS/RPC paths.

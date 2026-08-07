import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const schema = await source("supabase/migrations/20260801170000_phase2_product_operations.sql");
const rpc = await source("supabase/migrations/20260801171000_phase2_product_operations_rpc.sql");
const media = await source("supabase/migrations/20260801172000_phase2_media_public_boundary.sql");
const scopeSecurity = await source("supabase/migrations/20260807131039_fix_product_operations_scope_security.sql");

test("phase 2 adds channel-aware pricing and publication records without duplicating products", () => {
  for (const table of ["channels", "price_books", "price_book_items", "product_publications"]) {
    assert.match(schema, new RegExp(`create table if not exists public\\.${table}`, "i"));
  }
  assert.match(schema, /workflow_status text/i);
  assert.match(schema, /name_zh[\s\S]*name_it[\s\S]*name_en/i);
  assert.doesNotMatch(schema, /create table if not exists public\.(retail_products|channel_products)/i);
});

test("product operations writes use controlled functions and cannot mutate inventory", () => {
  for (const name of [
    "create_product_draft", "save_product_operations", "upsert_product_variant",
    "set_product_channel_price", "validate_product_publication",
    "publish_product_channel", "unpublish_product_channel", "bulk_update_products",
  ]) assert.match(rpc, new RegExp(`private\\.${name}`, "i"));
  assert.doesNotMatch(rpc, /update public\.inventory\b/i);
  assert.doesNotMatch(rpc, /insert into public\.inventory_movements\b/i);
  assert.match(rpc, /revoke execute on function public\.save_catalog_product/i);
  assert.match(rpc, /revoke execute on function public\.publish_product/i);
});

test("product operations scope repair protects unclassified and out-of-scope products", () => {
  assert.match(scopeSecurity, /private\.has_product_operations_scope\(required_category_id uuid\)/i);
  assert.match(scopeSecurity, /private\.can_view_product_for_operations\(target_product_id uuid\)/i);
  assert.match(scopeSecurity, /private\.can_edit_product_for_operations\(target_product_id uuid\)/i);
  assert.match(scopeSecurity, /when required_category_id is null[\s\S]*private\.has_permission\('product\.edit'\)/i);
  assert.match(scopeSecurity, /private\.has_permission\('product\.view'\)[\s\S]*private\.has_product_operations_scope\(category_id\)/i);
  assert.match(scopeSecurity, /private\.has_product_operations_scope\(product_value\.category_id\)/i);
  assert.match(scopeSecurity, /not private\.has_category_access\(category_value\)/i);
  assert.match(scopeSecurity, /subcategory\.parent_id = category_value/i);
  assert.doesNotMatch(scopeSecurity, /has_category_access\(required_category_id uuid\)[\s\S]*required_category_id is null then true/i);
});

test("all Product Operations SECURITY DEFINER entry points enforce product scope", () => {
  const scopedFunctions = {
    create_product_draft: /has_permission\('product\.create'\)[\s\S]*has_category_access\(category_value\)/i,
    upsert_product_variant: /has_permission\('sku\.edit'\)[\s\S]*can_edit_product_for_operations\(p_product_id\)/i,
    set_product_channel_price: /has_permission\('product\.price\.edit'\)[\s\S]*can_view_product_for_operations\(p_product_id\)/i,
    validate_product_publication: /has_permission\('product\.publish'\)[\s\S]*can_view_product_for_operations\(p_product_id\)/i,
    publish_product_channel: /has_permission\('product\.publish'\)[\s\S]*can_view_product_for_operations\(p_product_id\)/i,
    unpublish_product_channel: /has_permission\('product\.unpublish'\)[\s\S]*can_view_product_for_operations\(p_product_id\)/i,
    bulk_update_products: /has_permission\('product\.edit'\)[\s\S]*has_product_operations_scope\(product\.category_id\)/i,
  };

  for (const [name, authorization] of Object.entries(scopedFunctions)) {
    const start = scopeSecurity.indexOf(`create or replace function private.${name}`);
    assert.notEqual(start, -1, `${name} is redefined in the security migration`);
    const next = scopeSecurity.indexOf("create or replace function private.", start + 1);
    const body = scopeSecurity.slice(start, next === -1 ? undefined : next);
    assert.match(body, /security definer/i);
    assert.match(body, /set search_path = ''/i);
    assert.match(body, /auth\.uid\(\)/i);
    assert.match(body, authorization);
  }

  assert.match(scopeSecurity, /target_category_id[\s\S]*has_category_access\(target_category_id\)/i);
  assert.match(scopeSecurity, /matched_count <> requested_count[\s\S]*raise exception/i);
  assert.match(scopeSecurity, /批量商品包含当前账号无权编辑的分类/i);
  assert.match(scopeSecurity, /private\.save_catalog_product\(uuid,jsonb,jsonb\)[\s\S]*private\.publish_product\(uuid\)[\s\S]*private\.unpublish_product\(uuid\)/i);
  assert.match(scopeSecurity, /revoke all on function %s from public, anon, authenticated, service_role/i);
  assert.doesNotMatch(scopeSecurity, /if not found then continue/i);
});

test("product media SECURITY DEFINER functions enforce product category scope", () => {
  assert.match(scopeSecurity, /private\.can_manage_product_media\(target_product_id uuid\)/i);
  for (const name of ["register_product_media", "soft_delete_product_media", "manage_product_image"]) {
    assert.match(scopeSecurity, new RegExp(`private\\.${name}[\\s\\S]*private\\.can_manage_product_media\\(p_product_id\\)`, "i"));
  }
  assert.match(scopeSecurity, /revoke all on function private\.register_product_media[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(scopeSecurity, /grant execute on function private\.register_product_media[\s\S]*to authenticated/i);
});

test("publication validation is channel-specific and field-specific", () => {
  assert.match(rpc, /private\.product_publication_errors/i);
  for (const field of ["name_zh", "category_id", "description_zh", "slug", "media", "variants", "prices", "channel_id"]) {
    assert.match(rpc, new RegExp(`'field','${field}'`));
  }
  assert.match(rpc, /organization_id\s*=\s*p_organization_id/i);
  assert.match(rpc, /existing_status = publication_status[\s\S]*idempotent/i);
});

test("product media stays private and metadata changes are audited", () => {
  assert.match(media, /private\.register_product_media/i);
  assert.match(media, /private\.soft_delete_product_media/i);
  assert.match(media, /p_file_size > 10485760/i);
  assert.match(media, /image\/jpeg.*image\/png.*image\/webp/s);
  assert.match(media, /deleted_at = now\(\)/i);
  assert.match(media, /REGISTER_PRODUCT_MEDIA/);
  assert.match(media, /SOFT_DELETE_PRODUCT_MEDIA/);
  assert.doesNotMatch(media, /storage_path[\s\S]*storefront_product_media[\s\S]*select[\s\S]*storage_path/i);
});

test("anonymous catalogue uses explicit safe projections and channel publication RLS", () => {
  for (const view of ["storefront_products", "storefront_product_variants", "storefront_product_media"]) {
    assert.match(media, new RegExp(`view public\\.${view}[\\s\\S]*security_invoker`, "i"));
  }
  assert.match(media, /revoke all on table public\.products[\s\S]*from anon/i);
  assert.match(media, /anon_read_published_publications/i);
  assert.match(media, /publication\.status = 'published'/i);
  assert.match(media, /\/api\/catalog\/media\//i);
});

test("phase 2 UI separates product operations from inventory mutation", async () => {
  const detail = await source("app/admin/products/[id]/page.tsx");
  const create = await source("app/admin/products/new/page.tsx");
  const list = await source("app/admin/products/page.tsx");
  assert.match(detail, /库存仅在库存模块调整/);
  assert.match(detail, /rpc_save_product_operations/);
  assert.match(detail, /rpc_set_product_channel_price/);
  assert.match(detail, /rpc_publish_product_channel/);
  assert.doesNotMatch(detail, /set_inventory_online_limit|\.from\("inventory"\)\.update/);
  assert.match(create, /rpc_create_product_draft/);
  assert.doesNotMatch(create, /save_catalog_product|quantity_on_hand/);
  assert.match(list, /发布受阻/);
  assert.match(list, /rpc_bulk_update_products/);
  assert.match(list, /categories!products_category_id_fkey/);
  assert.match(list, /brands!products_brand_id_fkey/);
  assert.match(list, /未分类/);
  assert.match(list, /商品队列加载失败/);
  assert.doesNotMatch(list, /\.select\("\*,categories\(name\),brands\(name\)/);
});

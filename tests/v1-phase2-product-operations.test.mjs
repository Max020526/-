import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const schema = await source("supabase/migrations/20260801170000_phase2_product_operations.sql");
const rpc = await source("supabase/migrations/20260801171000_phase2_product_operations_rpc.sql");
const media = await source("supabase/migrations/20260801172000_phase2_media_public_boundary.sql");

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
});

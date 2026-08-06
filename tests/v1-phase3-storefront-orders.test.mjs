import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../supabase/migrations/20260801180000_phase3_storefront_orders.sql", import.meta.url),
  "utf8",
);
const wrapperHardening = await readFile(
  new URL("../supabase/migrations/20260806071212_secure_storefront_order_rpc_wrappers.sql", import.meta.url),
  "utf8",
);

test("phase 3 exposes only narrow storefront RPCs", () => {
  assert.match(migration, /rpc_get_storefront_catalog/);
  assert.match(migration, /revoke all on public\.products,public\.product_variants/);
  assert.match(migration, /authenticated_staff_read_products/);
  assert.doesNotMatch(migration, /grant select \([\s\S]*cost_price/);
});

test("checkout is atomic, server-priced and idempotent", () => {
  assert.match(migration, /private\.create_storefront_order/);
  assert.match(migration, /where idempotency_key=trim\(p_idempotency_key\)/);
  assert.match(migration, /for update/);
  assert.match(migration, /price\.unit_price/);
  assert.match(migration, /insert into public\.stock_reservations/);
  assert.match(migration, /quantity_reserved=quantity_reserved\+quantity_value/);
});

test("guest lookup tokens survive idempotent retries without storing plaintext", () => {
  assert.match(migration, /lookup_token_hash/);
  assert.match(migration, /hmac\(trim\(p_idempotency_key\),trim\(p_guest_session_id\)/);
  assert.match(migration, /lookup_token.*case when actor_id is null/s);
});

test("expired reservations are released through a controlled function", () => {
  assert.match(migration, /create or replace function private\.expire_stale_orders/);
  assert.match(migration, /status='expired'/);
  assert.match(migration, /quantity_reserved=quantity_reserved-reservation_row\.quantity/);
  assert.match(migration, /quantity_reserved>=reservation_row\.quantity/);
});

test("public storefront wrappers can reach private implementations without opening the private schema", () => {
  for (const name of ["rpc_create_storefront_order", "rpc_get_storefront_order", "rpc_merge_customer_cart"]) {
    assert.match(wrapperHardening, new RegExp(`function public\\.${name}[\\s\\S]*?security definer`, "i"));
  }
  assert.match(wrapperHardening, /revoke all on function public\.rpc_create_storefront_order[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(wrapperHardening, /grant execute on function public\.rpc_create_storefront_order[\s\S]*to anon, authenticated, service_role/i);
  assert.match(wrapperHardening, /grant execute on function public\.rpc_merge_customer_cart[\s\S]*to authenticated, service_role/i);
  assert.doesNotMatch(wrapperHardening, /grant usage on schema private/i);
});

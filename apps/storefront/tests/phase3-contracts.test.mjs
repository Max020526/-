import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("storefront reads only the narrow phase 3 catalogue RPC", async () => {
  const source = await read("lib/storefront-data.ts");
  assert.match(source, /rpc_get_storefront_catalog/);
  assert.doesNotMatch(source, /from\("products"\)|from\("inventory"\)|online_listings/);
});

test("checkout is server mediated and never accepts client totals", async () => {
  const [page, route] = await Promise.all([read("app/checkout/page.tsx"), read("app/api/checkout/route.ts")]);
  assert.match(page, /fetch\("\/api\/checkout"/);
  assert.match(route, /rpc_create_storefront_order/);
  assert.match(route, /checkoutSchema\.safeParse/);
  assert.doesNotMatch(route, /subtotal|totalAmount|shippingFee/);
  assert.match(route, /p_idempotency_key/);
  assert.match(route, /p_guest_session_id/);
});

test("storefront includes guest order lookup, account orders and addresses", async () => {
  const [lookup, orders, addresses] = await Promise.all([
    read("app/order-lookup/page.tsx"),
    read("app/account/orders/page.tsx"),
    read("app/account/addresses/page.tsx"),
  ]);
  assert.match(lookup, /访客订单/);
  assert.match(orders, /我的订单/);
  assert.match(addresses, /地址簿/);
});

test("customer-facing source is valid UTF-8 Chinese without mojibake markers", async () => {
  for (const path of ["app/layout.tsx", "app/checkout/page.tsx", "components/home-storefront.tsx", "components/store-shell.tsx"]) {
    const source = await read(path);
    assert.doesNotMatch(source, /å¥³|ç™»|è´­|æ‰€/u, path);
  }
});

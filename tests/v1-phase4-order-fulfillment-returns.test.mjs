import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const model = readFileSync("supabase/migrations/20260801190000_phase4_order_fulfillment_returns.sql", "utf8");
const rpc = readFileSync("supabase/migrations/20260801191000_phase4_order_fulfillment_rpcs.sql", "utf8");
const projection = readFileSync("supabase/migrations/20260801192000_phase4_storefront_order_projection.sql", "utf8");
const orderPage = readFileSync("components/orders/order-detail.tsx", "utf8");
const returnsPage = readFileSync("components/returns/returns-center.tsx", "utf8");

test("Phase 4 separates order, payment and fulfillment states", () => {
  assert.match(model, /lifecycle_status/);
  assert.match(model, /payment_status/);
  assert.match(model, /fulfillment_status/);
  assert.match(model, /business_command_results/);
});

test("stock release, consumption and return posting are controlled and idempotent", () => {
  for (const contract of ["rpc_release_order_stock", "rpc_consume_order_stock", "rpc_post_return"]) assert.match(rpc, new RegExp(contract));
  assert.match(rpc, /quantity_on_hand=quantity_on_hand-reservation_row\.quantity/);
  assert.match(rpc, /quantity_reserved=quantity_reserved-reservation_row\.quantity/);
  assert.match(rpc, /disposition_value='restockable'/);
  assert.match(rpc, /private\.business_command_results/);
});

test("direct browser writes are revoked and customer projection excludes internal data", () => {
  assert.match(model, /revoke insert,update,delete,truncate on public\.orders/);
  assert.match(model, /organization_isolation/);
  assert.match(projection, /public_message_zh is not null/);
  assert.doesNotMatch(projection, /internal_data.*jsonb_build_object/);
});

test("internal UI exposes fulfillment and return workflows", () => {
  for (const command of ["start_picking", "confirm_pick_item", "pack", "ship", "ready_pickup", "confirm_pickup"]) assert.match(orderPage, new RegExp(command));
  for (const command of ["approve", "receive", "request_refund", "complete_refund"]) assert.match(returnsPage, new RegExp(command));
});

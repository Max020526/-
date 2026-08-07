import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const summary = readFileSync("components/order-summary-card.tsx", "utf8");
const actions = readFileSync("components/customer-order-actions.tsx", "utf8");
const account = readFileSync("app/account/orders/page.tsx", "utf8");

test("customer order page displays independent state machines", () => {
  for (const field of ["lifecycle_status", "payment_status", "fulfillment_status"]) {
    assert.match(summary + account, new RegExp(field));
  }
});

test("customer mutations use narrow RPCs only", () => {
  assert.match(actions, /rpc_release_order_stock/);
  assert.match(actions, /rpc_request_return/);
  assert.doesNotMatch(actions, /\.from\(["'](?:orders|inventory|returns)["']\)\.(?:insert|update|delete)/);
});

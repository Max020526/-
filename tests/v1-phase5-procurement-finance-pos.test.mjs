import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const foundation = read("supabase/migrations/20260801200000_phase5_procurement_finance_pos.sql");
const business = read("supabase/migrations/20260801201000_phase5_business_rpcs.sql");
const pos = read("supabase/migrations/20260801202000_phase5_pos_metrics.sql");

test("A11 procurement supports controlled partial receipts and weighted cost", () => {
  assert.match(foundation, /partially_received/);
  assert.match(foundation, /check\(received_quantity<=ordered_quantity\)/);
  assert.match(business, /for update/);
  assert.match(business, /average_unit_cost=new_average/);
  assert.match(business, /rpc_receive_purchase_order/);
  assert.doesNotMatch(foundation, /grant (insert|update|delete).*purchase_orders.*authenticated/i);
});
test("A12 POS reuses canonical orders, payments and inventory", () => {
  assert.match(pos, /insert into public\.orders/);
  assert.match(pos, /insert into public\.order_items/);
  assert.match(pos, /insert into public\.payments/);
  assert.match(pos, /update public\.inventory set quantity_on_hand=quantity_on_hand-quantity_value/);
  assert.match(pos, /'POS_SALE'/);
  assert.match(pos, /cash_difference/);
  assert.match(pos, /rpc_complete_pos_sale/);
});

test("A13 finance is append-only, source-linked and uses one metric function", () => {
  assert.match(foundation, /create table if not exists public\.financial_entries/);
  assert.match(foundation, /reversal_of uuid references public\.financial_entries/);
  assert.match(foundation, /financial_entries_immutable/);
  assert.match(business, /sync_payment_financial_entry/);
  assert.match(business, /sync_refund_financial_entry/);
  assert.match(pos, /rpc_business_metrics/);
  assert.match(pos, /Europe\/Rome/);
});

test("Phase 5 workspaces are real operational pages", () => {
  for (const file of ["components/purchasing/purchasing-center.tsx", "components/finance/finance-center.tsx", "components/business/owner-dashboard.tsx", "components/pos/pos-register.tsx"]) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} should exist`);
  }
  assert.match(read("app/admin/purchasing/page.tsx"), /PurchasingCenter/);
  assert.match(read("app/admin/finance/page.tsx"), /FinanceCenter/);
  assert.match(read("app/warehouse/pos/page.tsx"), /PosRegister/);
});

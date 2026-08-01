import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const baseline = await readFile(new URL(
  "../supabase/migrations/20260801160000_v1_phase1_baseline_alignment.sql",
  import.meta.url,
), "utf8");
const posting = await readFile(new URL(
  "../supabase/migrations/20260801161000_post_size_aware_inbound_receipt.sql",
  import.meta.url,
), "utf8");

test("phase 1 introduces tenant isolation and all formal V1 roles", () => {
  assert.match(baseline, /create table if not exists public\.organizations/i);
  for (const role of [
    "owner", "system_admin", "warehouse_manager", "warehouse_staff",
    "product_operator", "order_cs", "buyer", "finance", "cashier",
  ]) assert.match(baseline, new RegExp(`'${role}'`));
  assert.match(baseline, /create or replace function private\.has_permission/i);
  assert.match(baseline, /create policy organization_isolation_/i);
  assert.match(baseline, /as restrictive for all to authenticated/i);
});

test("formal receipt state machine has no parallel submitted or approved states", () => {
  assert.match(baseline, /'draft','counting','ready_to_post','posted','cancelled'/);
  assert.match(baseline, /private\.transition_inbound_receipt/);
  assert.doesNotMatch(baseline, /workflow_status in \([^)]*submitted/i);
  assert.doesNotMatch(baseline, /workflow_status in \([^)]*approved/i);
});

test("canonical contracts do not duplicate inventory or product media data", () => {
  assert.match(baseline, /create or replace view public\.inventory_balances\s+with \(security_invoker = true\)/i);
  assert.match(baseline, /create or replace view public\.product_media\s+with \(security_invoker = true\)/i);
  assert.match(baseline, /create or replace view public\.inbound_receipts\s+with \(security_invoker = true\)/i);
  assert.match(baseline, /from public\.inbound_orders receipt[\s\S]*union all[\s\S]*from public\.stock_receipts receipt/i);
  assert.match(baseline, /revoke insert, update, delete, truncate on table public\.inventory/i);
  assert.match(baseline, /revoke insert, update, delete, truncate on table public\.audit_logs/i);
});

test("size-aware posting is atomic, idempotent and traceable", () => {
  assert.match(posting, /create or replace function private\.post_fast_inbound_receipt/i);
  assert.match(posting, /private\.has_permission\('inbound\.post'\)/i);
  assert.match(posting, /idempotency_key = trim\(p_idempotency_key\)/i);
  assert.match(posting, /for update/i);
  assert.match(posting, /size_id/i);
  assert.match(posting, /insert into public\.inventory_movements/i);
  assert.match(posting, /insert into public\.audit_logs/i);
  assert.match(posting, /grant execute on function public\.rpc_post_inbound_receipt/i);
});

test("product media is private, scoped and type-limited", () => {
  assert.match(baseline, /update storage\.buckets\s+set public = false/i);
  assert.match(baseline, /file_size_limit = 10485760/i);
  assert.match(baseline, /image\/jpeg.*image\/png.*image\/webp/s);
  assert.match(baseline, /storage\.foldername\(name\)\)\[1\] = private\.current_organization_id\(\)::text/i);
  assert.match(baseline, /private\.has_permission\('media\.manage'\)/i);
});

test("Supabase Data API grants are explicit for the 2026 defaults", () => {
  assert.match(baseline, /grant select on table public\.profiles/i);
  assert.match(baseline, /grant execute on function public\.get_my_authorization\(\) to authenticated/i);
  assert.match(baseline, /revoke all on function public\.rpc_transition_inbound_receipt/i);
});

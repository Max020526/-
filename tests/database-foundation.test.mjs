import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../supabase/migrations/20260801094858_fast_inbound_foundation.sql",
  import.meta.url,
);
const seedPath = new URL("../supabase/seed.sql", import.meta.url);
const customColorMigrationPath = new URL(
  "../supabase/migrations/20260801110403_add_inbound_custom_colors.sql",
  import.meta.url,
);
const encodingRepairMigrationPath = new URL(
  "../supabase/migrations/20260801114454_repair_reference_text_encoding.sql",
  import.meta.url,
);

test("fast inbound migration keeps inventory writes behind controlled functions", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /revoke insert, update, delete on public\.inventory/i);
  assert.match(
    migration,
    /revoke insert, update, delete on public\.inventory_movements/i,
  );
  assert.match(migration, /alter table public\.inbound_orders enable row level security/i);
  assert.match(
    migration,
    /alter table public\.inbound_order_items enable row level security/i,
  );
  assert.match(migration, /create or replace function private\.next_inbound_number/i);
  assert.match(migration, /on conflict \(inbound_date\) do update/i);
});

test("reference data includes all required SKU color codes and ONE_SIZE", async () => {
  const seed = await readFile(seedPath, "utf8");
  const requiredCodes = [
    "BLK",
    "WHT",
    "IVY",
    "CRM",
    "BRN",
    "DBR",
    "LBR",
    "RED",
    "WIN",
    "PNK",
    "BLU",
    "NVY",
    "LBL",
    "GRN",
    "DGR",
    "GRY",
    "DGY",
    "LGY",
    "KHK",
    "BGE",
    "YLW",
    "ORG",
    "PUR",
    "GLD",
    "SLV",
    "MUL",
  ];

  for (const code of requiredCodes) {
    assert.match(seed, new RegExp(`'${code}'`));
  }
  assert.match(seed, /'ONE_SIZE'/);
  assert.match(seed, /'牛油果绿'/);
  assert.match(seed, /'牛仔蓝'/);
  assert.match(seed, /'摩卡色'/);
});

test("warehouse custom colors are created only through a controlled RPC", async () => {
  const migration = await readFile(customColorMigrationPath, "utf8");
  assert.match(migration, /create or replace function private\.create_inbound_color/i);
  assert.match(migration, /private\.has_app_role\(array\['employee', 'admin'\]\)/i);
  assert.match(migration, /CREATE_INBOUND_COLOR/);
  assert.match(migration, /revoke all on function public\.create_inbound_color\(text,text,text\) from public, anon/i);
  assert.match(migration, /grant execute on function public\.create_inbound_color\(text,text,text\) to authenticated/i);
  assert.doesNotMatch(migration, /grant insert[^;]*public\.colors[^;]*authenticated/i);
});

test("reference text encoding repair uses stable color codes and category slugs", async () => {
  const migration = await readFile(encodingRepairMigrationPath, "utf8");
  assert.match(migration, /where upper\(color\.code\) = canonical\.code/i);
  assert.match(migration, /where category\.slug = canonical\.slug/i);
  assert.match(migration, /'BLK', '黑色'/);
  assert.match(migration, /'dresses', '连衣裙'/);
});

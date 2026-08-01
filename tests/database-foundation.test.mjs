import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../supabase/migrations/20260801094858_fast_inbound_foundation.sql",
  import.meta.url,
);
const seedPath = new URL("../supabase/seed.sql", import.meta.url);

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
});

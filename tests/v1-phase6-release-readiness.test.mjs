import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Phase 6 protects immutable ledgers at the database boundary", async () => {
  const migration = await read("supabase/migrations/20260801209000_phase6_release_hardening.sql");
  assert.match(migration, /audit_logs_immutable/);
  assert.match(migration, /inventory_movements_immutable/);
  assert.match(migration, /revoke update, delete, truncate[\s\S]*service_role/i);
  const sqlTest = await read("supabase/tests/phase6_release_readiness.sql");
  assert.match(sqlTest, /public tables without RLS/);
  assert.match(sqlTest, /views without security_invoker/);
});

test("all Netlify application surfaces enforce environment isolation before build", async () => {
  const [netlifyConfig, packageJson, architecture] = await Promise.all([
    read("netlify.toml"),
    read("package.json"),
    read("docs/deployment/ARCHITECTURE.md"),
  ]);
  assert.match(netlifyConfig, /build:netlify/);
  assert.match(packageJson, /"build:netlify"[^\n]*verify:environment/);
  assert.match(architecture, /Admin/);
  assert.match(architecture, /Operations/);
  assert.match(architecture, /Storefront/);
  assert.match(architecture, /`apps\/storefront`/);
  const storefrontPackage = await read("apps/storefront/package.json");
  assert.match(storefrontPackage, /nexora-studio-storefront/);
  const verifier = await read("scripts/verify-deployment-environment.mjs");
  assert.match(verifier, /Preview 应用只能连接 Staging Supabase 或独立 Preview Branch/);
  assert.match(verifier, /PUBLIC_SECRET_NAME/);
});

test("release documentation separates automated evidence from production gates", async () => {
  const required = [
    "docs/final_release_readiness.md",
    "docs/DEPLOYMENT_AND_ROLLBACK_RUNBOOK.md",
    "docs/ROLE_OPERATIONS_MANUAL.md",
    "docs/GDPR_DATA_GOVERNANCE.md",
    "docs/DAY1_WEEK1_OPERATIONS.md",
  ];
  const contents = await Promise.all(required.map(read));
  assert.match(contents[0], /P0/);
  assert.match(contents[0], /A01/);
  assert.match(contents[0], /未执行生产部署/);
  assert.match(contents[1], /回滚/);
  assert.match(contents[2], /仓库/);
  assert.match(contents[3], /GDPR/);
  assert.match(contents[4], /Day 1/);
});

test("critical inbound RPC errors are converted to user-safe messages", async () => {
  const files = await Promise.all([
    read("app/inbound/new/page.tsx"),
    read("app/inbound/batch/page.tsx"),
    read("app/inbound/[id]/page.tsx"),
    read("app/warehouse/receipts/[id]/parse/page.tsx"),
    read("app/warehouse/receipts/[id]/receive/page.tsx"),
    read("app/warehouse/receipts/[id]/confirm/page.tsx"),
  ]);
  for (const source of files) assert.match(source, /friendlyError/);
});

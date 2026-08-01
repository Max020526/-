import assert from "node:assert/strict";
import test from "node:test";
import { allowedInternalRoles, defaultInternalRoute, isInternalRole, normalizeInternalRole, safeInternalNextPath } from "../lib/auth/roles.ts";

test("maps internal routes to the minimum required role", () => {
  assert.ok(allowedInternalRoles("/inbound/new")?.includes("warehouse_manager"));
  assert.ok(!allowedInternalRoles("/inbound/new")?.includes("warehouse_staff"));
  assert.ok(allowedInternalRoles("/warehouse/receipts/new")?.includes("warehouse_staff"));
  assert.deepEqual(allowedInternalRoles("/settings/users"), ["owner", "system_admin"]);
  assert.equal(allowedInternalRoles("/shop"), undefined);
});

test("login return paths never escape into storefront or another role workspace", () => {
  assert.equal(safeInternalNextPath("/admin/products?queue=ready", "system_admin"), "/admin/products?queue=ready");
  assert.equal(safeInternalNextPath("/warehouse/receipts", "warehouse_staff"), "/warehouse/receipts");
  assert.equal(safeInternalNextPath("/shop", "system_admin"), null);
  assert.equal(safeInternalNextPath("/admin", "warehouse_staff"), null);
  assert.equal(safeInternalNextPath("//nexora-studio-shop.example", "system_admin"), null);
  assert.equal(safeInternalNextPath("https://example.com", "system_admin"), null);
});

test("chooses a safe landing page for each internal role", () => {
  assert.equal(defaultInternalRoute("system_admin"), "/admin");
  assert.equal(defaultInternalRoute("warehouse_staff"), "/warehouse");
  assert.equal(defaultInternalRoute("buyer"), "/admin/purchasing");
  assert.equal(defaultInternalRoute("finance"), "/admin/business");
  assert.equal(defaultInternalRoute("auditor"), "/admin/business");
  assert.equal(defaultInternalRoute("cashier"), "/warehouse/pos");
  assert.equal(normalizeInternalRole("admin"), "system_admin");
  assert.equal(normalizeInternalRole("employee"), "warehouse_staff");
  assert.equal(isInternalRole("customer"), false);
});

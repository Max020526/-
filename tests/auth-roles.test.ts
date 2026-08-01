import assert from "node:assert/strict";
import test from "node:test";
import { allowedInternalRoles, defaultInternalRoute, isInternalRole, normalizeInternalRole } from "../lib/auth/roles.ts";

test("maps internal routes to the minimum required role", () => {
  assert.ok(allowedInternalRoles("/inbound/new")?.includes("warehouse_manager"));
  assert.ok(!allowedInternalRoles("/inbound/new")?.includes("warehouse_staff"));
  assert.ok(allowedInternalRoles("/warehouse/receipts/new")?.includes("warehouse_staff"));
  assert.deepEqual(allowedInternalRoles("/settings/users"), ["owner", "system_admin"]);
  assert.equal(allowedInternalRoles("/shop"), undefined);
});

test("chooses a safe landing page for each internal role", () => {
  assert.equal(defaultInternalRoute("system_admin"), "/admin");
  assert.equal(defaultInternalRoute("warehouse_staff"), "/warehouse");
  assert.equal(normalizeInternalRole("admin"), "system_admin");
  assert.equal(normalizeInternalRole("employee"), "warehouse_staff");
  assert.equal(isInternalRole("customer"), false);
});

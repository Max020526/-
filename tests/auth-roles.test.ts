import assert from "node:assert/strict";
import test from "node:test";
import { allowedInternalRoles, defaultInternalRoute, isInternalRole } from "../lib/auth/roles.ts";

test("maps internal routes to the minimum required role", () => {
  assert.deepEqual(allowedInternalRoles("/inbound/new"), ["employee", "admin"]);
  assert.deepEqual(allowedInternalRoles("/settings/users"), ["admin"]);
  assert.equal(allowedInternalRoles("/shop"), undefined);
});

test("chooses a safe landing page for each internal role", () => {
  assert.equal(defaultInternalRoute("admin"), "/dashboard");
  assert.equal(defaultInternalRoute("employee"), "/inbound/new");
  assert.equal(isInternalRole("customer"), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { safeNextPath } from "../lib/navigation.ts";

test("accepts only same-origin relative login destinations", () => {
  assert.equal(safeNextPath("/checkout?step=address"), "/checkout?step=address");
  assert.equal(safeNextPath("https://evil.example/steal"), "/");
  assert.equal(safeNextPath("//evil.example/steal"), "/");
  assert.equal(safeNextPath("/\\evil.example"), "/");
  assert.equal(safeNextPath(null), "/");
});

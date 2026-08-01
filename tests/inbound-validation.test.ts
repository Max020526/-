import assert from "node:assert/strict";
import test from "node:test";
import { mergeInboundRows, normalizeModelNumber } from "../lib/validation/inbound.ts";

test("normalizes model numbers and merges duplicate model-color rows", () => {
  const rows = [
    { key: "1", modelNumber: " dl 30283 ", colorId: "black", quantity: "10" },
    { key: "2", modelNumber: "DL30283", colorId: "black", quantity: "8" },
  ];
  assert.equal(normalizeModelNumber(rows[0].modelNumber), "DL30283");
  assert.deepEqual(mergeInboundRows(rows), [{ model_number: "DL30283", color_id: "black", quantity: 18 }]);
});

test("rejects invalid quantities and unsafe model numbers", () => {
  assert.throws(() => mergeInboundRows([{ key: "1", modelNumber: "?!", colorId: "black", quantity: "1" }]));
  assert.throws(() => mergeInboundRows([{ key: "1", modelNumber: "DL30283", colorId: "black", quantity: "0" }]));
});

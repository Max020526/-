import assert from "node:assert/strict";
import test from "node:test";
import { mergeInboundRows, normalizeModelNumber, parseBatchText } from "../lib/validation/inbound.ts";

test("normalizes model numbers and merges duplicate model-color rows", () => {
  const rows = [
    { key: "1", modelNumber: " dl 30283 ", colorId: "black", quantity: "10" },
    { key: "2", modelNumber: "DL30283", colorId: "black", quantity: "8" },
  ];
  assert.equal(normalizeModelNumber(rows[0].modelNumber), "DL30283");
  assert.deepEqual(mergeInboundRows(rows), [{ model_number: "DL30283", color_id: "black", quantity: 18 }]);
});

test("parses spreadsheet rows using Chinese names or SKU color codes", () => {
  const colors = [{ id: "black", code: "BLK", name: "黑色", name_zh: "黑色", name_en: "Black" }];
  const parsed = parseBatchText("DL30283\t黑色\t18\nBL30385,BLK,100", colors);
  assert.deepEqual(parsed.map(({ modelNumber, colorId, quantity }) => ({ modelNumber, colorId, quantity })), [
    { modelNumber: "DL30283", colorId: "black", quantity: "18" },
    { modelNumber: "BL30385", colorId: "black", quantity: "100" },
  ]);
});

test("rejects invalid quantities and unsafe model numbers", () => {
  assert.throws(() => mergeInboundRows([{ key: "1", modelNumber: "?!", colorId: "black", quantity: "1" }]));
  assert.throws(() => mergeInboundRows([{ key: "1", modelNumber: "DL30283", colorId: "black", quantity: "0" }]));
});

test("keeps the same color in separate SKU rows when sizes differ", () => {
  const rows = [
    { key: "1", modelNumber: "DL30283", colorId: "black", sizeId: "size-s", quantity: "8" },
    { key: "2", modelNumber: "DL30283", colorId: "black", sizeId: "size-m", quantity: "10" },
    { key: "3", modelNumber: "DL30283", colorId: "black", sizeId: "size-s", quantity: "2" },
  ];
  assert.deepEqual(mergeInboundRows(rows), [
    { model_number: "DL30283", color_id: "black", size_id: "size-s", quantity: 10 },
    { model_number: "DL30283", color_id: "black", size_id: "size-m", quantity: 10 },
  ]);
});

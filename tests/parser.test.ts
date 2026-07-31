import assert from "node:assert/strict";
import test from "node:test";
import { mergeDuplicateItems, normalizeStyleNo, parseReceiptText } from "../lib/parser/receipt-parser.ts";

test("normalizes style numbers without deleting brand prefixes", () => {
  assert.equal(normalizeStyleNo("  lissimo   y5127 "), "LISSIMO Y5127");
});

test("parses quantity-before-color receipt lines", () => {
  const rows = parseReceiptText("DL30283 18棕 18黑");
  assert.deepEqual(rows.map(x => [x.normalizedColor, x.normalizedSize, x.quantity]), [["棕色", "UNI", 18], ["黑色", "UNI", 18]]);
});

test("parses compact color and size groups", () => {
  const rows = parseReceiptText("Z2690 浅牛12S9M5L 深牛12S13M6L");
  assert.deepEqual(rows.map(x => [x.normalizedColor, x.normalizedSize, x.quantity]), [
    ["浅牛仔色", "S", 12], ["浅牛仔色", "M", 9], ["浅牛仔色", "L", 5],
    ["深牛仔色", "S", 12], ["深牛仔色", "M", 13], ["深牛仔色", "L", 6],
  ]);
});

test("flags missing quantities and requires explicit duplicate merge", () => {
  assert.equal(parseReceiptText("ZAYLA581 棕色")[0].status, "ERROR");
  const rows = parseReceiptText("DL30283 10黑\nDL30283 8黑");
  assert.ok(rows.every(x => x.duplicateKey));
  const merged = mergeDuplicateItems(rows);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].quantity, 18);
});

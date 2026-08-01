import test from "node:test";
import assert from "node:assert/strict";
import { createCsv } from "../lib/export/csv.ts";

test("CSV includes UTF-8 BOM and escapes Excel formulas", () => {
  const csv = createCsv(["款号", "说明"], [["DL30283", "含,逗号"], ["=2+2", "正常"]]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /"含,逗号"/);
  assert.match(csv, /'=2\+2/);
});

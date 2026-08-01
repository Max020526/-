import assert from "node:assert/strict";
import test from "node:test";
import { getColorDisplayName, hasMojibake } from "../lib/colors/display.ts";

test("known color codes override corrupted legacy labels", () => {
  assert.equal(getColorDisplayName({ code: "BLK", name_zh: "é»‘è‰²", name: "黑色" }), "黑色");
  assert.equal(getColorDisplayName({ code: "BGE", name_zh: "ç±³è‰²" }), "米色");
});

test("custom colors keep valid names and never surface mojibake", () => {
  assert.equal(getColorDisplayName({ code: "ABC123", name_zh: "雾霾蓝" }), "雾霾蓝");
  assert.equal(getColorDisplayName({ code: "ABC123", name_zh: "é»‘è‰²", name_en: "Black" }), "Black");
  assert.equal(hasMojibake("ç™½è‰²"), true);
  assert.equal(hasMojibake("白色"), false);
});

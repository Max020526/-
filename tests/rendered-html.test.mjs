import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the NEXORA portal", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /NEXORA/);
  assert.match(html, /入库工作台/);
  assert.match(html, /管理中心/);
  assert.match(html, /NEXORA 商店/);
  assert.doesNotMatch(html, /codex-preview|Building your site/);
});

test("server-renders all three main surfaces", async () => {
  for (const path of ["/warehouse", "/admin", "/shop"]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), /NEXORA/, path);
  }
});

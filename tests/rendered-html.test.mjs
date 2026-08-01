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
  assert.match(html, /仓库与门店作业/);
  assert.match(html, /内部经营管理/);
  assert.match(html, /零售顾客网站/);
  assert.match(html, /批发客户门户/);
  assert.match(html, /P01 入库 · P04 履约 · P08 POS/);
  assert.match(html, /https:\/\/nexora-studio-shop\.xrx020526\.chatgpt\.site/);
  assert.doesNotMatch(html, /codex-preview|Building your site/);
});

test("protects warehouse and management surfaces with login redirects", async () => {
  for (const path of ["/warehouse", "/admin"]) {
    const response = await render(path);
    assert.equal(response.status, 307, path);
    assert.match(response.headers.get("location") ?? "", /\/login\?next=/, path);
  }
});

test("redirects the legacy shop entry to the independent customer website", async () => {
  for (const path of ["/shop", "/shop/cart", "/shop/checkout", "/shop/orders", "/shop/products/demo"]) {
    const response = await render(path);
    assert.equal(response.status, 307, path);
    assert.equal(response.headers.get("location"), "https://nexora-studio-shop.xrx020526.chatgpt.site/", path);
  }
});

test("adds browser security headers", async () => {
  const response = await render("/warehouse");
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("permissions-policy") ?? "", /camera=\(self\)/);
  assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
  assert.equal(response.headers.get("x-dns-prefetch-control"), "off");
  assert.match(response.headers.get("strict-transport-security") ?? "", /includeSubDomains/);
});

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";

const port = 43000 + (process.pid % 1000);
const origin = `http://127.0.0.1:${port}`;
let server;

before(async () => {
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    cwd: new URL("..", import.meta.url),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next server exited with ${server.exitCode}`);
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for the Next production server");
});

after(() => server?.kill("SIGTERM"));

async function render(path = "/") {
  return fetch(`${origin}${path}`, { headers: { accept: "text/html" } });
}

test("renders the NEXORA STUDIO customer homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>NEXORA STUDIO/);
  assert.match(html, /Abbigliamento donna/);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /meta name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(html, /Starter Project|react-loading-skeleton/);
});

test("serves the campaign image with an explicit safe MIME type", async () => {
  const response = await fetch(`${origin}/hero-campaign.webp`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/webp");
  assert.match(response.headers.get("cache-control") ?? "", /immutable/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("adds browser security headers", async () => {
  const response = await render("/shop");
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("strict-transport-security") ?? "", /max-age=31536000/);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
});

test("renders the customer shop route", async () => {
  const response = await render("/shop");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /NEXORA <span>STUDIO<\/span>/);
  assert.match(html, /正在加载 NEXORA STUDIO/);
});

test("renders checkout, guest lookup and customer account routes", async () => {
  for (const [path, pattern] of [["/checkout", /CHECKOUT SICURO/], ["/order-lookup", /ORDER LOOKUP/], ["/account/orders", /MY ACCOUNT/], ["/account/addresses", /地址簿/]]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), pattern, path);
  }
});

test("renders the verified company information route", async () => {
  const response = await render("/company");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /VICTOR S\.R\.L\./);
  assert.match(html, /08788801218/);
  assert.match(html, /NA-984973/);
  assert.doesNotMatch(html, /MAXXQN77T65Z210S|CHNXGL75M66Z210S/);
});

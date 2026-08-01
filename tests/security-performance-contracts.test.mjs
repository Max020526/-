import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("query hook does not refetch when an inline initial value changes identity", async () => {
  const hook = await source("hooks/use-supabase-query.ts");
  assert.match(hook, /const initialRef = useRef\(initial\)/);
  assert.match(hook, /\}, \[query\]\);/);
  assert.doesNotMatch(hook, /\[query\s*,\s*initial\]/);
  assert.match(hook, /requestIdRef/);
});

test("all internal user surfaces pass through the authentication proxy", async () => {
  const proxy = await source("proxy.ts");
  for (const route of ["admin", "dashboard", "warehouse", "inbound", "products", "inventory", "catalog", "me", "settings"]) {
    assert.match(proxy, new RegExp(`/${route}/:path\\*`));
  }
});

test("admin user mutations enforce origin, size and self-role protections", async () => {
  const route = await source("app/api/admin/users/route.ts");
  assert.match(route, /isSameOrigin\(request\)/);
  assert.match(route, /MAX_BODY_BYTES/);
  assert.match(route, /password\.length < 12/);
  assert.match(route, /id === actor\.id && \(!isActive \|\| role !== "admin"\)/);
  assert.match(route, /Cache-Control.*no-store/s);
});

test("both deployment targets define baseline browser security headers", async () => {
  for (const file of ["next.config.ts", "worker/index.ts"]) {
    const contents = await source(file);
    assert.match(contents, /Content-Security-Policy/);
    assert.match(contents, /Strict-Transport-Security/);
    assert.match(contents, /Cross-Origin-Opener-Policy/);
    assert.match(contents, /X-Content-Type-Options/);
  }
});

test("quick inbound uses one model number with multiple color rows and custom colors", async () => {
  const page = await source("app/inbound/new/page.tsx");
  assert.match(page, /一个款号可一次录入多种颜色/);
  assert.match(page, /添加另一种颜色/);
  assert.match(page, /create_inbound_color/);
  assert.match(page, /没有这个颜色？新增/);
});

test("warehouse and admin mobile navigation remain separate and can switch portals", async () => {
  const shell = await source("components/shared/app-shell.tsx");
  assert.match(shell, /返回主页 · 切换端口/);
  assert.match(shell, /href: "\/inbound\/batch", label: "批量入库"/);
  assert.match(shell, /href: "\/admin\/orders", label: "订单"/);
});

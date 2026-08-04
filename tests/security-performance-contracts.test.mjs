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

test("login redirects stay inside role-authorized workspaces and auth responses are not cached", async () => {
  const login = await source("app/login/page.tsx");
  const roles = await source("lib/auth/roles.ts");
  const authProxy = await source("lib/supabase/proxy.ts");
  assert.match(login, /safeInternalNextPath/);
  assert.match(login, /location\.replace\(destination\)/);
  assert.doesNotMatch(login, /setTimeout\(\(\) => location\.assign/);
  assert.match(roles, /allowedInternalRoles\(url\.pathname\)/);
  assert.match(authProxy, /headersToSet/);
  assert.match(authProxy, /private, no-cache, no-store/);
});

test("admin user mutations enforce origin, size and self-role protections", async () => {
  const route = await source("app/api/admin/users/route.ts");
  const invitationRoute = await source("app/api/admin/invitations/route.ts");
  const registrationRoute = await source("app/api/employee/register/route.ts");
  assert.match(route, /sameOrigin\(request\)/);
  assert.match(invitationRoute, /sameOrigin\(request\)/);
  assert.match(registrationRoute, /MAX_BODY_BYTES/);
  assert.match(registrationRoute, /password\.length<12/);
  assert.match(route, /id===actor\.id&&\(!isActive/);
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

test("development diagnostics do not weaken the production content security policy", async () => {
  const config = await source("next.config.ts");
  assert.match(config, /NODE_ENV === "development"/);
  assert.match(config, /unsafe-eval/);
  assert.match(config, /: "script-src 'self' 'unsafe-inline'"/);
});

test("quick inbound uses one model number with multiple color rows and custom colors", async () => {
  const page = await source("app/inbound/new/page.tsx");
  assert.match(page, /fast-primary-card/);
  assert.match(page, /fast-inbound-more/);
  assert.match(page, /hasStarted && summary\.error/);
  assert.match(page, /再加一行/);
  assert.match(page, /确认入库/);
  assert.match(page, /rpc_post_inbound_receipt/);
  assert.match(page, /create_inbound_color/);
  assert.match(page, /新增颜色/);
});

test("quick inbound uses canonical permissions and explicit warehouse scope", async () => {
  const page = await source("app/inbound/new/page.tsx");
  const permissions = await source("lib/auth/permissions.ts");
  const diagnostics = await source("components/shared/permission-diagnostics.tsx");
  const migration = await source("supabase/migrations/20260804120000_fast_inbound_canonical_permissions.sql");
  for (const key of [
    "inventory.view", "inventory.create", "inventory.adjust",
    "receiving.create", "receiving.confirm", "sku.create",
  ]) {
    assert.match(permissions, new RegExp(key.replace(".", "\\.")));
    assert.match(migration, new RegExp(key.replace(".", "\\.")));
  }
  assert.match(page, /loadAuthorization/);
  assert.match(page, /正在加载权限/);
  assert.match(page, /warehouse\.assignment/);
  assert.match(migration, /create table if not exists public\.user_warehouses/);
  assert.match(migration, /private\.is_global_warehouse_operator/);
  assert.match(migration, /private\.has_warehouse_access/);
  assert.match(migration, /receiving_insert_stock_receipts/);
  assert.match(migration, /receiving_insert_stock_receipt_items/);
  assert.match(migration, /receiving_insert_inventory_movements/);
  for (const field of ["currentUserId", "role", "permissions", "warehouseIds", "failedPermission"]) {
    assert.match(diagnostics, new RegExp(field));
  }
});

test("mobile navigation exposes every permitted desktop function through the full menu", async () => {
  const shell = await source("components/shared/app-shell.tsx");
  assert.match(shell, /href: "\/warehouse\/receipts\/new", label: "到货单"/);
  assert.match(shell, /href: "\/inbound\/new", label: "快速入库"/);
  assert.match(shell, /href: "\/admin\/orders", label: "订单"/);
  assert.match(shell, /mobile-drawer-nav/);
  assert.match(shell, /visibleGroups\.map/);
  assert.match(shell, /aria-label="全部功能"/);
  assert.match(shell, /切换工作区/);
  assert.match(shell, /activeHref/);
  assert.match(shell, /sort\(\(a,b\)=>b\.length-a\.length\)/);
  assert.match(shell, /href: "\/inbound\/new", label: "快速入库", icon: PlusCircle/);
});

test("NEXORA app colors and install metadata use the supplied brand palette", async () => {
  const css = await source("app/globals.css");
  const manifest = await source("public/manifest.webmanifest");
  const favicon = await source("public/favicon.svg");
  for (const color of ["#d94c5c", "#f29baa", "#a7b4c9", "#59728e"]) assert.match(css.toLowerCase(), new RegExp(color));
  assert.match(manifest, /"theme_color": "#1b2433"/);
  assert.match(manifest, /"purpose": "any maskable"/);
  assert.match(favicon.toLowerCase(), /#d94c5c/);
  assert.match(favicon.toLowerCase(), /#59728e/);
});

test("warehouse mobile workflow prioritizes a one-screen quick inbound form", async () => {
  const home = await source("app/warehouse/page.tsx");
  const inbound = await source("app/inbound/new/page.tsx");
  const css = await source("app/globals.css");
  assert.match(home, /warehouse-quick-entry[\s\S]*href="\/inbound\/new"/);
  assert.match(inbound, /fast-primary-card[\s\S]*fast-lines-card[\s\S]*fast-confirm-bar/);
  for (const className of ["warehouse-primary-actions", "fast-inbound-page", "product-filter-grid", "order-filters"]) {
    assert.match(css, new RegExp(`\\.${className}`));
  }
});

test("the install prompt never covers login or port selection", async () => {
  const installPrompt = await source("components/shared/pwa-install.tsx");
  assert.match(installPrompt, /isInternalWorkspace/);
  assert.match(installPrompt, /!visible \|\| !isInternalWorkspace/);
});

test("PWA updates scripts and styles from the network before using cache", async () => {
  const worker = await source("public/sw.js");
  assert.match(worker, /nexora-pwa-v7/);
  assert.match(worker, /\["style", "script"\][\s\S]*fetch\(request\)[\s\S]*catch\(\(\) => caches\.match\(request\)\)/);
});

test("frontend products have one source of truth and legacy surfaces only redirect", async () => {
  const workspaces = await source("lib/workspaces.ts");
  for (const product of ["warehouse-pos", "internal-admin", "retail-storefront"]) {
    assert.match(workspaces, new RegExp(product));
  }
  assert.doesNotMatch(workspaces, /b2b-portal|批发客户门户/);
  const receiptLedger = await source("app/warehouse/receipts/page.tsx");
  assert.match(receiptLedger, /from\("inbound_receipts"\)/);
  assert.doesNotMatch(receiptLedger, /from\("inbound_orders"\)/);
  assert.doesNotMatch(receiptLedger, /from\("stock_receipts"\)/);
  assert.match(receiptLedger, /title="入库记录"/);
  for (const route of ["app/inbound/today/page.tsx", "app/inventory/page.tsx", "app/catalog/page.tsx"]) {
    assert.match(await source(route), /redirect\(/, route);
  }
  for (const route of ["app/shop/cart/page.tsx", "app/shop/checkout/page.tsx", "app/shop/orders/page.tsx", "app/shop/products/[slug]/page.tsx"]) {
    const contents = await source(route);
    assert.match(contents, /redirect\(RETAIL_STOREFRONT_URL\)/, route);
    assert.doesNotMatch(contents, /from\("shopping_|from\("orders"|from\("online_listings"/, route);
  }
});

test("staff permission editor only exposes enabled Chinese permission labels", async () => {
  const users = await source("app/settings/users/page.tsx");
  assert.match(users, /ENABLED_PERMISSION_CODES/);
  assert.match(users, /PERMISSION_LABELS/);
  assert.match(users, /permissionGroups/);
  assert.doesNotMatch(users, /<small>\{p\.code\}<\/small>/);
});

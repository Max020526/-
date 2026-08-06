import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("women navigation contains the approved category and collection structure", async () => {
  const [catalog, shell] = await Promise.all([read("lib/catalog.ts"), read("components/store-shell.tsx")]);
  for (const slug of ["dresses-jumpsuits", "tops-tshirts", "shirts-blouses", "knitwear", "blazers", "jackets-trenches-coats", "trousers", "jeans", "skirts-shorts", "suits-coords"]) assert.match(catalog, new RegExp(slug));
  for (const collection of ["work", "everyday", "travel", "light-active", "evening"]) assert.match(catalog, new RegExp(collection));
  assert.match(shell, /hasSale &&/);
  assert.match(shell, /filter=bestseller/);
});

test("catalog supports URL-synchronised filters, sorting, retry and mobile drawer", async () => {
  const [page, catalog, css] = await Promise.all([read("app/shop/page.tsx"), read("lib/catalog.ts"), read("app/globals.css")]);
  for (const key of ["category", "size", "color", "min", "max", "stock", "material", "fit"]) assert.match(page, new RegExp(`setParam\\(\"${key}\"`));
  for (const sort of ["recommended", "latest", "price_asc", "price_desc"]) assert.match(page, new RegExp(sort));
  assert.match(catalog, /filterCatalog/);
  assert.match(page, /void load\(\)/);
  assert.match(css, /catalog-filter-drawer\.open/);
});

test("product detail exposes truthful availability and rich product metadata", async () => {
  const [page, detail] = await Promise.all([read("app/product/[slug]/page.tsx"), read("components/product-detail.tsx")]);
  assert.match(page, /alternates.*languages/s);
  assert.match(page, /openGraph/);
  assert.match(detail, /application\/ld\+json/);
  assert.match(detail, /setInterval.*15000/s);
  assert.match(detail, /origin_country/);
  assert.match(detail, /sizeGuide/);
  assert.match(detail, /available_quantity <= 3/);
  assert.match(detail, /variant_id && selectedVariantIds/);
});

test("account and checkout make payment boundaries explicit", async () => {
  const [login, reset, checkout, route] = await Promise.all([read("app/login/page.tsx"), read("app/reset-password/page.tsx"), read("app/checkout/page.tsx"), read("app/api/checkout/route.ts")]);
  assert.match(login, /resetPasswordForEmail/);
  assert.match(reset, /updateUser\(\{ password \}\)/);
  assert.match(login, /condizioni-generali-di-vendita/);
  assert.match(login, /Privacy Policy/);
  assert.match(checkout, /nessun addebito/);
  assert.match(checkout, /paga in negozio/);
  assert.match(route, /rpc_create_storefront_order/);
  assert.doesNotMatch(route, /from\(\"orders\"\)|from\(\"inventory\"\)|from\(\"payments\"\)/);
});

test("all required legal drafts are linked and visibly require legal review", async () => {
  const [legal, shell] = await Promise.all([read("lib/legal-content.ts"), read("components/store-shell.tsx")]);
  for (const slug of ["condizioni-generali-di-vendita", "privacy", "cookie", "spedizioni-e-consegne", "resi-e-recesso", "metodi-di-pagamento", "garanzia-legale", "contatti"]) {
    assert.match(legal, new RegExp(`(?:\"|\\b)${slug}(?:\"|\\b)`));
    assert.match(shell, new RegExp(`/${slug}`));
  }
  assert.match(legal, /consulente legale italiano/);
  assert.match(legal, /正式上线前需意大利法律顾问确认/);
});

test("Italian is the default locale and EUR uses Italian formatting", async () => {
  const [layout, types] = await Promise.all([read("app/layout.tsx"), read("lib/store-types.ts")]);
  assert.match(layout, /<html lang=\"it-IT\"/);
  assert.match(types, /Intl\.NumberFormat\(\"it-IT\"/);
  assert.match(types, /currency = \"EUR\"/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateDeploymentEnvironment } from "../scripts/verify-deployment-environment.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("storefront uses only narrow public RPCs", async () => {
  const app = await read("src/app.js");
  assert.match(app, /rpc_get_storefront_catalog/);
  assert.match(app, /rpc_create_storefront_order/);
  assert.match(app, /rpc_get_storefront_order/);
  assert.doesNotMatch(app, /service[_-]?role|sb_secret_/i);
  assert.doesNotMatch(app, /\/rest\/v1\/(products|inventory|orders)\b/);
});

test("preview environment cannot connect to production", () => {
  const base = {
    CONTEXT: "deploy-preview",
    NEXT_PUBLIC_SUPABASE_URL: "https://previewref.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    NEXT_PUBLIC_SITE_URL: "https://preview.example.com",
    NEXT_PUBLIC_INTERNAL_API_URL: "https://preview-system.example.com",
    PRODUCTION_SUPABASE_PROJECT_REF: "productionref",
  };
  assert.deepEqual(validateDeploymentEnvironment(base), []);
  assert.match(validateDeploymentEnvironment({ ...base, NEXT_PUBLIC_SUPABASE_URL: "https://productionref.supabase.co" }).join(" "), /预览构建禁止连接生产/);
});

test("storefront provides mobile shell and edge-to-edge icon", async () => {
  const [html, css, icon] = await Promise.all([read("src/index.html"), read("src/styles.css"), read("public/icon.svg")]);
  assert.match(html, /name="viewport"/);
  assert.match(html, /id="catalog"/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(icon, /viewBox="0 0 512 512"/);
  assert.doesNotMatch(icon, /fill="white"|fill="#fff(?:fff)?"/i);
});

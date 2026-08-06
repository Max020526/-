import test from "node:test";
import assert from "node:assert/strict";
import { supabaseProjectRef, validateDeploymentEnvironment } from "../scripts/verify-deployment-environment.mjs";
import { validateDeploymentEnvironment as validateStoreEnvironment } from "../customer-store/scripts/verify-deployment-environment.mjs";

const hosted = {
  NEXT_PUBLIC_SUPABASE_URL: "https://previewref.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  NEXT_PUBLIC_SITE_URL: "https://preview.example.com",
  NEXT_PUBLIC_INTERNAL_API_URL: "https://preview-system.example.com",
  PRODUCTION_SUPABASE_PROJECT_REF: "productionref",
};

test("extracts Supabase project references without exposing credentials", () => {
  assert.equal(supabaseProjectRef("https://project-ref.supabase.co"), "project-ref");
  assert.equal(supabaseProjectRef("http://127.0.0.1:54321"), "local");
});

test("allows isolated preview and matching production environments", () => {
  assert.deepEqual(validateDeploymentEnvironment({ ...hosted, CONTEXT: "deploy-preview" }), []);
  assert.deepEqual(validateStoreEnvironment({ ...hosted, CONTEXT: "deploy-preview" }), []);
  assert.deepEqual(validateDeploymentEnvironment({ ...hosted, CONTEXT: "production", NEXT_PUBLIC_SUPABASE_URL: "https://productionref.supabase.co" }), []);
});

test("blocks preview access to production and public secret keys", () => {
  const previewIssues = validateDeploymentEnvironment({ ...hosted, CONTEXT: "deploy-preview", NEXT_PUBLIC_SUPABASE_URL: "https://productionref.supabase.co" });
  assert.match(previewIssues.join(" "), /预览构建禁止连接生产/);
  const keyIssues = validateDeploymentEnvironment({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_never_public" });
  assert.match(keyIssues.join(" "), /不能使用 secret/);
});

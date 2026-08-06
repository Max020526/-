import test from "node:test";
import assert from "node:assert/strict";
import { supabaseProjectRef, validateDeploymentEnvironment } from "../scripts/verify-deployment-environment.mjs";

const hosted = {
  CI: "true",
  CONTEXT: "deploy-preview",
  BRANCH: "feature/environment-guard",
  NEXT_PUBLIC_APP_ENV: "preview",
  NEXT_PUBLIC_APP_SURFACE: "admin",
  NEXT_PUBLIC_APP_NAME: "NEXORA Admin Preview",
  NEXT_PUBLIC_SUPABASE_URL: "https://previewref.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  NEXT_PUBLIC_SITE_URL: "https://deploy-preview-12--nexora-admin-staging.netlify.app",
  NEXT_PUBLIC_STOREFRONT_URL: "https://deploy-preview-12--nexora-storefront-staging.netlify.app",
  PRODUCTION_SUPABASE_PROJECT_REF: "productionref",
  STAGING_SUPABASE_PROJECT_REF: "stagingref",
  PREVIEW_SUPABASE_PROJECT_REF: "previewref",
};

test("extracts Supabase project references without exposing credentials", () => {
  assert.equal(supabaseProjectRef("https://project-ref.supabase.co"), "project-ref");
  assert.equal(supabaseProjectRef("http://127.0.0.1:54321"), "local");
});

test("allows isolated preview, staging, production and local configurations", () => {
  assert.deepEqual(validateDeploymentEnvironment(hosted), []);
  assert.deepEqual(validateDeploymentEnvironment({
    ...hosted,
    CONTEXT: "production",
    BRANCH: "develop",
    NEXT_PUBLIC_APP_ENV: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://stagingref.supabase.co",
    NEXT_PUBLIC_SITE_URL: "https://admin-staging.nexora.example",
    NEXT_PUBLIC_STOREFRONT_URL: "https://shop-staging.nexora.example",
  }), []);
  assert.deepEqual(validateDeploymentEnvironment({
    ...hosted,
    CONTEXT: "production",
    BRANCH: "main",
    NEXT_PUBLIC_APP_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://productionref.supabase.co",
    NEXT_PUBLIC_SITE_URL: "https://admin.nexora.example",
    NEXT_PUBLIC_STOREFRONT_URL: "https://www.nexora.example",
  }), []);
  assert.deepEqual(validateDeploymentEnvironment({
    NEXT_PUBLIC_APP_ENV: "local",
    NEXT_PUBLIC_APP_SURFACE: "admin",
    NEXT_PUBLIC_APP_NAME: "NEXORA Admin Local",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  }), []);
});

test("blocks every cross-environment Supabase connection", () => {
  const productionToStaging = validateDeploymentEnvironment({
    ...hosted,
    CONTEXT: "production",
    BRANCH: "main",
    NEXT_PUBLIC_APP_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://stagingref.supabase.co",
    NEXT_PUBLIC_SITE_URL: "https://admin.nexora.example",
    NEXT_PUBLIC_STOREFRONT_URL: "https://www.nexora.example",
  });
  assert.match(productionToStaging.join(" "), /Production 应用未连接 Production/);

  const stagingToProduction = validateDeploymentEnvironment({
    ...hosted,
    CONTEXT: "production",
    BRANCH: "develop",
    NEXT_PUBLIC_APP_ENV: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://productionref.supabase.co",
    NEXT_PUBLIC_SITE_URL: "https://admin-staging.nexora.example",
    NEXT_PUBLIC_STOREFRONT_URL: "https://shop-staging.nexora.example",
  });
  assert.match(stagingToProduction.join(" "), /Staging 应用正在连接非 Staging/);

  const previewToProduction = validateDeploymentEnvironment({
    ...hosted,
    NEXT_PUBLIC_SUPABASE_URL: "https://productionref.supabase.co",
  });
  assert.match(previewToProduction.join(" "), /Preview 应用只能连接/);

  const unverifiedRemoteLocal = validateDeploymentEnvironment({
    NEXT_PUBLIC_APP_ENV: "local",
    NEXT_PUBLIC_APP_SURFACE: "admin",
    NEXT_PUBLIC_APP_NAME: "NEXORA Admin Local",
    NEXT_PUBLIC_SUPABASE_URL: "https://unknownref.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    ALLOW_REMOTE_STAGING_FOR_LOCAL: "true",
  });
  assert.match(unverifiedRemoteLocal.join(" "), /必须配置 Production 和 Staging 项目 ref/);
  assert.match(unverifiedRemoteLocal.join(" "), /只能使用已声明的 Staging Supabase/);
});

test("blocks public secrets, wrong branches and mixed URLs", () => {
  assert.match(validateDeploymentEnvironment({
    ...hosted,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_never_public",
  }).join(" "), /禁止发送到浏览器/);
  assert.match(validateDeploymentEnvironment({
    ...hosted,
    NEXT_PUBLIC_SERVICE_ROLE_KEY: "hidden",
  }).join(" "), /禁止使用 NEXT_PUBLIC_/);
  assert.match(validateDeploymentEnvironment({
    ...hosted,
    CONTEXT: "production",
    BRANCH: "main",
    NEXT_PUBLIC_APP_ENV: "staging",
  }).join(" "), /main 分支只能构建 production/);
  assert.match(validateDeploymentEnvironment({
    ...hosted,
    NEXT_PUBLIC_ADMIN_URL: "https://admin.nexora.example",
  }).join(" "), /NEXT_PUBLIC_ADMIN_URL 与 preview 环境不匹配/);
});

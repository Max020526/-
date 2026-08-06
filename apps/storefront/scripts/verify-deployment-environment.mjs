import { pathToFileURL } from "node:url";

export const APP_ENVIRONMENTS = new Set(["local", "preview", "staging", "production"]);
export const APP_SURFACES = new Set(["admin", "operations", "storefront", "wholesale"]);

const HOSTED_CONTEXTS = new Set(["production", "deploy-preview", "branch-deploy"]);
const NON_PRODUCTION_MARKER = /(^|[.-])(staging|stage|preview|test|dev)([.-]|$)/i;
const PUBLIC_SECRET_NAME = /(service[_-]?role|secret|database[_-]?password|netlify[_-]?auth|stripe[_-]?secret|webhook[_-]?secret)/i;
const PUBLIC_SECRET_VALUE = /(sb_secret_|service[_-]?role|postgres(?:ql)?:\/\/[^\s]+:[^\s]+@)/i;

export function supabaseProjectRef(value) {
  if (!value) return "";
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1") return "local";
    return hostname.endsWith(".supabase.co") ? hostname.slice(0, -".supabase.co".length) : "";
  } catch {
    return "";
  }
}

function validHttpUrl(value, { httpsOnly = false } = {}) {
  try {
    const url = new URL(value);
    return httpsOnly ? url.protocol === "https:" : ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function placeholder(value) {
  return !value || /(REPLACE_ME|YOUR_|example\.com)/i.test(value);
}

function hostedContext(env) {
  return HOSTED_CONTEXTS.has((env.CONTEXT || "").trim().toLowerCase());
}

function urlBelongsToEnvironment(value, appEnv) {
  if (!value || !validHttpUrl(value)) return true;
  const hostname = new URL(value).hostname;
  if (["localhost", "127.0.0.1"].includes(hostname)) return appEnv === "local";
  if (appEnv === "production") return !NON_PRODUCTION_MARKER.test(hostname);
  if (appEnv === "staging" || appEnv === "preview") return NON_PRODUCTION_MARKER.test(hostname);
  return true;
}

export function validateEnvironmentConfiguration(env = process.env) {
  const issues = [];
  const context = (env.CONTEXT || "local").trim().toLowerCase();
  const appEnv = (env.NEXT_PUBLIC_APP_ENV || "").trim().toLowerCase();
  const surface = (env.NEXT_PUBLIC_APP_SURFACE || "").trim().toLowerCase();
  const appName = (env.NEXT_PUBLIC_APP_NAME || "").trim();
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  const siteUrl = (env.NEXT_PUBLIC_SITE_URL || "").trim();
  const projectRef = supabaseProjectRef(url);
  const productionRef = (env.PRODUCTION_SUPABASE_PROJECT_REF || "").trim().toLowerCase();
  const stagingRef = (env.STAGING_SUPABASE_PROJECT_REF || "").trim().toLowerCase();
  const previewRef = (env.PREVIEW_SUPABASE_PROJECT_REF || "").trim().toLowerCase();
  const strict = env.STRICT_ENV_VALIDATION === "true" || hostedContext(env) || env.CI === "true";

  if (!APP_ENVIRONMENTS.has(appEnv)) {
    issues.push("NEXT_PUBLIC_APP_ENV 必须是 local、preview、staging 或 production。");
  }
  if (!APP_SURFACES.has(surface)) {
    issues.push("NEXT_PUBLIC_APP_SURFACE 必须是 admin、operations、storefront 或 wholesale。");
  }
  if (placeholder(appName)) issues.push("缺少有效的 NEXT_PUBLIC_APP_NAME。");

  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith("NEXT_PUBLIC_")) continue;
    if (PUBLIC_SECRET_NAME.test(name)) issues.push(`安全错误：${name} 是服务端 Secret，禁止使用 NEXT_PUBLIC_ 前缀。`);
    if (PUBLIC_SECRET_VALUE.test(String(value ?? ""))) issues.push(`安全错误：${name} 包含服务端 Secret，禁止发送到浏览器。`);
  }

  if (!projectRef || /YOUR_PROJECT_REF/i.test(url)) issues.push("缺少有效的 NEXT_PUBLIC_SUPABASE_URL。");
  if (placeholder(key)) issues.push("缺少有效的 Supabase publishable/anon key。");
  if (!siteUrl || !validHttpUrl(siteUrl, { httpsOnly: appEnv !== "local" })) {
    issues.push(appEnv === "local" ? "缺少有效的 NEXT_PUBLIC_SITE_URL。" : "托管环境必须配置 HTTPS 的 NEXT_PUBLIC_SITE_URL。");
  }

  if (["preview", "staging", "production"].includes(appEnv)) {
    if (placeholder(productionRef)) issues.push("托管构建必须配置 PRODUCTION_SUPABASE_PROJECT_REF。");
    if (placeholder(stagingRef)) issues.push("托管构建必须配置 STAGING_SUPABASE_PROJECT_REF。");
    if (productionRef && stagingRef && productionRef === stagingRef) {
      issues.push("安全错误：Production 与 Staging Supabase 项目标识不能相同。");
    }
  }

  if (appEnv === "production" && projectRef && productionRef && projectRef !== productionRef) {
    issues.push("安全错误：Production 应用未连接 Production Supabase，构建已终止。");
  }
  if (appEnv === "staging" && projectRef && stagingRef && projectRef !== stagingRef) {
    issues.push("安全错误：Staging 应用正在连接非 Staging Supabase，构建已终止。");
  }
  if (appEnv === "preview" && projectRef && ![stagingRef, previewRef].filter(Boolean).includes(projectRef)) {
    issues.push("安全错误：Preview 应用只能连接 Staging Supabase 或独立 Preview Branch，构建已终止。");
  }
  if (appEnv === "local" && projectRef && projectRef !== "local") {
    if (placeholder(productionRef) || placeholder(stagingRef)) {
      issues.push("安全错误：Local 连接远程 Supabase 前必须配置 Production 和 Staging 项目 ref。");
    }
    if (projectRef === productionRef) issues.push("安全错误：Local 开发禁止连接 Production Supabase。");
    else if (env.ALLOW_REMOTE_STAGING_FOR_LOCAL !== "true") issues.push("Local 默认只能连接本地 Supabase；如需临时连接 Staging，必须显式设置 ALLOW_REMOTE_STAGING_FOR_LOCAL=true。");
    else if (projectRef !== stagingRef) issues.push("安全错误：Local 远程连接只能使用已声明的 Staging Supabase。");
  }

  if (context === "deploy-preview" && appEnv && appEnv !== "preview") {
    issues.push("Netlify Deploy Preview 必须设置 NEXT_PUBLIC_APP_ENV=preview。");
  }
  const branch = (env.BRANCH || env.HEAD || "").trim();
  if (context === "production" && branch === "main" && appEnv !== "production") {
    issues.push("main 分支只能构建 production 环境。");
  }
  if (context === "production" && branch === "develop" && appEnv !== "staging") {
    issues.push("develop 分支只能构建 staging 环境。");
  }
  if (appEnv === "production" && branch && branch !== "main") {
    issues.push("Production 只能由 main 分支部署。");
  }
  if (appEnv === "staging" && branch && branch !== "develop") {
    issues.push("Staging 只能由 develop 分支部署。");
  }

  const environmentUrls = {
    NEXT_PUBLIC_SITE_URL: siteUrl,
    NEXT_PUBLIC_ADMIN_URL: env.NEXT_PUBLIC_ADMIN_URL,
    NEXT_PUBLIC_OPERATIONS_URL: env.NEXT_PUBLIC_OPERATIONS_URL,
    NEXT_PUBLIC_STOREFRONT_URL: env.NEXT_PUBLIC_STOREFRONT_URL,
    NEXT_PUBLIC_CATALOG_API_URL: env.NEXT_PUBLIC_CATALOG_API_URL,
  };
  for (const [name, value] of Object.entries(environmentUrls)) {
    if (!value) continue;
    if (!urlBelongsToEnvironment(value, appEnv)) issues.push(`安全错误：${name} 与 ${appEnv || "未知"} 环境不匹配。`);
  }

  if (strict && surface === "admin" && placeholder(env.NEXT_PUBLIC_STOREFRONT_URL)) {
    issues.push("Admin 必须配置同环境的 NEXT_PUBLIC_STOREFRONT_URL。");
  }
  if (strict && ["operations", "storefront"].includes(surface) && placeholder(env.NEXT_PUBLIC_ADMIN_URL)) {
    issues.push(`${surface} 必须配置同环境的 NEXT_PUBLIC_ADMIN_URL。`);
  }

  return [...new Set(issues)];
}

// Backward-compatible name used by existing tests and scripts.
export const validateDeploymentEnvironment = validateEnvironmentConfiguration;

function run() {
  const issues = validateEnvironmentConfiguration(process.env);
  if (issues.length) {
    console.error(`NEXORA 环境检查失败：\n- ${issues.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`NEXORA 环境检查通过：${process.env.NEXT_PUBLIC_APP_ENV}/${process.env.NEXT_PUBLIC_APP_SURFACE}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();

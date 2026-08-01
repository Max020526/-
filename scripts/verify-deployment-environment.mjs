import { pathToFileURL } from "node:url";

const HOSTED_CONTEXTS = new Set(["production", "deploy-preview", "branch-deploy"]);
const PREVIEW_CONTEXTS = new Set(["deploy-preview", "branch-deploy"]);

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

export function validateDeploymentEnvironment(env = process.env) {
  const issues = [];
  const context = (env.CONTEXT || env.NEXORA_DEPLOY_ENV || "local").trim().toLowerCase();
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "").trim();
  const siteUrl = (env.NEXT_PUBLIC_SITE_URL || "").trim();
  const projectRef = supabaseProjectRef(url);
  const productionRef = (env.PRODUCTION_SUPABASE_PROJECT_REF || "").trim().toLowerCase();

  if (/sb_secret_|service[_-]?role/i.test(key)) {
    issues.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 不能使用 secret/service_role 密钥。");
  }

  if (!HOSTED_CONTEXTS.has(context)) return issues;

  if (!projectRef || projectRef === "local" || /YOUR_PROJECT_REF/i.test(url)) {
    issues.push("托管构建必须配置有效的 Supabase Cloud URL。");
  }
  if (!key || /REPLACE_ME/i.test(key)) issues.push("托管构建必须配置有效的 Supabase publishable key。");
  if (!siteUrl || !siteUrl.startsWith("https://") || /YOUR_/i.test(siteUrl)) {
    issues.push("托管构建必须配置 HTTPS 的 NEXT_PUBLIC_SITE_URL。");
  }
  if (!productionRef || /YOUR_/i.test(productionRef)) {
    issues.push("托管构建必须配置 PRODUCTION_SUPABASE_PROJECT_REF 作为环境隔离门禁。");
  } else if (context === "production" && projectRef && projectRef !== productionRef) {
    issues.push("生产构建连接的 Supabase 项目与生产项目标识不一致。");
  } else if (PREVIEW_CONTEXTS.has(context) && projectRef === productionRef) {
    issues.push("预览构建禁止连接生产 Supabase 项目，请改用独立预览项目或分支。");
  }

  return issues;
}

function run() {
  const issues = validateDeploymentEnvironment(process.env);
  if (issues.length) {
    console.error(`NEXORA 环境检查失败：\n- ${issues.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }
  console.log("NEXORA 环境检查通过。");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
